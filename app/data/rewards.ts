import { RewardsCatalogItem } from "../types/rewards";

export const rewardsMilestonesData: RewardsCatalogItem[] = [
	{
		id: "starter",
		label: "Starter",
		requirement: "Reach 10 orders to become a Starter",
		reward: "Free detergent upgrade",
		pointsRequired: 50,
		ordersRequired: 10,
		discountAmount: 30,
		color: "success",
	},
	{
		id: "regular",
		label: "Regular",
		requirement: "Reach 25 orders to become a Regular",
		reward: "\u20B150 discount",
		pointsRequired: 150,
		ordersRequired: 25,
		discountAmount: 50,
		color: "info",
	},
	{
		id: "loyal",
		label: "Loyal",
		requirement: "Reach 50 orders to become a Loyal member",
		reward: "\u20B1100 discount or free ironing",
		pointsRequired: 300,
		ordersRequired: 50,
		discountAmount: 100,
		color: "secondary",
	},
	{
		id: "vip",
		label: "VIP",
		requirement: "Reach 100 orders for VIP status",
		reward: "Priority service / bonus rewards",
		pointsRequired: 500,
		ordersRequired: 100,
		discountAmount: 200,
		color: "primary",
	},
];
