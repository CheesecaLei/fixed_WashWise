import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../config/mongodb";

export async function GET(request: NextRequest) {
    try {
        const db = await getDb();
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get("timeframe") || "all";
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        
        let orderDateFilter: any = { status: { $ne: "draft" } };
        let checkoutDateFilter: any = {};
        const now = new Date();
        
        if (from && to) {
            const fromDate = new Date(from);
            fromDate.setHours(0, 0, 0, 0);
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            
            const rangeFilter = { $gte: fromDate, $lte: toDate };
            const isoRangeFilter = { $gte: fromDate.toISOString(), $lte: toDate.toISOString() };
            orderDateFilter.$or = [{ createdAt: rangeFilter }, { createdAt: isoRangeFilter }];
            checkoutDateFilter.$or = [{ createdAt: rangeFilter }, { createdAt: isoRangeFilter }];
        } else if (timeframe === "week") {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            orderDateFilter.$or = [{ createdAt: { $gte: weekAgo.toISOString() } }, { createdAt: { $gte: weekAgo } }];
            checkoutDateFilter.$or = [{ createdAt: { $gte: weekAgo.toISOString() } }, { createdAt: { $gte: weekAgo } }];
        } else if (timeframe === "month") {
            const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
            orderDateFilter.$or = [{ createdAt: { $gte: monthAgo.toISOString() } }, { createdAt: { $gte: monthAgo } }];
            checkoutDateFilter.$or = [{ createdAt: { $gte: monthAgo.toISOString() } }, { createdAt: { $gte: monthAgo } }];
        } else if (timeframe === "annual") {
            const yearAgo = new Date(now.getFullYear(), 0, 1);
            orderDateFilter.$or = [{ createdAt: { $gte: yearAgo.toISOString() } }, { createdAt: { $gte: yearAgo } }];
            checkoutDateFilter.$or = [{ createdAt: { $gte: yearAgo.toISOString() } }, { createdAt: { $gte: yearAgo } }];
        }

        // 1. Fetch data
        const usersCount = await db.collection("users").countDocuments({ role: { $ne: "admin" } });
        const orders = await db.collection("orders").find(orderDateFilter).toArray();
        const checkouts = await db.collection("checkouts").find(checkoutDateFilter).toArray();
        
        // 2. Metrics (Total Income for covered dates)
        const totalIncome = checkouts.reduce((acc, c) => acc + (c.finalTotal || 0), 0);
        const totalOrders = orders.length;
        
        const incomeLabel = timeframe === "today" || (from && from === to) ? "Daily Income" : "Total Income";

        const metrics = [
            { id: "income", label: incomeLabel, value: `\u20B1${totalIncome.toLocaleString()}`, change: "+12.5%", changeType: "positive", icon: "revenue" },
            { id: "orders", label: "Total Orders", value: totalOrders.toString(), change: "+8.2%", changeType: "positive", icon: "orders" },
            { id: "customers", label: "Active Customers", value: usersCount.toString(), change: "+5.1%", changeType: "positive", icon: "customers" },
            { id: "views", label: "Page Views", value: "1,284", change: "-2.4%", changeType: "negative", icon: "views" },
        ];

        // 3. Service Performance Report
        // Group orders by service using the clarified structure
        const serviceMap: Record<string, { orders: number; revenue: number }> = {};
        
        orders.forEach(order => {
            const orderServices = order.services || [];
            orderServices.forEach((s: any) => {
                const name = s.label || s.name || "Unknown Service";
                const lineTotal = Number(s.lineTotal) || 0;
                
                if (!serviceMap[name]) {
                    serviceMap[name] = { orders: 0, revenue: 0 };
                }
                serviceMap[name].orders += 1;
                serviceMap[name].revenue += lineTotal;
            });
        });

        const serviceReports = Object.entries(serviceMap).map(([name, data], index) => {
            return {
                id: (index + 1).toString(),
                name,
                orders: data.orders,
                revenue: `\u20B1${data.revenue.toLocaleString()}`, // displayed as Income in UI header
                average: `\u20B1${(data.orders > 0 ? data.revenue / data.orders : 0).toFixed(2)}`,
                growth: "+4.5%"
            };
        });

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const ordersToday = await db.collection("orders").find({
            status: { $ne: "draft" },
            createdAt: { $gte: startOfDay }
        }).toArray();
        const weightToday = ordersToday.reduce((acc, o) => acc + (Number(o.totalWeight) || 0), 0);

        return NextResponse.json({
            metrics,
            serviceReports,
            weightToday,
            checkouts: checkouts.map(c => ({
                finalTotal: c.finalTotal || 0,
                paymentStatus: c.paymentStatus || "unpaid",
                createdAt: c.createdAt || new Date().toISOString()
            }))
        });
    } catch (error) {
        console.error("Report API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
