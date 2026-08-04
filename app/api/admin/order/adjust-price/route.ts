import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../../config/mongodb";
import { recordActivity } from "../../../../lib/logger";
import { sendEmail } from "../../../../lib/email";
import { broadcastToSubscriptions } from "../../../../lib/push";

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { orderId, checkoutId, newTotal, reason } = body;

        if ((!orderId && !checkoutId) || typeof newTotal !== "number" || isNaN(newTotal)) {
            return NextResponse.json({ success: false, error: "Invalid parameters" }, { status: 400 });
        }

        const db = await getDb();
        const checkoutsCollection = db.collection("checkouts");
        const ordersCollection = db.collection("orders");

        const query = checkoutId && ObjectId.isValid(checkoutId)
            ? { _id: new ObjectId(checkoutId) }
            : { orderId: new ObjectId(orderId) };

        const checkout = await checkoutsCollection.findOne(query);
        if (!checkout) {
            return NextResponse.json({ success: false, error: "Checkout not found" }, { status: 404 });
        }

        const oldTotal = checkout.finalTotal || 0;
        await checkoutsCollection.updateOne(
            { _id: checkout._id },
            { $set: { finalTotal: newTotal, updatedAt: new Date() } }
        );

        if (checkout.orderId) {
            await ordersCollection.updateOne(
                { _id: checkout.orderId },
                { $set: { totalAmount: newTotal, updatedAt: new Date() } }
            );
        }

        const orderRef = `#${checkout.orderId?.toString().slice(-6).toUpperCase() || checkout._id.toString().slice(-6).toUpperCase()}`;

        await recordActivity({
            type: "price-adjusted",
            orderCode: orderRef.replace("#", ""),
            performedBy: "Admin",
            details: `Price adjusted from ₱${oldTotal.toFixed(2)} to ₱${newTotal.toFixed(2)}${reason ? ` (${reason})` : ""}`,
        });

        // Notify customer
        try {
            const user = await db.collection("users").findOne(
                { _id: checkout.userId },
                { projection: { email: 1, username: 1, pushSubscriptions: 1 } }
            );

            if (user?.email) {
                await sendEmail({
                    to: user.email,
                    subject: `Price Adjustment Notice — WashWise`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 480px; margin: auto;">
                            <h2 style="color: #0284c7;">WashWise</h2>
                            <p>Hello <strong>${user.username || "Valued Customer"}</strong>,</p>
                            <p>The total price for your order <strong>${orderRef}</strong> has been adjusted from <strong>₱${oldTotal.toFixed(2)}</strong> to <strong style="color: #0284c7;">₱${newTotal.toFixed(2)}</strong>.</p>
                            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
                            <p>If you have any questions regarding this adjustment, please feel free to reach out to our support team.</p>
                            <p style="color:#888; font-size:12px;">— The WashWise Team</p>
                        </div>
                    `,
                });
            }

            if (user?.pushSubscriptions?.length > 0) {
                await broadcastToSubscriptions(user.pushSubscriptions, {
                    title: "Order Price Adjusted",
                    body: `Order ${orderRef} price adjusted to ₱${newTotal.toFixed(2)}.`,
                    url: "/member/my-orders",
                });
            }
        } catch (notifyErr) {
            console.error("Failed to send customer notification:", notifyErr);
        }

        return NextResponse.json({ success: true, oldTotal, newTotal });
    } catch (error) {
        console.error("Error adjusting price:", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
}
