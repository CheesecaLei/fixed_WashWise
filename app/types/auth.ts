export type AuthFooterLink = {
	id: string;
	label: string;
	href: string;
};

export type SignupStepId = "account" | "address" | "security";

export type SignupStep = {
	id: SignupStepId;
	title: string;
	helper: string;
};

export type SignupFormValues = {
	nameOrUsername: string;
	email: string;
	houseOrUnit: string;
	street: string;
	barangay: string;
	landmark: string;
	contactNumber: string;
	dateOfBirth: string;
	password: string;
	confirmPassword: string;
};

export type SignupFieldKey = keyof SignupFormValues;

export type SignupFormErrors = Partial<Record<SignupFieldKey, string>>;

export type SignupReadonlyAddress = {
	city: string;
	province: string;
	country: string;
	postalCode: string;
	formattedSuffix: string;
};

export type SignupValidationMessages = {
	nameOrUsernameRequired: string;
	emailRequired: string;
	emailInvalid: string;
	houseOrUnitRequired: string;
	streetRequired: string;
	barangayRequired: string;
	contactRequired: string;
	contactInvalid: string;
	dateOfBirthRequired: string;
	dateOfBirthInvalid: string;
	passwordRequired: string;
	passwordMinLength: string;
	confirmPasswordRequired: string;
	confirmPasswordMismatch: string;
};

export type SignupFieldHints = {
	email: string;
	contactNumber: string;
	barangay: string;
	password: string;
};

export type LoginFormValues = {
	email: string;
	password: string;
};

export type LoginApiRequestBody = {
	email: string;
	password: string;
};

export type LoginApiUser = {
	id: string;
	email: string;
	username: string;
	role: "member" | "admin";
};

export type LoginApiSuccessResponse = {
	message: string;
	user: LoginApiUser;
};

export type LoginApiErrorResponse = {
	error: string;
};

export type LoginRequestResult =
	| {
		ok: true;
		message: string;
		user: LoginApiUser;
		status: number;
	  }
	| {
		ok: false;
		error: string;
		status: number;
		unverified?: boolean;
	  };

export type LogoutApiSuccessResponse = {
	message: string;
};

export type LogoutApiErrorResponse = {
	error: string;
};

export type LogoutRequestResult =
	| {
		ok: true;
		message: string;
		status: number;
	  }
	| {
		ok: false;
		error: string;
		status: number;
	  };

export type SignupApiRequestBody = {
	email: string;
	username: string;
	address: string;
	contactNo: string;
	dateOfBirth: string;
	password: string;
	confirmPass: string;
};

export type SignupApiSuccessResponse = {
	message: string;
};

export type SignupApiErrorResponse = {
	error: string;
};

export type SignupRequestResult =
	| {
		ok: true;
		message: string;
		status: number;
	  }
	| {
		ok: false;
		error: string;
		status: number;
	  };

export type ForgotPasswordStep = "initial" | "challenge" | "reset";

export type ForgotPasswordInitialResponse = {
	userId: string;
	providedType: "email" | "username";
	message: string;
};

export type ForgotPasswordChallengeResponse = {
	message: string;
};

export type ForgotPasswordResetResponse = {
	message: string;
};
