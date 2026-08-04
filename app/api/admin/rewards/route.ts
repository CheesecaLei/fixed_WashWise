import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../../../config/mongodb";
import { rewardsMilestonesData } from "../../../data/rewards";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const skip = (page - 1) * limit;

        const db = await getDb();
        
        // 1. Get total points awarded across all users
        const ledger = await db.collection("rewards_ledger").find({}).toArray();
        const totalPointsAwarded = ledger
            .filter(entry => entry.type === "earn")
            .reduce((acc, entry) => acc + entry.points, 0);
        
        const totalPointsRedeemed = ledger
            .filter(entry => entry.type === "redeem")
            .reduce((acc, entry) => acc + entry.points, 0);

        // 2. Count users and tiers
        const allUsers = await db.collection("users").find({ role: "member" }).toArray();
        const orders = await db.collection("orders").find({ status: "closed" }).toArray();

        const tierCounts: Record<string, number> = {
            starter: 0,
            regular: 0,
            loyal: 0,
            vip: 0
        };

        const processedUserTiers = allUsers.map(user => {
            const userLedger = ledger.filter(l => l.userId.toString() === user._id.toString());
            const userTotalPoints = userLedger.reduce((acc, l) => l.type === "earn" ? acc + l.points : acc - l.points, 0);
            const userCompletedOrders = orders.filter(o => o.userId.toString() === user._id.toString()).length;

            let currentTier = "starter";
            for (const milestone of rewardsMilestonesData) {
                if (userCompletedOrders >= milestone.ordersRequired) {
                    currentTier = milestone.id;
                } else {
                    break;
                }
            }
            tierCounts[currentTier]++;
            return {
                userId: user._id.toString(),
                username: user.username,
                tier: currentTier,
                totalPoints: userTotalPoints,
                completedOrders: userCompletedOrders
            };
        });

        // Sort by points descending
        processedUserTiers.sort((a, b) => b.totalPoints - a.totalPoints);

        // Paginate userTiers
        const paginatedUserTiers = processedUserTiers.slice(skip, skip + limit);

        // 3. Get recent redemptions
        const recentRedemptions = ledger
            .filter(l => l.type === "redeem")
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10)
            .map(l => {
                const user = allUsers.find(u => u._id.toString() === l.userId.toString());
                return {
                    id: l._id.toString(),
                    username: user?.username || "Unknown",
                    points: l.points,
                    description: l.description,
                    createdAt: l.createdAt
                };
            });

        return NextResponse.json({
            stats: {
                totalPointsAwarded,
                totalPointsRedeemed,
                totalMembers: allUsers.length,
                tierCounts
            },
            userTiers: paginatedUserTiers,
            recentRedemptions,
            pagination: {
                total: allUsers.length,
                page,
                limit,
                totalPages: Math.ceil(allUsers.length / limit)
            }
        });
    } catch (error) {
        console.error("Admin Rewards API Error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
