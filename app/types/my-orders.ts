export type TimelineStatus = "done" | "current" | "upcoming";

export type TimelineItem = {
	id: string;
	label: string;
	timestamp: string;
	status: TimelineStatus;
};

export type OrderHistoryStatus = "Completed" | "Cancelled";

export type OrderHistoryItem = {
	id: string;
	datePlaced: string;
	services: string;
	amount: number;
	status: OrderHistoryStatus;
};
