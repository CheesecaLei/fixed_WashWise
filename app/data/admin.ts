import type {
  Activity,
  ActivityLog,
  ActivityStat,
  AdminQuickStat,
  AdminStatCard,
  DashboardAnalyticsMetric,
  LiveOrder,
  OrderStatus,
  ProgressStat,
  ReportMetric,
  ServiceReport,
  UserAccount,
  UserStat,
} from "../types/dashboard";

export const adminStatsMockData: AdminStatCard[] = [
  {
    id: "total-customers",
    label: "Total Customers",
    value: 1248,
    icon: "users",
    accent: "primary",
  },
  {
    id: "active-orders",
    label: "Active Orders",
    value: 47,
    icon: "orders",
    accent: "info",
  },
  {
    id: "items-processed",
    label: "Items Processed",
    value: 5892,
    icon: "items",
    accent: "success",
  },
];

export const dashboardAnalyticsMockData: DashboardAnalyticsMetric[] = [
  {
    id: "monthly-revenue",
    label: "Monthly Revenue",
    value: "₱48,234",
    trend: "+12%",
    trendDirection: "up",
  },
  {
    id: "completion-rate",
    label: "Completion Rate",
    value: "94.2%",
    note: "Excellent",
  },
  {
    id: "average-order-value",
    label: "Average Order Value",
    value: "₱627",
  },
];

export const dashboardQuickStatsMockData: AdminQuickStat[] = [
  { id: "today-orders", label: "Today's Orders", value: 23 },
  { id: "pending-pickups", label: "Pending Pickups", value: 8 },
  { id: "ready-delivery", label: "Ready for Delivery", value: 12 },
];

export const recentOrdersMockData: Activity[] = [
  {
    id: "8825",
    service: "Wash & Fold Premium",
    orderNumber: "#8825",
    date: "Apr 12, 2026",
    amount: "₱450.00",
    status: "Processing",
  },
  {
    id: "8824",
    service: "Dry Cleaning - Suit",
    orderNumber: "#8824",
    date: "Apr 12, 2026",
    amount: "₱850.00",
    status: "In Transit",
  },
  {
    id: "8823",
    service: "Ironing Only (12pcs)",
    orderNumber: "#8823",
    date: "Apr 11, 2026",
    amount: "₱220.00",
    status: "Ready",
  },
  {
    id: "8822",
    service: "Deluxe Comforter Wash",
    orderNumber: "#8822",
    date: "Apr 11, 2026",
    amount: "₱550.00",
    status: "Completed",
  },
];

export const activityStatsMockData: ActivityStat[] = [
  {
    id: "completed",
    label: "Completed Orders Today",
    value: 47,
    icon: "completed",
    color: "success",
  },
  {
    id: "alerts",
    label: "Pending Alerts",
    value: 3,
    icon: "alerts",
    color: "warning",
  },
  {
    id: "deliveries",
    label: "Active Deliveries",
    value: 11,
    icon: "deliveries",
    color: "info",
  },
  {
    id: "total",
    label: "Total Activities Today",
    value: 127,
    icon: "total",
    color: "primary",
  },
];

export const activityLogsMockData: ActivityLog[] = [
  {
    id: "activity-1",
    type: "order-received",
    orderCode: "#8828",
    customerName: "Ana Cruz",
    quantity: 15,
    performedBy: "Customer",
    minutesAgo: 5,
    createdAt: new Date().toISOString(),
  },
  {
    id: "activity-2",
    type: "delivery-completed",
    orderCode: "#8827",
    customerName: "Mark Tan",
    quantity: 10,
    performedBy: "Rider - Juan",
    minutesAgo: 12,
    createdAt: new Date().toISOString(),
  },
  {
    id: "activity-3",
    type: "order-completed",
    orderCode: "#8826",
    customerName: "Maria Santos",
    quantity: 12,
    performedBy: "System",
    minutesAgo: 23,
    createdAt: new Date().toISOString(),
  },
  {
    id: "activity-4",
    type: "order-delayed",
    orderCode: "#8825",
    customerName: "John Reyes",
    quantity: 8,
    performedBy: "System",
    minutesAgo: 35,
    createdAt: new Date().toISOString(),
  },
];

export const orderStatusFlow: OrderStatus[] = [
  "waiting",
  "picked-up",
  "received-by-staff",
  "in-progress",
  "ready",
  "out-for-delivery",
  "received-by-client",
  "closed",
];

export const progressStatsMockData: ProgressStat[] = [
  { id: "active", label: "Active Orders", value: 23, color: "primary", icon: "active" },
  { id: "completed", label: "Completed Today", value: 47, color: "success", icon: "completed" },
  { id: "processing", label: "In Processing", value: 15, color: "warning", icon: "processing" },
  { id: "ready", label: "Ready/In Transit", value: 11, color: "info", icon: "ready" },
];

export const liveOrdersMockData: LiveOrder[] = [
  {
    id: "order-1",
    orderCode: "#8826",
    customerName: "Maria Santos",
    customerPhone: "+63 915 234 5678",
    items: 12,
    amount: "₱520.00",
    status: "in-progress",
    orderTime: "Apr 13, 2026 - 8:30 AM",
    estimatedCompletion: "Apr 13, 2026 - 3:00 PM",
  },
  {
    id: "order-2",
    orderCode: "#8825",
    customerName: "John Reyes",
    customerPhone: "+63 917 123 4567",
    items: 8,
    amount: "₱380.00",
    status: "in-progress",
    orderTime: "Apr 13, 2026 - 9:15 AM",
    estimatedCompletion: "Apr 13, 2026 - 2:30 PM",
  },
];

export const reportMetricsMockData: ReportMetric[] = [
  {
    id: "revenue",
    label: "Total Revenue",
    value: "₱124,580",
    change: "+18.2%",
    changeType: "positive",
    icon: "revenue",
  },
  {
    id: "orders",
    label: "Total Orders",
    value: "892",
    change: "+12.5%",
    changeType: "positive",
    icon: "orders",
  },
  {
    id: "customers",
    label: "Active Customers",
    value: "1,248",
    change: "+8.3%",
    changeType: "positive",
    icon: "customers",
  },
  {
    id: "views",
    label: "Page Views",
    value: "24,531",
    change: "-2.1%",
    changeType: "negative",
    icon: "views",
  },
];

export const serviceReportsMockData: ServiceReport[] = [
  {
    id: "wash-fold",
    name: "Wash & Fold",
    orders: 324,
    revenue: "₱48,600",
    average: "₱150",
    growth: "+15.2%",
  },
  {
    id: "dry-clean",
    name: "Dry Cleaning",
    orders: 186,
    revenue: "₱42,900",
    average: "₱230",
    growth: "+22.8%",
  },
  {
    id: "ironing",
    name: "Ironing Service",
    orders: 254,
    revenue: "₱25,400",
    average: "₱100",
    growth: "+8.5%",
  },
  {
    id: "deluxe",
    name: "Deluxe Comforter",
    orders: 128,
    revenue: "₱7,680",
    average: "₱60",
    growth: "+18.3%",
  },
];

export const userStatsMockData: UserStat[] = [
  { id: "total", label: "Total Users", value: 1248, color: "primary" },
  { id: "active", label: "Active Users", value: 987, color: "success" },
  { id: "inactive", label: "Inactive Users", value: 214, color: "warning" },
  { id: "suspended", label: "Suspended", value: 47, color: "error" },
];

export const userAccountsMockData: UserAccount[] = [
  {
    id: "user-1",
    name: "Maria Santos",
    email: "maria.santos@email.com",
    phone: "+63 915 234 5678",
    joinDate: "Jan 15, 2026",
    orders: 24,
    status: "active",
    totalSpent: "₱12,480",
  },
  {
    id: "user-2",
    name: "John Reyes",
    email: "john.reyes@email.com",
    phone: "+63 917 123 4567",
    joinDate: "Feb 3, 2026",
    orders: 18,
    status: "active",
    totalSpent: "₱8,620",
  },
  {
    id: "user-3",
    name: "Ana Cruz",
    email: "ana.cruz@email.com",
    phone: "+63 912 567 8901",
    joinDate: "Mar 20, 2026",
    orders: 12,
    status: "active",
    totalSpent: "₱5,940",
  },
  {
    id: "user-4",
    name: "Mark Tan",
    email: "mark.tan@email.com",
    phone: "+63 918 234 5678",
    joinDate: "Dec 1, 2025",
    orders: 8,
    status: "inactive",
    totalSpent: "₱3,200",
  },
  {
    id: "user-5",
    name: "Lisa Gomez",
    email: "lisa.gomez@email.com",
    phone: "+63 916 789 0123",
    joinDate: "Feb 14, 2026",
    orders: 31,
    status: "active",
    totalSpent: "₱18,930",
  },
];
