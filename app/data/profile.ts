import type { ProfileFormData } from "../types/profile";

export const profileMockData: {
	form: ProfileFormData;
	isEmailVerified: boolean;
	passwordLastChanged: string;
	twoFactorEnabled: boolean;
} = {
	form: {
		fullName: "Franchesca Lei M. Arcega",
		contactNumber: "+63 922 0923 821",
		emailAddress: "franchesca@example.com",
	},
	isEmailVerified: true,
	passwordLastChanged: "Last changed 3 months ago",
	twoFactorEnabled: false,
};