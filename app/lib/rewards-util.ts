import { ObjectId } from "mongodb";
import { getDb } from "../config/mongodb";
import { pusherServer } from "./pusher";

/**
 * Utility to calculate total points for a user
 */
export async function calculateUserPoints(userId: string) {
    const db = await getDb();
    const ledger = await db.collection("rewards_ledger")
        .find({ userId: new ObjectId(userId) })
        .toArray();

    return ledger.reduce((acc, entry) => {
        return entry.type === "earn" ? acc + entry.points : acc - entry.points;
    }, 0);
}

/**
 * Logic to award points to a user based on a completed order
 */
export async function awardPointsForOrder(userId: string, orderId: string) {
    try {
        const db = await getDb();
        const ledgerCollection = db.collection("rewards_ledger");
        
        // Idempotency check
        const existing = await ledgerCollection.findOne({
            userId: new ObjectId(userId),
            orderId: new ObjectId(orderId),
            type: "earn"
        });

        if (existing) {
            console.log(`[Rewards] Points already awarded for order ${orderId}`);
            return { success: true, points: 0 };
        }

        const order = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
        const checkout = await db.collection("checkouts").findOne({ orderId: new ObjectId(orderId) });

        if (!order || order.status !== "closed" || !checkout) {
            console.warn(`[Rewards] Order ${orderId} not eligible for points. Status: ${order?.status}`);
            return { success: false, error: "Ineligible" };
        }

        const points = Math.floor(checkout.finalTotal / 50);

        if (points > 0) {
            await ledgerCollection.insertOne({
                userId: new ObjectId(userId),
                type: "earn",
                points,
                description: `Earned from Order #${orderId.slice(-6).toUpperCase()}`,
                orderId: new ObjectId(orderId),
                createdAt: new Date(),
            });

            // Real-time update
            try {
                const totalPoints = await calculateUserPoints(userId);
                await pusherServer.trigger(`user-${userId}`, "points-updated", {
                    points,
                    totalPoints
                });
            } catch (pusherError) {
                console.error("[Rewards] Pusher notification failed:", pusherError);
            }

            console.log(`[Rewards] Awarded ${points} points to user ${userId} for order ${orderId}`);
            return { success: true, points };
        }

        return { success: true, points: 0 };
    } catch (error) {
        console.error("[Rewards] Award Points Error:", error);
        return { success: false, error: "Internal error" };
    }
}
