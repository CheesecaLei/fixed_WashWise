"use client";

import { useCallback, useState } from "react";

export type SavedAddress = {
	id: string;
	label: string;
	fullAddress: string;
	note: string;
	isDefault: boolean;
	isActive: boolean;
	createdAt: string;
};

export type ApiResponse<T = Record<string, unknown>> =
	| ({ success: true; error?: never } & T)
	| { success: false; error: string };

export function useAddresses() {
	const [isLoading, setIsLoading] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState("");

	const fetchAddresses = useCallback(async (): Promise<ApiResponse<{ addresses: SavedAddress[] }>> => {
		setIsLoading(true);
		setError("");
		try {
			const res = await fetch("/api/member/addresses");
			const data = await res.json();
			if (!res.ok || !data.success) {
				const msg = data.error || "Failed to load addresses.";
				setError(msg);
				return { success: false, error: msg };
			}
			return data;
		} catch {
			const msg = "Network error. Please try again.";
			setError(msg);
			return { success: false, error: msg };
		} finally {
			setIsLoading(false);
		}
	}, []);

	const addAddress = useCallback(
		async (fields: { label: string; fullAddress: string; note?: string }): Promise<ApiResponse<{ address: SavedAddress }>> => {
			setIsSubmitting(true);
			setError("");
			try {
				const res = await fetch("/api/member/addresses", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(fields),
				});
				const data = await res.json();
				if (!res.ok || !data.success) {
					const msg = data.error || "Failed to add address.";
					setError(msg);
					return { success: false, error: msg };
				}
				return data;
			} catch {
				const msg = "Network error. Please try again.";
				setError(msg);
				return { success: false, error: msg };
			} finally {
				setIsSubmitting(false);
			}
		},
		[]
	);

	const setActive = useCallback(async (addressId: string): Promise<ApiResponse> => {
		setIsSubmitting(true);
		setError("");
		try {
			const res = await fetch("/api/member/addresses", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ addressId, action: "set-active" }),
			});
			const data = await res.json();
			if (!res.ok || !data.success) {
				const msg = data.error || "Failed to update address.";
				setError(msg);
				return { success: false, error: msg };
			}
			return data;
		} catch {
			const msg = "Network error. Please try again.";
			setError(msg);
			return { success: false, error: msg };
		} finally {
			setIsSubmitting(false);
		}
	}, []);

	const deleteAddress = useCallback(async (addressId: string): Promise<ApiResponse> => {
		setIsSubmitting(true);
		setError("");
		try {
			const res = await fetch(`/api/member/addresses?id=${addressId}`, { method: "DELETE" });
			const data = await res.json();
			if (!res.ok || !data.success) {
				const msg = data.error || "Failed to delete address.";
				setError(msg);
				return { success: false, error: msg };
			}
			return data;
		} catch {
			const msg = "Network error. Please try again.";
			setError(msg);
			return { success: false, error: msg };
		} finally {
			setIsSubmitting(false);
		}
	}, []);

	return {
		isLoading,
		isSubmitting,
		error,
		fetchAddresses,
		addAddress,
		setActive,
		deleteAddress,
	};
}
