export type AddressCapability = "pickup" | "delivery";

export type SavedAddress = {
	id: string;
	label: string;
	tag?: string;
	street: string;
	city: string;
	note?: string;
	activeFor: AddressCapability[];
	isDefault?: boolean;
};

export type AddressSummaryCard = {
	id: string;
	title: string;
	value: string;
	highlight?: boolean;
};

export type LogisticsTip = {
	id: string;
	title: string;
	description: string;
};
