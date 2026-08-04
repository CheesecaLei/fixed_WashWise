export type PulseMetricAccent =
  | "primary"
  | "warning"
  | "secondary"
  | "info"
  | "success"
  | "neutral";

export type PulseMetricIconName = "washing" | "drying" | "ironing" | "to-deliver" | "ready" | "completed";

export type PulseMetric = {
  id: string;
  label: string;
  value: number;
  icon: PulseMetricIconName;
  accent: PulseMetricAccent;
};

export type ActivityStatus = "Processing" | "In Transit" | "Ready" | "Completed";

export type Activity = {
  id: string;
  service: string;
  orderNumber: string;
  date: string;
  amount: string;
  status: ActivityStatus;
};

export type AdminStatCard = {
  id: string;
  label: string;
  value: number;
  icon: "users" | "orders" | "items";
  accent: "primary" | "info" | "success";
};

export type DashboardAnalyticsTrendDirection = "up" | "down";

export interface DashboardAnalyticsMetric {
	id: string;
	label: string;
	value: string;
	trend?: string;
	trendDirection?: "up" | "down";
	note?: string;
}

export interface Demographics {
	location: string;
	count: number;
}

export type AdminQuickStat = {
  id: string;
  label: string;
  value: number;
};

export type ActivityStatIcon = "completed" | "alerts" | "deliveries" | "total";

export type ActivityStatColor = "success" | "warning" | "info" | "primary";

export type ActivityStat = {
  id: string;
  label: string;
  value: number;
  icon: ActivityStatIcon;
  color: ActivityStatColor;
};

export type OrderStatus =
  | "waiting"
  | "picked-up"
  | "received-by-staff"
  | "in-progress"
  | "ready"
  | "out-for-delivery"
  | "received-by-client"
  | "closed"
  | "cancelled";

export type LiveOrder = {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  items: number;
  amount: string;
  status: OrderStatus;
  serviceMethod?: string;
  orderTime: string;
  estimatedCompletion: string;
  rewardId?: string | null;
  rewardDiscount?: number;
  paymentStatus?: string;
  paymentMethod?: string;
};

export type ProgressStatIcon = "active" | "completed" | "processing" | "ready";

export type ProgressStatColor = "primary" | "success" | "warning" | "info";

export type ProgressStat = {
  id: string;
  label: string;
  value: number;
  color: ProgressStatColor;
  icon: ProgressStatIcon;
};

export type ReportMetricIcon = "revenue" | "orders" | "customers" | "views";

export type ReportMetric = {
  id: string;
  label: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
  icon: ReportMetricIcon;
};

export type ServiceReport = {
  id: string;
  name: string;
  orders: number;
  revenue: string;
  average: string;
  growth: string;
};

export type UserStatus = "active" | "inactive" | "suspended";

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  orders: number;
  status: UserStatus;
  totalSpent: string;
};

export type UserStatColor = "primary" | "success" | "warning" | "error";

export type UserStat = {
  id: string;
  label: string;
  value: number;
  color: UserStatColor;
};

export type ActivityLog = {
  id: string;
  type: string;
  orderCode: string;
  customerName: string;
  quantity: number;
  performedBy: string;
  minutesAgo: number;
  createdAt: string;
  details?: string;
};


