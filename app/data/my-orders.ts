import type { OrderHistoryItem, TimelineItem } from "../types/my-orders";

export const currentOrderId = "WW-99210";

export const estimatedFinish = "Tomorrow, 2:00 PM";

export const timelineItems: TimelineItem[] = [
	{ id: "placed", label: "Order Placed", timestamp: "Oct 24, 10:30 AM", status: "done" },
	{ id: "picked-up", label: "Picked Up", timestamp: "Oct 24, 11:15 AM", status: "done" },
	{ id: "washing", label: "Washing", timestamp: "Oct 24, 01:45 PM", status: "done" },
	{ id: "drying", label: "Drying", timestamp: "Oct 24, 03:10 PM", status: "done" },
	{ id: "ironing", label: "Ironing", timestamp: "In Progress", status: "current" },
	{ id: "ready", label: "Ready for Delivery", timestamp: "Expected Tomorrow", status: "upcoming" },
	{ id: "completed", label: "Completed", timestamp: "Pending", status: "upcoming" },
];

export const orderHistory: OrderHistoryItem[] = [
	{ id: "WW-8821", datePlaced: "Oct 20, 2023", services: "Wash & Dry", amount: 350, status: "Completed" },
	{ id: "WW-8750", datePlaced: "Oct 15, 2023", services: "Ironing Only", amount: 120, status: "Completed" },
	{ id: "WW-8601", datePlaced: "Oct 10, 2023", services: "Full Service", amount: 620, status: "Completed" },
	{ id: "WW-8544", datePlaced: "Oct 02, 2023", services: "Wash & Dry", amount: 315, status: "Completed" },
	{ id: "WW-8499", datePlaced: "Sep 28, 2023", services: "Ironing Only", amount: 95, status: "Completed" },
];
