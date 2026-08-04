"use client";

import { useCallback, useState } from "react";
import type {
	LogoutApiErrorResponse,
	LogoutApiSuccessResponse,
	LogoutRequestResult,
} from "../types/auth";

const genericLogoutError = "Unable to log out. Please try again.";
const networkLogoutError = "Network error. Please check your connection and try again.";

export function useLogout() {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [apiError, setApiError] = useState("");

	const clearApiError = useCallback(() => {
		setApiError("");
	}, []);

	const logout = useCallback(async (): Promise<LogoutRequestResult> => {
		setIsSubmitting(true);
		setApiError("");

		try {
			const response = await fetch("/api/auth/logout", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			let data: LogoutApiSuccessResponse | LogoutApiErrorResponse | null = null;

			try {
				data = (await response.json()) as LogoutApiSuccessResponse | LogoutApiErrorResponse;
			} catch {
				data = null;
			}

			if (!response.ok) {
				const errorMessage =
					data && "error" in data && typeof data.error === "string"
						? data.error
						: genericLogoutError;

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
					: "Logout successful.";

			return {
				ok: true,
				message: successMessage,
				status: response.status,
			};
		} catch {
			setApiError(networkLogoutError);
			return {
				ok: false,
				error: networkLogoutError,
				status: 0,
			};
		} finally {
			setIsSubmitting(false);
		}
	}, []);

	return {
		logout,
		isSubmitting,
		apiError,
		clearApiError,
	};
}