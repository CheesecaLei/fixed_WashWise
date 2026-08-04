import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../config/mongodb";
import { recordActivity } from "../../../lib/logger";

function parseSlotEndTime(slotStr?: string, orderDate?: Date): Date | null {
	if (!slotStr) return null;
	
	// Example slot formats: "08:00 AM - 10:00 AM", "10:00 AM - 12:00 PM", "2:00 PM - 4:00 PM"
	const parts = slotStr.split("-");
	if (parts.length < 2) return null;

	const endStr = parts[1].trim(); // e.g. "10:00 AM" or "12:00 PM"
	const match = endStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
	if (!match) return null;

	let hours = parseInt(match[1], 10);
	const minutes = parseInt(match[2], 10);
	const period = match[3].toUpperCase();

	if (period === "PM" && hours < 12) hours += 12;
	if (period === "AM" && hours === 12) hours = 0;

	const baseDate = orderDate ? new Date(orderDate) : new Date();
	const slotEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes, 0);

	// Add 15-minute grace period as per checkout policy
	slotEnd.setMinutes(slotEnd.getMinutes() + 15);
	return slotEnd;
}

export async function GET(request: NextRequest) {
	return handleCheckNoShows(request);
}

export async function POST(request: NextRequest) {
	return handleCheckNoShows(request);
}

async function handleCheckNoShows(request: NextRequest) {
	try {
		const db = await getDb();
		const ordersCollection = db.collection("orders");
		const usersCollection = db.collection("users");

		const now = new Date();

		// Fetch active waiting orders that are not cancelled
		const pendingOrders = await ordersCollection
			.find({
				status: "waiting",
				isCancelled: { $ne: true },
			})
			.toArray();

		const cancelledOrders: string[] = [];

		for (const order of pendingOrders) {
			const checkout = await db.collection("checkouts").findOne({ orderId: order._id });
			const serviceMethod = order.serviceMethod || checkout?.serviceMethod || "";
			const slotStr = order.timeSlot || order.selectedSlot || checkout?.selectedSlot || order.preferredTime || "";
			const orderDate = order.pickupDate ? new Date(order.pickupDate) : order.createdAt ? new Date(order.createdAt) : now;

			const cutoffTime = parseSlotEndTime(slotStr, orderDate);

			// If current time exceeds the cutoff (slot end + 15 min grace period)
			if (cutoffTime && now > cutoffTime) {
				const orderId = order._id;
				const orderCode = order.orderCode || orderId.toString().slice(-6).toUpperCase();

				await ordersCollection.updateOne(
					{ _id: orderId },
					{
						$set: {
							status: "cancelled",
							isCancelled: true,
							cancellationReason: "Customer No-Show (Auto-cancelled after 2-hr window grace period)",
							cancelledAt: now,
							updatedAt: now,
						},
					}
				);

				const customer = await usersCollection.findOne({ _id: order.userId });

				await recordActivity({
					type: "order-completed",
					orderCode: orderCode,
					customerName: customer?.username || "Guest",
					performedBy: "System Auto-Check",
					details: `Order #${orderCode} auto-cancelled due to Customer No-Show after slot grace period`,
				});

				// Dispatch Brevo Email
				if (customer && customer.email) {
					try {
						const { sendNoShowCancellationEmail } = await import("../../../lib/email");
						await sendNoShowCancellationEmail({
							to: customer.email,
							customerName: customer.username || "Valued Customer",
							orderCode: orderCode,
							selectedSlot: slotStr,
							serviceMethod: serviceMethod,
						});
					} catch (emailError) {
						console.error("Failed to send auto-cancellation email:", emailError);
					}
				}

				// Trigger Pusher notification
				try {
					const { pusherServer } = await import("../../../lib/pusher");
					await pusherServer.trigger("order-updates", "order-status-updated", {
						orderId: orderId.toString(),
						status: "cancelled",
					});
				} catch (pusherErr) {
					console.error("Pusher trigger failed:", pusherErr);
				}

				cancelledOrders.push(orderCode);
			}
		}

		return NextResponse.json({
			success: true,
			message: `Checked ${pendingOrders.length} pending orders. Auto-cancelled ${cancelledOrders.length} no-show orders.`,
			processedCount: pendingOrders.length,
			cancelledCount: cancelledOrders.length,
			cancelledOrders,
		});
	} catch (error) {
		console.error("Error in check-no-show route:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
