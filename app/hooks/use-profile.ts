"use client";

import { useCallback, useState } from "react";

export type ProfileData = {
	username: string;
	contactNo: string;
	email: string;
};

export type FetchProfileResponse =
	| { success: true; user: ProfileData; error?: never }
	| { success: false; error: string };

export type UpdateProfileResponse =
	| { success: true; message: string; error?: never }
	| { success: false; error: string };

export type UpdatePasswordResponse =
	| { success: true; message: string; error?: never }
	| { success: false; error: string };

export function useProfile() {
	const [isLoading, setIsLoading] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [isChangingPassword, setIsChangingPassword] = useState(false);
	const [error, setError] = useState("");

	const fetchProfile = useCallback(async (): Promise<FetchProfileResponse> => {
		setIsLoading(true);
		setError("");

		try {
			const response = await fetch("/api/member/profile");
			const data = (await response.json()) as FetchProfileResponse;

			if (!response.ok || !data.success) {
				const message = (!data.success ? data.error : undefined) || "Failed to load profile.";
				setError(message);
				return { success: false, error: message };
			}

			return data;
		} catch {
			const message = "Network error. Please try again.";
			setError(message);
			return { success: false, error: message };
		} finally {
			setIsLoading(false);
		}
	}, []);

	const updateProfile = useCallback(async (fields: Partial<ProfileData>): Promise<UpdateProfileResponse> => {
		setIsSaving(true);
		setError("");

		try {
			const response = await fetch("/api/member/profile", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(fields),
			});
			const data = (await response.json()) as UpdateProfileResponse;

			if (!response.ok || !data.success) {
				const message = (!data.success ? data.error : undefined) || "Failed to update profile.";
				setError(message);
				return { success: false, error: message };
			}

			return data;
		} catch {
			const message = "Network error. Please try again.";
			setError(message);
			return { success: false, error: message };
		} finally {
			setIsSaving(false);
		}
	}, []);

	const updatePassword = useCallback(async (fields: {
		currentPassword: string;
		newPassword: string;
		confirmPassword: string;
	}): Promise<UpdatePasswordResponse> => {
		setIsChangingPassword(true);
		setError("");

		try {
			const response = await fetch("/api/member/profile/password", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(fields),
			});
			const data = (await response.json()) as UpdatePasswordResponse;

			if (!response.ok || !data.success) {
				const message = (!data.success ? data.error : undefined) || "Failed to update password.";
				setError(message);
				return { success: false, error: message };
			}

			return data;
		} catch {
			const message = "Network error. Please try again.";
			setError(message);
			return { success: false, error: message };
		} finally {
			setIsChangingPassword(false);
		}
	}, []);

	return {
		isLoading,
		isSaving,
		isChangingPassword,
		error,
		fetchProfile,
		updateProfile,
		updatePassword,
	};
}
