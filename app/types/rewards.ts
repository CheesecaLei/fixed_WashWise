export type RewardTier = "starter" | "regular" | "loyal" | "vip";

export type LedgerEntryType = "earn" | "redeem";

export interface RewardsCatalogItem {
	id: RewardTier;
	label: string;
	requirement: string;
	reward: string;
	pointsRequired: number;
	ordersRequired: number;
	discountAmount: number;
	color: "success" | "info" | "secondary" | "primary" | "warning";
}

export interface LedgerEntry {
	_id?: string;
	userId: string;
	type: LedgerEntryType;
	points: number;
	description: string;
	orderId?: string; // Optional if earned from order
	rewardId?: RewardTier; // Optional if redeemed
	createdAt: string;
}

export interface PaginationData {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface UserRewardsSummary {
	totalPoints: number;
	completedOrders: number;
	currentTier: RewardTier;
	nextTier?: {
		tier: RewardTier;
		pointsRemaining: number;
		ordersRemaining: number;
	};
	unlockedRewards: RewardTier[];
	history: LedgerEntry[];
	pagination?: PaginationData;
}

export type FetchRewardsResponse =
	| { success: true; summary: UserRewardsSummary; error?: never }
	| { success: false; error: string };

export type RedeemRewardResponse =
	| { success: true; message: string; discountAmount: number; error?: never }
	| { success: false; error: string };
