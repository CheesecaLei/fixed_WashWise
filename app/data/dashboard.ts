import type { Activity, PulseMetric } from "../types/dashboard";

export const pulseMetricsMockData: PulseMetric[] = [
  {
    id: "washing",
    label: "WASHING",
    value: 2,
    icon: "washing",
    accent: "primary",
  },
  {
    id: "drying",
    label: "DRYING",
    value: 1,
    icon: "drying",
    accent: "warning",
  },
  {
    id: "ironing",
    label: "IRONING",
    value: 4,
    icon: "ironing",
    accent: "secondary",
  },
  {
    id: "to-deliver",
    label: "TO DELIVER",
    value: 0,
    icon: "to-deliver",
    accent: "info",
  },
  {
    id: "ready",
    label: "READY",
    value: 1,
    icon: "ready",
    accent: "success",
  },
  {
    id: "completed",
    label: "COMPLETED",
    value: 12,
    icon: "completed",
    accent: "neutral",
  },
];

export const activitiesMockData: Activity[] = [
  {
    id: "8821",
    service: "Wash & Fold Premium",
    orderNumber: "#8821",
    date: "Oct 24, 2023",
    amount: "₱450.00",
    status: "Processing",
  },
  {
    id: "8819",
    service: "Dry Cleaning - Suit",
    orderNumber: "#8819",
    date: "Oct 23, 2023",
    amount: "₱850.00",
    status: "Ready",
  },
  {
    id: "8815",
    service: "Ironing Only (12pcs)",
    orderNumber: "#8815",
    date: "Oct 22, 2023",
    amount: "₱220.00",
    status: "In Transit",
  },
  {
    id: "8798",
    service: "Deluxe Comforter Wash",
    orderNumber: "#8798",
    date: "Oct 20, 2023",
    amount: "₱550.00",
    status: "Completed",
  },
  {
    id: "8792",
    service: "Standard Wash & Dry",
    orderNumber: "#8792",
    date: "Oct 19, 2023",
    amount: "₱350.00",
    status: "Completed",
  },
  {
    id: "8780",
    service: "Sneaker Deep Clean",
    orderNumber: "#8780",
    date: "Oct 18, 2023",
    amount: "₱600.00",
    status: "Completed",
  },
];
