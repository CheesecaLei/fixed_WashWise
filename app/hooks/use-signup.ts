"use client";

import { useCallback, useState } from "react";
import { buildSignupFormattedAddress } from "../data/auth";
import type {
	SignupApiErrorResponse,
	SignupApiRequestBody,
	SignupApiSuccessResponse,
	SignupFormValues,
	SignupRequestResult,
} from "../types/auth";

const genericSignupError = "Unable to create account. Please try again.";
const networkSignupError = "Network error. Please check your connection and try again.";

function buildSignupRequestBody(values: SignupFormValues): SignupApiRequestBody {
	return {
		email: values.email.trim().toLowerCase(),
		username: values.nameOrUsername.trim(),
		address: buildSignupFormattedAddress(values),
		contactNo: values.contactNumber.trim(),
		password: values.password,
		confirmPass: values.confirmPassword,
		dateOfBirth: values.dateOfBirth,
	};
}

export function useSignup() {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [apiError, setApiError] = useState("");

	const clearApiError = useCallback(() => {
		setApiError("");
	}, []);

	const signup = useCallback(async (values: SignupFormValues): Promise<SignupRequestResult> => {
		setIsSubmitting(true);
		setApiError("");

		try {
			const response = await fetch("/api/auth/signup", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(buildSignupRequestBody(values)),
			});

			let data: SignupApiSuccessResponse | SignupApiErrorResponse | null = null;

			try {
				data = (await response.json()) as SignupApiSuccessResponse | SignupApiErrorResponse;
			} catch {
				data = null;
			}

			if (!response.ok) {
				const errorMessage =
					data && "error" in data && typeof data.error === "string"
						? data.error
						: genericSignupError;

				setApiError(errorMessage);
				return {
					ok: false,
					error: errorMessage,
					status: response.status,
				};
			}

			const successMessage =
				data && "message" in data && typeof data.message === "string"
					? data.message
					: "User registered successfully.";

			return {
				ok: true,
				message: successMessage,
				status: response.status,
			};
		} catch {
			setApiError(networkSignupError);
			return {
				ok: false,
				error: networkSignupError,
				status: 0,
			};
		} finally {
			setIsSubmitting(false);
		}
	}, []);

	return {
		signup,
		isSubmitting,
		apiError,
		clearApiError,
	};
}
