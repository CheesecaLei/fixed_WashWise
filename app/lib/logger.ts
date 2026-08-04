import { getDb } from "../config/mongodb";

export type LogType = 
    | "order-received" 
    | "order-completed" 
    | "delivery-completed" 
    | "order-delayed" 
    | "user-updated" 
    | "user-deleted" 
    | "support-ticket-created" 
    | "support-ticket-updated" 
    | "payment-updated" 
    | "profile-updated" 
    | "service-created" 
    | "service-updated" 
    | "service-deleted"
    | "redeem"
    | "reward-redeemed"
    | "order-placed"
    | "user-signup"
    | "user-login"
    | "support-ticket-replied"
    | "price-adjusted"
    | "profile-request-submitted"
    | "profile-request-approved"
    | "profile-request-rejected";

export async function recordActivity(data: {
    type: LogType;
    orderCode?: string;
    customerName?: string;
    quantity?: number;
    performedBy: string;
    details?: string;
}) {
    try {
        const db = await getDb();
        const logsCollection = db.collection("logs");
        
        await logsCollection.insertOne({
            ...data,
            createdAt: new Date(),
        });
    } catch (error) {
        console.error("Failed to record activity:", error);
    }
}
