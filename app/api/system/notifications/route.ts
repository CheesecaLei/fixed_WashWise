import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../config/mongodb";
import { broadcastToSubscriptions } from "../../../lib/push";
import { broadcastSms, sendSms } from "../../../lib/sms";

/**
 * System Notification Endpoint
 * This endpoint should be triggered by a cron job (e.g., every hour)
 * to remind admins of pick-ups and members of drop-offs.
 * Sends both Push Notifications and SMS.
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "washwise_internal_secret";

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const db = await getDb();
        
        const checkoutsRaw = await db.collection("checkouts").aggregate([
            { $lookup: { from: "orders", localField: "orderId", foreignField: "_id", as: "order" } },
            { $unwind: "$order" },
            { $match: { "order.status": "waiting" } },
            { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "member" } },
            { $unwind: "$member" }
        ]).toArray();

        const admins = await db.collection("users").find({ role: "admin" }).toArray();
        const allAdminSubscriptions = admins.flatMap(a => a.pushSubscriptions || []);

        let notificationsSent = 0;

        for (const checkout of checkoutsRaw) {
            const orderCode = checkout.orderId.toString().slice(-6).toUpperCase();
            
            // System -> Admin: Pickup Reminder (Push + SMS)
            if (checkout.serviceMethod === "pickup") {
                if (allAdminSubscriptions.length > 0) {
                    await broadcastToSubscriptions(allAdminSubscriptions, {
                        title: "System: Pickup Reminder! 🚚",
                        body: `Admin Reminder: Pickup scheduled for #${orderCode} at ${checkout.selectedSlot}.`,
                        url: "/admin/scheduling"
                    });
                    notificationsSent++;
                }
                // SMS all admins
                await broadcastSms(
                    admins,
                    `[WashWise] Reminder: Pickup for Order #${orderCode} is scheduled at ${checkout.selectedSlot}. Please prepare.`
                );
            } 
            // System -> Member: Drop-off Reminder (Push + SMS)
            else if (checkout.serviceMethod === "dropoff") {
                if (checkout.member.pushSubscriptions && checkout.member.pushSubscriptions.length > 0) {
                    await broadcastToSubscriptions(checkout.member.pushSubscriptions, {
                        title: "System: Drop-off Reminder! 🧺",
                        body: `Reminder: Your drop-off slot for #${orderCode} is scheduled at ${checkout.selectedSlot}.`,
                        url: "/member/dashboard"
                    });
                    notificationsSent++;
                }
                // SMS the specific member
                if (checkout.member.contactNo) {
                    await sendSms(
                        checkout.member.contactNo,
                        `[WashWise] Reminder: Your laundry drop-off (#${orderCode}) is scheduled at ${checkout.selectedSlot}. Please bring your items on time.`
                    );
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            message: `Processed ${checkoutsRaw.length} slots. Push notifications sent: ${notificationsSent}.` 
        });
    } catch (error) {
        console.error("System notification error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
