import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../config/mongodb";
import { recordActivity } from "../../../lib/logger";
import { pusherServer } from "../../../lib/pusher";
import { broadcastToSubscriptions } from "../../../lib/push";
import { sendSms } from "../../../lib/sms";
import { sendEmail } from "../../../lib/email";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const db = await getDb();
        
        // Count total orders (non-draft)
        const totalCount = await db.collection("orders").countDocuments({ status: { $ne: "draft" } });
        
        // Fetch orders joined with checkouts and users with pagination
        const ordersRaw = await db.collection("orders").aggregate([
            { $match: { status: { $ne: "draft" } } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limit },
            {
                $lookup: {
                    from: "checkouts",
                    localField: "_id",
                    foreignField: "orderId",
                    as: "checkoutDetails"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
            { $unwind: { path: "$checkoutDetails", preserveNullAndEmptyArrays: true } }
        ]).toArray();

        const orders = ordersRaw.map(order => ({
            id: order._id.toString(),
            orderCode: order._id.toString().slice(-6).toUpperCase(),
            customerName: order.userDetails?.username || "Guest",
            customerPhone: order.userDetails?.contactNo || "N/A",
            items: order.services?.length || 0,
            amount: `\u20B1${(order.subtotal || 0).toLocaleString()}`,
            status: order.status, // Current DB status
            serviceMethod: order.checkoutDetails?.serviceMethod || "dropoff",
            orderTime: new Date(order.createdAt).toLocaleString(),
            estimatedCompletion: order.updatedAt ? new Date(order.updatedAt).toLocaleString() : "N/A",
            rewardId: order.checkoutDetails?.rewardId || null,
            rewardDiscount: order.checkoutDetails?.rewardDiscount || 0,
            paymentStatus: order.checkoutDetails?.paymentStatus || "Pending",
            paymentMethod: order.checkoutDetails?.paymentMethod || "COD"
        }));

        // Progress Stats
        const [activeCount, completedCount, inProgressCount, waitingCount] = await Promise.all([
            db.collection("orders").countDocuments({ status: { $in: ["waiting", "in-progress", "ready", "out-for-delivery"] } }),
            db.collection("orders").countDocuments({ status: "closed" }),
            db.collection("orders").countDocuments({ status: "in-progress" }),
            db.collection("orders").countDocuments({ status: { $in: ["waiting", "confirmed"] } })
        ]);

        const stats = [
            { id: "active", label: "Active Orders", value: activeCount, color: "primary", icon: "active" },
            { id: "completed", label: "Completed", value: completedCount, color: "success", icon: "completed" },
            { id: "processing", label: "In Progress", value: inProgressCount, color: "warning", icon: "processing" },
            { id: "pending", label: "Waiting", value: waitingCount, color: "info", icon: "pending" },
        ];

        return NextResponse.json({ 
            orders, 
            stats,
            pagination: {
                total: totalCount,
                page,
                limit,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error("Order Progress API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

const VALID_TRANSITIONS: Record<string, string[]> = {
    "waiting":              ["picked-up", "received-by-staff", "in-progress", "ready", "closed", "cancelled"],
    "picked-up":            ["received-by-staff", "in-progress", "ready", "closed", "cancelled"],
    "received-by-staff":    ["in-progress", "ready", "closed", "cancelled"],
    "in-progress":          ["ready", "closed", "cancelled"],
    "ready":                ["out-for-delivery", "received-by-client", "closed", "cancelled"],
    "out-for-delivery":     ["received-by-client", "closed", "cancelled"],
    "received-by-client":   ["closed"],
    "closed":               [],
    "cancelled":            [],
};

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { orderId, status, action, verifiedWeight, proofImage } = body;
        
        if (!orderId || !ObjectId.isValid(orderId)) {
            return NextResponse.json({ error: "Valid Order ID is required" }, { status: 400 });
        }

        const db = await getDb();
        let order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
        let checkout = await db.collection("checkouts").findOne({ orderId: new ObjectId(orderId) });

        if (!order) {
            // Fallback: Check if the provided orderId is actually a checkout ID
            checkout = await db.collection("checkouts").findOne({ _id: new ObjectId(orderId) });
            if (checkout && checkout.orderId) {
                order = await db.collection("orders").findOne({ _id: new ObjectId(checkout.orderId) });
            }
        }

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const targetOrderId = order._id.toString();
        const now = new Date();

        // Action: Mark Order as Customer No-Show & Cancel
        if (action === "mark-no-show" || status === "cancelled") {
            const customer = await db.collection("users").findOne({ _id: order?.userId });
            const orderCode = order.orderCode || targetOrderId.slice(-6).toUpperCase();
            const serviceMethod = order.serviceMethod || checkout?.serviceMethod || "";
            const slotInfo = order.timeSlot || order.selectedSlot || checkout?.selectedSlot || order.preferredTime || "";

            await db.collection("orders").updateOne(
                { _id: order._id },
                {
                    $set: {
                        status: "cancelled",
                        isCancelled: true,
                        cancellationReason: "Customer No-Show",
                        cancelledAt: now,
                        updatedAt: now
                    }
                }
            );

            await recordActivity({
                type: "order-completed",
                orderCode: orderCode,
                customerName: customer?.username || "Guest",
                performedBy: "Admin",
                details: `Order #${orderCode} cancelled due to Customer No-Show`
            });

            // Dispatch No-Show Cancellation Email
            if (customer && customer.email) {
                try {
                    const { sendNoShowCancellationEmail } = await import("../../../lib/email");
                    await sendNoShowCancellationEmail({
                        to: customer.email,
                        customerName: customer.username || "Valued Customer",
                        orderCode: orderCode,
                        selectedSlot: slotInfo,
                        serviceMethod: serviceMethod,
                    });
                } catch (emailError) {
                    console.error("Failed to send no-show cancellation email:", emailError);
                }
            }

            // Trigger Pusher notification
            try {
                const { pusherServer } = await import("../../../lib/pusher");
                await pusherServer.trigger("order-updates", "order-status-updated", {
                    orderId,
                    status: "cancelled",
                });
            } catch (pusherError) {
                console.error("Pusher trigger failed:", pusherError);
            }

            return NextResponse.json({
                success: true,
                message: `Order #${orderCode} marked as No-Show and cancelled. Customer notified via email.`,
                status: "cancelled"
            });
        }

        // Action: Weight Verification by Admin
        if (action === "verify-weight" && verifiedWeight !== undefined) {
            const weightNum = parseFloat(verifiedWeight);
            if (isNaN(weightNum) || weightNum <= 0) {
                return NextResponse.json({ error: "Invalid weight value" }, { status: 400 });
            }

            // Recalculate services with updated verified weight for kg services
            let newSubtotal = 0;
            const updatedServices = (order.services || []).map((s: any) => {
                if (s.unitLabel && s.unitLabel.includes("kg")) {
                    const price = s.lineTotal && s.quantity ? s.lineTotal / s.quantity : 35; // base fallback
                    const newTotal = weightNum * price;
                    newSubtotal += newTotal;
                    return { ...s, quantity: weightNum, lineTotal: newTotal };
                }
                newSubtotal += (s.lineTotal || 0);
                return s;
            });

            const updateSet: any = {
                totalWeight: weightNum,
                weightVerified: true,
                services: updatedServices,
                subtotal: newSubtotal,
                updatedAt: now
            };

            await db.collection("orders").updateOne(
                { _id: new ObjectId(orderId) },
                { $set: updateSet }
            );

            const customer = await db.collection("users").findOne({ _id: order?.userId });
            const orderCode = order.orderCode || orderId.toString().slice(-6).toUpperCase();

            await recordActivity({
                type: "service-updated",
                orderCode: orderCode,
                customerName: customer?.username || "Guest",
                quantity: weightNum,
                performedBy: "Admin",
                details: `Verified order weight to ${weightNum} kg (Updated total: ₱${newSubtotal})`
            });

            // Dispatch Weight Verification Email directly to Customer with Proof Photo attached
            if (customer && customer.email) {
                try {
                    const { sendWeightVerificationEmail } = await import("../../../lib/email");
                    await sendWeightVerificationEmail({
                        to: customer.email,
                        customerName: customer.username || "Valued Customer",
                        orderCode: orderCode,
                        verifiedWeight: weightNum,
                        subtotal: newSubtotal,
                        proofBase64: proofImage,
                    });
                } catch (emailError) {
                    console.error("Failed to send weight verification email:", emailError);
                }
            }

            // Trigger lightweight Pusher update (without heavy image data to avoid Pusher 10KB limit)
            try {
                const { pusherServer } = await import("../../../lib/pusher");
                await pusherServer.trigger("order-updates", "order-weight-updated", {
                    orderId,
                    totalWeight: weightNum,
                    subtotal: newSubtotal,
                });
            } catch (pusherError) {
                console.error("Pusher trigger failed:", pusherError);
            }

            return NextResponse.json({ 
                success: true, 
                message: "Weight verified and order updated successfully",
                totalWeight: weightNum,
                subtotal: newSubtotal
            });
        }

        const currentStatus = order.status || "waiting";
        const allowedNext = VALID_TRANSITIONS[currentStatus] || [];
        if (!allowedNext.includes(status)) {
            return NextResponse.json(
                { error: `Invalid transition: ${currentStatus} → ${status}` },
                { status: 422 }
            );
        }

        const milestoneUpdate: Record<string, Date> = {};
        if (status === "picked-up")           milestoneUpdate.pickedUpAt = now;
        if (status === "received-by-staff")   milestoneUpdate.receivedByStaffAt = now;
        if (status === "received-by-client")  milestoneUpdate.receivedByClientAt = now;

        const result = await db.collection("orders").updateOne(
            { _id: new ObjectId(orderId) },
            { $set: { status: status, ...milestoneUpdate, updatedAt: now } }
        );

        const customer = await db.collection("users").findOne({ _id: order?.userId });
        
        await recordActivity({
            type: status === "closed" ? "order-completed" : "order-received",
            orderCode: orderId.toString().slice(-6).toUpperCase(),
            customerName: customer?.username || "Guest",
            quantity: order?.services?.length || 0,
            performedBy: "Admin", // For now, could be dynamic from session
            details: `Status changed to ${status}`
        });

        // Trigger Pusher update
        try {
            const checkout = await db.collection("checkouts").findOne({ orderId: new ObjectId(orderId) });
            await pusherServer.trigger("order-updates", "order-status-updated", {
                orderId,
                status,
                serviceMethod: checkout?.serviceMethod || "dropoff"
            });
        } catch (pusherError) {
            console.error("Pusher trigger failed:", pusherError);
        }

        // Trigger Push Notification for the Member
        try {
            console.log(`[Push] Checking member subscriptions for userId: ${order?.userId}`);
            const memberSubs = customer?.pushSubscriptions || [];
            console.log(`[Push] Member has ${memberSubs.length} push subscription(s).`);
            if (memberSubs.length > 0) {
                await broadcastToSubscriptions(memberSubs, {
                    title: "Order Status Update! 🧺",
                    body: `Your order #${orderId.toString().slice(-6).toUpperCase()} is now: ${status}`,
                    url: "/member/dashboard"
                });
                console.log(`[Push] Member push broadcast sent.`);
            } else {
                console.warn(`[Push] Member has no push subscriptions. They must enable notifications on their device.`);
            }
        } catch (pushError) {
            console.error("Member push notification failed:", pushError);
        }

        // SMS the specific Member
        try {
            const orderCode = orderId.toString().slice(-6).toUpperCase();
            if (customer?.contactNo) {
                await sendSms(
                    customer.contactNo,
                    `[WashWise] Your order #${orderCode} status has been updated to: ${status}. Open the app to view details.`
                );
            } else {
                console.warn(`[SMS] Member has no contactNo stored, skipping SMS.`);
            }
        } catch (smsError) {
            console.error("Member SMS failed:", smsError);
        }

        // Email the specific Member on status updates
        try {
            const orderCode = orderId.toString().slice(-6).toUpperCase();
            if (customer?.email) {
                const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
                await sendEmail({
                    to: customer.email,
                    subject: `[WashWise] Order #${orderCode} Status Updated to ${status}`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                            <h2 style="color: #0284c7;">WashWise Order Status Update</h2>
                            <p>Hi <strong>${customer.username}</strong>,</p>
                            <p>Great news! Your laundry order <strong>#${orderCode}</strong> has moved to a new milestone:</p>
                            <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0;">
                                <p style="margin: 0; font-size: 16px;">Current Status: <strong style="text-transform: uppercase; color: #0284c7;">${status}</strong></p>
                            </div>
                            <p>You can track the live status of your order anytime on the <a href="${appUrl}/member/dashboard" style="color: #0284c7; text-decoration: none; font-weight: bold;">WashWise Dashboard</a>.</p>
                            <hr style="border: 0; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
                            <p style="font-size: 12px; color: #666;">This is an automated notification from WashWise. Please do not reply directly to this email.</p>
                        </div>
                    `
                });
            }
        } catch (emailError) {
            console.error("Member status update email failed:", emailError);
        }

		// Award loyalty points if order is closed
		if (status === "closed") {
			const { awardPointsForOrder } = await import("../../../lib/rewards-util");
			await awardPointsForOrder(order.userId.toString(), orderId);
		}

        return NextResponse.json({ message: "Status updated successfully" });
    } catch (error) {
        console.error("Update Status Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
