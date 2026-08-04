import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "../../../config/mongodb";
import { rewardsMilestonesData } from "../../../data/rewards";

export async function GET(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId || !ObjectId.isValid(userId)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const page = parseInt(searchParams.get("page") || "1");
		const limit = parseInt(searchParams.get("limit") || "10");
		const skip = (page - 1) * limit;

		const db = await getDb();
		const ledgerCollection = db.collection("rewards_ledger");
		const ordersCollection = db.collection("orders");

		// 1. Get Points Ledger (Paginated)
		const filter = { userId: new ObjectId(userId) };
		const totalCount = await ledgerCollection.countDocuments(filter);
		
		const history = await ledgerCollection
			.find(filter)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(limit)
			.toArray();

		const { calculateUserPoints } = await import("../../../lib/rewards-util");
		const totalPoints = await calculateUserPoints(userId);

		// 3. Count Completed Orders
		const completedOrders = await ordersCollection.countDocuments({
			userId: new ObjectId(userId),
			status: "closed",
		});

		// 4. Determine Unlocked Rewards and Next Tier
		const unlockedRewards = rewardsMilestonesData
			.filter((m) => totalPoints >= m.pointsRequired)
			.map((m) => m.id);

		let currentTier = "starter" as any;
		let nextTier = undefined;

		for (const milestone of rewardsMilestonesData) {
			if (completedOrders >= milestone.ordersRequired) {
				currentTier = milestone.id;
			} else {
				nextTier = {
					tier: milestone.id,
					pointsRemaining: Math.max(0, milestone.pointsRequired - totalPoints),
					ordersRemaining: Math.max(0, milestone.ordersRequired - completedOrders),
				};
				break;
			}
		}

		return NextResponse.json({
			success: true,
			summary: {
				totalPoints,
				completedOrders,
				currentTier,
				nextTier,
				unlockedRewards,
				history: history.map((h) => ({
					...h,
					_id: h._id.toString(),
					userId: h.userId.toString(),
				})),
				pagination: {
					total: totalCount,
					page,
					limit,
					totalPages: Math.ceil(totalCount / limit)
				}
			},
		});
	} catch (error) {
		console.error("Error fetching rewards summary:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(request: NextRequest) {
	try {
		const userId = request.headers.get("x-user-id");
		if (!userId || !ObjectId.isValid(userId)) {
			return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
		}

		const body = await request.json();
		const { action, orderId, rewardId } = body;

		const db = await getDb();
		const ledgerCollection = db.collection("rewards_ledger");

		if (action === "award") {
			const { awardPointsForOrder } = await import("../../../lib/rewards-util");
			const result = await awardPointsForOrder(userId, orderId);
			if (!result.success) {
				return NextResponse.json({ success: false, error: result.error }, { status: 400 });
			}
			return NextResponse.json({ success: true, pointsAwarded: result.points });
		}

		if (action === "redeem") {
			const milestone = rewardsMilestonesData.find((m) => m.id === rewardId);
			if (!milestone) {
				return NextResponse.json({ success: false, error: "Invalid Reward" }, { status: 400 });
			}

			const { calculateUserPoints } = await import("../../../lib/rewards-util");
			const totalPoints = await calculateUserPoints(userId);
			
			if (totalPoints < milestone.pointsRequired) {
				return NextResponse.json({ success: false, error: "Insufficient points" }, { status: 400 });
			}
			
			// Record activity
			const { recordActivity } = await import("../../../lib/logger");
			const customer = await db.collection("users").findOne({ _id: new ObjectId(userId) });
			await recordActivity({
				type: "reward-redeemed",
				customerName: customer?.username || "Guest",
				performedBy: "Customer",
				details: `Redeemed reward: ${milestone.id} for ${milestone.pointsRequired} points.`
			});
			
			return NextResponse.json({
				success: true,
				discountAmount: milestone.discountAmount,
			});
		}

		return NextResponse.json({ success: false, error: "Invalid Action" }, { status: 400 });
	} catch (error) {
		console.error("Error in rewards action:", error);
		return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
	}
}
