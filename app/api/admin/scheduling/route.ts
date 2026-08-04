import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../config/mongodb";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const db = await getDb();
        const checkoutsCollection = db.collection("checkouts");

        // Count total schedules
        const totalCount = await checkoutsCollection.countDocuments();

        const schedules = await checkoutsCollection.aggregate([
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "customer"
                }
            },
            { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "orders",
                    localField: "orderId",
                    foreignField: "_id",
                    as: "order"
                }
            },
            { $unwind: { path: "$order", preserveNullAndEmptyArrays: true } }
        ]).toArray();

        const formattedSchedules = schedules.map(item => {
            const orderId = item.order?._id?.toString() || item.orderId?.toString() || "";
            return {
                id: item._id.toString(),
                orderId: orderId,
                orderCode: orderId.slice(-6).toUpperCase(),
                customerName: item.customer?.username || "Guest",
                customerPhone: item.customer?.contactNo || "N/A",
                serviceMethod: item.serviceMethod,
                selectedSlot: item.selectedSlot || "N/A",
                status: item.order?.status || "pending",
                finalTotal: item.finalTotal,
                address: item.serviceMethod === "pickup" ? `${item.streetAddress}, ${item.barangay}, ${item.city}` : "Drop-off at Store",
                createdAt: item.createdAt,
                paymentMethod: item.paymentMethod || "COD",
                paymentStatus: item.paymentStatus || "unpaid",
                logisticsFee: item.logisticsFee || 0,
                promoDiscount: item.promoDiscount || 0,
                rewardDiscount: item.rewardDiscount || 0,
                loyaltyDiscount: item.loyaltyDiscount || 0,
                services: item.order?.services || []
            };
        });

        return NextResponse.json({ 
            success: true, 
            schedules: formattedSchedules,

            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error("Error fetching schedules:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { checkoutId, paymentStatus } = body;

        if (!checkoutId || !ObjectId.isValid(checkoutId) || !paymentStatus) {
            return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
        }

        const db = await getDb();
        const checkoutsCollection = db.collection("checkouts");

        const result = await checkoutsCollection.findOneAndUpdate(
			{ _id: new ObjectId(checkoutId) },
			{ $set: { paymentStatus, updatedAt: new Date() } },
			{ returnDocument: "after" }
		);

		if (!result) {
			return NextResponse.json({ success: false, error: "Checkout not found" }, { status: 404 });
		}

		// Log the activity
		const { recordActivity } = await import("../../../lib/logger");
		await recordActivity({
			type: "payment-updated",
			orderCode: result.orderId?.toString().slice(-6).toUpperCase() || checkoutId.slice(-6).toUpperCase(),
			performedBy: "Admin",
			details: `Payment status updated to ${paymentStatus}`,
		});

		// Notify customer
		try {
			const user = await db.collection("users").findOne(
				{ _id: result.userId },
				{ projection: { email: 1, username: 1, pushSubscriptions: 1 } }
			);

			const orderRef = `#${result.orderId?.toString().slice(-6).toUpperCase() || checkoutId.slice(-6).toUpperCase()}`;
			const statusLabel = paymentStatus === "paid" ? "Paid" : "Unpaid";

			if (user?.email) {
				const { sendEmail } = await import("../../../lib/email");
				await sendEmail({
					to: user.email,
					subject: `Payment Status Updated — WashWise`,
					html: `
						<div style="font-family: sans-serif; max-width: 480px; margin: auto;">
							<h2 style="color: #0284c7;">WashWise</h2>
							<p>Hello <strong>${user.username || "Valued Customer"}</strong>,</p>
							<p>Your order <strong>${orderRef}</strong> has been marked as 
							   <strong style="color: ${paymentStatus === "paid" ? "#16a34a" : "#dc2626"};">${statusLabel}</strong>.</p>
							<p>If you believe this is an error or have any questions, please contact our support team.</p>
							<p style="color:#888; font-size:12px;">— The WashWise Team</p>
						</div>
					`,
				});
			}

			if (user?.pushSubscriptions?.length > 0) {
				const { broadcastToSubscriptions } = await import("../../../lib/push");
				await broadcastToSubscriptions(user.pushSubscriptions, {
					title: "Payment Status Updated",
					body: `Order ${orderRef} has been marked as ${statusLabel}.`,
					url: "/member/my-orders",
				});
			}
		} catch (notifyErr) {
			console.error("Failed to send customer notification:", notifyErr);
		}

		return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating payment status:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
