"use client";

import { useCallback, useState } from "react";
import type {
	LoginApiErrorResponse,
	LoginApiRequestBody,
	LoginApiSuccessResponse,
	LoginApiUser,
	LoginFormValues,
	LoginRequestResult,
} from "../types/auth";

const genericLoginError = "Unable to log in. Please try again.";
const networkLoginError = "Network error. Please check your connection and try again.";

function normalizeUserRole(role: unknown): "member" | "admin" {
	if (typeof role !== "string") {
		return "member";
	}

	return role.toLowerCase() === "admin" ? "admin" : "member";
}

function buildLoginRequestBody(values: LoginFormValues): LoginApiRequestBody {
	return {
		email: values.email.trim().toLowerCase(),
		password: values.password,
	};
}

function normalizeLoginUser(rawUser: unknown, fallbackEmail: string): LoginApiUser {
	if (!rawUser || typeof rawUser !== "object") {
		return {
			id: "",
			email: fallbackEmail,
			username: "",
			role: "member",
		};
	}

	const user = rawUser as Partial<Record<keyof LoginApiUser, unknown>>;

	return {
		id: typeof user.id === "string" ? user.id : "",
		email: typeof user.email === "string" ? user.email : fallbackEmail,
		username: typeof user.username === "string" ? user.username : "",
		role: normalizeUserRole(user.role),
	};
}

export function useLogin() {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [apiError, setApiError] = useState("");

	const clearApiError = useCallback(() => {
		setApiError("");
	}, []);

	const login = useCallback(async (values: LoginFormValues): Promise<LoginRequestResult> => {
		setIsSubmitting(true);
		setApiError("");

		const fallbackEmail = values.email.trim().toLowerCase();

		try {
			const response = await fetch("/api/auth/login", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(buildLoginRequestBody(values)),
			});

			let data: LoginApiSuccessResponse | LoginApiErrorResponse | null = null;

			try {
				data = (await response.json()) as LoginApiSuccessResponse | LoginApiErrorResponse;
			} catch {
				data = null;
			}

			if (!response.ok) {
				const errorMessage =
					data && "error" in data && typeof data.error === "string"
						? data.error
						: genericLoginError;

				const unverified = data && "unverified" in data ? (data as any).unverified : undefined;

				setApiError(errorMessage);
				return {
					ok: false,
					error: errorMessage,
					status: response.status,
					unverified,
				};
			}

			const message =
				data && "message" in data && typeof data.message === "string"
					? data.message
					: "Login successful.";

			const user =
				data && "user" in data
					? normalizeLoginUser(data.user, fallbackEmail)
					: normalizeLoginUser(null, fallbackEmail);

			return {
				ok: true,
				message,
				user,
				status: response.status,
			};
		} catch {
			setApiError(networkLoginError);
			return {
				ok: false,
				error: networkLoginError,
				status: 0,
			};
		} finally {
			setIsSubmitting(false);
		}
	}, []);

	return {
		login,
		isSubmitting,
		apiError,
		clearApiError,
	};
}
