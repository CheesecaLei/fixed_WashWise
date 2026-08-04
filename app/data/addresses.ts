import type { AddressSummaryCard, LogisticsTip, SavedAddress } from "../types/addresses";

export const addressSummaryCardsMockData: AddressSummaryCard[] = [
	{
		id: "default-location",
		title: "Default Location",
		value: "Home",
		highlight: true,
	},
	{
		id: "active-pickup",
		title: "Active for Pickup",
		value: "1 Locations",
	},
	{
		id: "active-delivery",
		title: "Active for Delivery",
		value: "2 Locations",
	},
];

export const savedAddressesMockData: SavedAddress[] = [
	{
		id: "home",
		label: "Home",
		tag: "Default",
		street: "#1378 Tabacuhan",
		city: "Zambales",
		note: "Please leave the laundry bag outside the door next to the blue mat.",
		activeFor: ["pickup", "delivery"],
		isDefault: true,
	},
	{
		id: "work-office",
		label: "Work / Office",
		street: "Sm Central",
		city: "Zambales",
		note: "Call reception upon arrival. Ask for the Facilities Manager.",
		activeFor: ["pickup", "delivery"],
	},
	{
		id: "condo",
		label: "Condo",
		street: "Otso Otso",
		city: "Zambales",
		activeFor: ["delivery"],
	},
];

export const logisticsTipsMockData: LogisticsTip[] = [
	{
		id: "multiple-locations",
		title: "Multiple Locations",
		description:
			"You can set one address for pickup and a different one for delivery. Perfect for starting your laundry cycle from the office and having it delivered to your home.",
	},
	{
		id: "default-address",
		title: "Default Address",
		description:
			"Your default address is automatically selected for quick bookings. You can change this anytime in the address editing menu.",
	},
];