import type {
	AuthFooterLink,
	LoginFormValues,
	SignupFieldHints,
	SignupFieldKey,
	SignupFormValues,
	SignupReadonlyAddress,
	SignupStep,
	SignupValidationMessages,
} from "../types/auth";

export const authFooterLinks: AuthFooterLink[] = [
	{ id: "privacy", label: "Privacy Policy", href: "/privacy" },
	{ id: "terms", label: "Terms of Service", href: "/terms" },
	{ id: "support", label: "Support", href: "/support" },
];

export const authFooterBrandText = `\u00A9 ${new Date().getFullYear()} Wash Wise Laundry Services`;

export const loginPageCopy = {
	title: "Log In",
	emailLabel: "Email Address",
	passwordLabel: "Password",
	submitLabel: "Log In",
	orLabel: "or",
	googleLabel: "Google",
	forgotPasswordLabel: "Forgot password?",
	noAccountPrompt: "Don't have an account?",
	signupLabel: "Sign up",
} as const;

export const signupPageCopy = {
	title: "Create Account",
	subtitle: "Short guided steps for faster signup.",
	stepLabelPrefix: "Step",
	stepLabelConnector: "of",
	backLabel: "Back",
	continueLabel: "Continue",
	submitLabel: "Create Account",
	submitLoadingLabel: "Creating Account...",
	submitLoadingStatus: "Submitting your signup details...",
	orLabel: "or",
	googleLabel: "Google",
	hasAccountPrompt: "Already have an account?",
	loginLabel: "Log in",
	addressPreviewPrefix: "Address preview:",
	successMessageSuffix: "Address and contact are ready for account creation.",
} as const;

export const signupFormLabels = {
	nameOrUsername: "Name or Username",
	email: "Gmail Address",
	contactNumber: "Philippine Contact Number",
	dateOfBirth: "Date of Birth",
	houseOrUnit: "House / Unit No.",
	street: "Street",
	barangay: "Barangay",
	landmark: "Landmark (Optional)",
	city: "City",
	province: "Province",
	country: "Country",
	postalCode: "Postal Code",
	password: "Account Password",
	confirmPassword: "Confirm Password",
} as const;

export const signupSteps: SignupStep[] = [
	{
		id: "account",
		title: "Account Basics",
		helper: "Use your main Gmail and a reachable Philippine mobile number.",
	},
	{
		id: "address",
		title: "Address Details",
		helper: "Delivery service is restricted to Olongapo City, Philippines.",
	},
	{
		id: "security",
		title: "Secure Account",
		helper: "Create and confirm your password to complete signup.",
	},
];

export const olongapoBarangays: string[] = [
	"Asinan",
	"Bajac-Bajac",
	"Barretto",
	"East Bajac-Bajac",
	"East Tapinac",
	"Gordon Heights",
	"Kalaklan",
	"Mabayuan",
	"New Cabalan",
	"New Ilalim",
	"New Kababae",
	"New Kalalake",
	"Old Cabalan",
	"Pag-asa",
	"Santa Rita",
	"West Bajac-Bajac",
	"West Tapinac",
];

export const olongapoStreets: string[] = [
	"Rizal Avenue",
	"Magsaysay Drive",
	"Gordon Avenue",
	"Tabacuhan Road",
	"18th Street",
	"14th Street",
	"Arthur Street",
	"Filipino Street",
	"Harris Street",
	"West Bajac-Bajac Street",
	"East Bajac-Bajac Street",
	"Sta. Rita Road",
	"Kalaklan Street",
	"Barretto Street",
	"Pag-asa Street",
	"New Cabalan Street",
	"Old Cabalan Street"
];

export const signupReadonlyAddress: SignupReadonlyAddress = {
	city: "Olongapo City",
	province: "Zambales",
	country: "Philippines",
	postalCode: "2200",
	formattedSuffix: "Olongapo City (2200), Zambales, Philippines",
};

export function buildSignupFormattedAddress(
	values: Pick<SignupFormValues, "houseOrUnit" | "street" | "barangay">,
) {
	const addressParts = [
		[values.houseOrUnit.trim(), values.street.trim()].filter(Boolean).join(" "),
		values.barangay.trim(),
		signupReadonlyAddress.formattedSuffix,
	].filter(Boolean);

	return addressParts.join(", ");
}

export const initialSignupFormValues: SignupFormValues = {
	nameOrUsername: "",
	email: "",
	houseOrUnit: "",
	street: "",
	barangay: "",
	landmark: "",
	contactNumber: "",
	dateOfBirth: "",
	password: "",
	confirmPassword: "",
};

export const signupStepFields: SignupFieldKey[][] = [
	["nameOrUsername", "email", "contactNumber", "dateOfBirth"],
	["houseOrUnit", "street", "barangay"],
	["password", "confirmPassword"],
];

export const signupFieldHints: SignupFieldHints = {
	email: "Only @gmail.com addresses are accepted.",
	contactNumber: "Format: 09XXXXXXXXX. Handled securely for logistics coordination & order notifications under the Philippine DPA.",
	barangay: "Select official barangay. Handled securely solely to coordinate order deliveries.",
	password: "Use at least 8 characters.",
};

export const signupValidationMessages: SignupValidationMessages = {
	nameOrUsernameRequired: "Name or username is required.",
	emailRequired: "Gmail address is required.",
	emailInvalid: "Please enter a valid Gmail address (example@gmail.com).",
	houseOrUnitRequired: "House or unit number is required.",
	streetRequired: "Street name is required.",
	barangayRequired: "Please select your barangay in Olongapo City.",
	contactRequired: "Philippine contact number is required.",
	contactInvalid: "Use 09XXXXXXXXX format.",
	dateOfBirthRequired: "Date of Birth is required.",
	dateOfBirthInvalid: "You must be at least 18 years old to sign up.",
	passwordRequired: "Password is required.",
	passwordMinLength: "Password must be at least 8 characters.",
	confirmPasswordRequired: "Please confirm your password.",
	confirmPasswordMismatch: "Passwords do not match.",
};

export const signupFormRegex = {
	gmail: /^[A-Z0-9._%+-]+@gmail\.com$/i,
	localMobile: /^09\d{9}$/,
} as const;

export const initialLoginFormValues: LoginFormValues = {
	email: "",
	password: "",
};

export function getSignupSuccessMessage(nameOrUsername: string): string {
	return `Signup details validated for ${nameOrUsername}. ${signupPageCopy.successMessageSuffix}`;
}

export const forgotPasswordPageCopy = {
	title: "Forgot Password",
	initialStepTitle: "Verify Identity",
	initialStepHelper: "Enter your registered Gmail or username to begin.",
	challengeStepTitle: "Security Layer",
	challengeStepHelper: "Provide your other credential and address for verification.",
	resetStepTitle: "Reset Password",
	resetStepHelper: "Create a new secure password for your account.",
	submitInitial: "Verify User",
	submitChallenge: "Confirm Identity",
	submitReset: "Update Password",
	backToLogin: "Back to Login",
} as const;
