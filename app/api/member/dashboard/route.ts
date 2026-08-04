import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../config/mongodb";

export async function GET(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId || !ObjectId.isValid(userId)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}

		const db = await getDb();
		const checkoutsCollection = db.collection("checkouts");
		const ordersCollection = db.collection("orders");

		// Fetch metrics
		const totalOrders = await checkoutsCollection.countDocuments({ userId: new ObjectId(userId) });
		
		const inProgress = await ordersCollection.countDocuments({ 
			userId: new ObjectId(userId), 
			status: { $in: ["waiting", "in-progress"] } 
		});

		const readyCount = await ordersCollection.countDocuments({ 
			userId: new ObjectId(userId), 
			status: "ready" 
		});

		const inTransit = await ordersCollection.countDocuments({ 
			userId: new ObjectId(userId), 
			status: "out-for-delivery" 
		});

		const completed = await ordersCollection.countDocuments({ 
			userId: new ObjectId(userId), 
			status: "closed" 
		});

		// Fetch recent activities (last 5 transactions)
		const recentTransactions = await checkoutsCollection.aggregate([
			{ $match: { userId: new ObjectId(userId) } },
			{
				$lookup: {
					from: "orders",
					localField: "orderId",
					foreignField: "_id",
					as: "order"
				}
			},
			{ $unwind: "$order" },
			{ $sort: { createdAt: -1 } },
			{ $limit: 5 }
		]).toArray();

		const pulseMetrics = [
			{ id: 1, label: "Total Orders", value: totalOrders.toString(), icon: "receipt", accent: "primary" },
			{ id: 2, label: "In-Progress", value: inProgress.toString(), icon: "washing", accent: "warning" },
			{ id: 3, label: "Ready", value: readyCount.toString(), icon: "ready", accent: "success" },
			{ id: 4, label: "In-Transit", value: inTransit.toString(), icon: "to-deliver", accent: "info" },
			{ id: 5, label: "Completed", value: completed.toString(), icon: "completed", accent: "neutral" },
		];

		const activities = recentTransactions.map(t => {
			let displayStatus: any = "Processing";
			if (t.order.status === "ready") {
				displayStatus = t.serviceMethod === "pickup" ? "Ready for Delivery" : "Ready for Pickup";
			}
			else if (t.order.status === "out-for-delivery") displayStatus = "In Transit";
			else if (t.order.status === "closed") displayStatus = "Completed";

			return {
				id: t._id.toString(),
				service: t.order.services.map((s: any) => s.label).join(", "),
				orderNumber: t.orderId.toString().slice(-6).toUpperCase(),
				date: new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
				amount: new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(t.finalTotal),
				status: displayStatus
			};
		});

		return NextResponse.json({
			success: true,
			pulseMetrics,
			activities
		});
	} catch (error) {
		console.error("Error fetching member dashboard data:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
