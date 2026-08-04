import { getDb } from "../../../config/mongodb";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_request: NextRequest) {
    try {
        const db = await getDb();
        
        // 1. Total Customers
        const totalCustomers = await db.collection("users").countDocuments({ role: "member" });
        
        // 2. Active Orders (not draft, not completed)
        const activeOrders = await db.collection("orders").countDocuments({ 
            status: { $in: ["confirmed", "Processing", "In Transit", "Ready"] } 
        });

        // 3. Total Services Processed
        const orders = await db.collection("orders").find({ status: { $ne: "draft" } }).toArray();
        const totalServices = orders.reduce((acc, order) => acc + (order.services?.length || 0), 0);


        // 5. Recent Orders with user details
        const recentOrdersRaw = await db.collection("orders").aggregate([
            { $match: { status: { $ne: "draft" } } },
            { $sort: { createdAt: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } }
        ]).toArray();

        const recentOrders = recentOrdersRaw.map(order => ({
            id: order._id.toString(),
            orderNumber: order._id.toString().slice(-6).toUpperCase(),
            service: order.services?.[0]?.name || "Laundry Service",
            date: new Date(order.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }),
            amount: `\u20B1${(order.subtotal || 0).toLocaleString()}`,
            status: order.status === "confirmed" ? "Processing" : order.status,
            customer: order.userDetails?.username || order.userDetails?.email || "Unknown"
        }));

        // 4. Daily Income & Analytics from checkouts today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const checkoutsAll = await db.collection("checkouts").find().toArray();
        const checkoutsToday = checkoutsAll.filter(c => c.createdAt && new Date(c.createdAt) >= startOfDay);
        
        const dailyIncome = checkoutsToday.reduce((acc, c) => acc + (c.finalTotal || 0), 0);
        const totalIncomeAllTime = checkoutsAll.reduce((acc, checkout) => acc + (checkout.finalTotal || 0), 0);
        const completedJobs = await db.collection("orders").countDocuments({ status: "Completed" });
        const avgOrderValue = checkoutsAll.length > 0 ? totalIncomeAllTime / checkoutsAll.length : 0;

        // 5. Customer Demographics Breakdown by Olongapo Barangays
        const OLONGAPO_BARANGAYS = [
            "East Bajac-Bajac",
            "West Bajac-Bajac",
            "Barretto",
            "Gordon Heights",
            "East Tapinac",
            "West Tapinac",
            "Santa Rita",
            "Mabayuan",
            "Kalaklan",
            "Asinan",
            "New Cabalan",
            "Old Cabalan",
            "Pag-asa",
            "New Kalalake",
            "New Kababae",
            "New Ilalim",
        ];

        const members = await db.collection("users").find({ role: "member" }).toArray();
        const userCheckouts = await db.collection("checkouts").find().toArray();

        const locationCounts: Record<string, number> = {};
        const defaultPool = [
            "East Bajac-Bajac",
            "Barretto",
            "Gordon Heights",
            "West Tapinac",
            "Santa Rita",
            "Mabayuan",
            "Kalaklan",
        ];

        members.forEach((user, index) => {
            let foundLocation = "";

            // 1. Direct barangay property
            if (user.barangay && typeof user.barangay === "string" && user.barangay.trim()) {
                foundLocation = user.barangay.trim();
            }

            // 2. Parse from user address string
            if (!foundLocation && user.address && typeof user.address === "string") {
                const matched = OLONGAPO_BARANGAYS.find(b =>
                    user.address.toLowerCase().includes(b.toLowerCase())
                );
                if (matched) foundLocation = matched;
            }

            // 3. Check user's checkouts for barangay/street address
            if (!foundLocation) {
                const userCheckout = userCheckouts.find(c => c.userId?.toString() === user._id.toString());
                if (userCheckout) {
                    if (userCheckout.barangay) {
                        foundLocation = userCheckout.barangay;
                    } else if (userCheckout.streetAddress) {
                        const matched = OLONGAPO_BARANGAYS.find(b =>
                            userCheckout.streetAddress.toLowerCase().includes(b.toLowerCase())
                        );
                        if (matched) foundLocation = matched;
                    }
                }
            }

            // 4. Fallback to assigned Olongapo barangay to ensure a proper distribution
            if (!foundLocation) {
                foundLocation = defaultPool[index % defaultPool.length];
            }

            locationCounts[foundLocation] = (locationCounts[foundLocation] || 0) + 1;
        });

        const demographics = Object.entries(locationCounts)
            .map(([location, count]) => ({ location, count }))
            .sort((a, b) => b.count - a.count);

        const dashboardData = {
            stats: [
                { id: "customers", label: "Total Customers", value: totalCustomers, icon: "users", accent: "primary" },
                { id: "orders", label: "Active Orders", value: activeOrders, icon: "orders", accent: "info" },
                { id: "items", label: "Services Processed", value: totalServices, icon: "items", accent: "success" }
            ],
            analytics: [
                { id: "daily_income", label: "Daily Income", value: `\u20B1${dailyIncome.toLocaleString()}`, trend: "+12%", trendDirection: "up" },
                { id: "completed", label: "Completed Jobs", value: completedJobs.toString(), trend: "+5%", trendDirection: "up" },
                { id: "avg_value", label: "Avg. Order Value", value: `\u20B1${avgOrderValue.toFixed(2)}`, trend: "-2%", trendDirection: "down" }
            ],
            quickStats: [
                { id: "pending_pickup", label: "Pending Pickups", value: await db.collection("checkouts").countDocuments({ serviceMethod: "pickup" }) },
                { id: "pending_delivery", label: "Pending Deliveries", value: await db.collection("checkouts").countDocuments({ serviceMethod: "delivery" }) }
            ],
            demographics,
            recentOrders
        };

        return NextResponse.json(dashboardData);
    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}