"use client";

import { useCallback, useState } from "react";
import type {
	CreateCheckoutRequest,
	CreateCheckoutResponse,
	CreateOrderRequest,
	CreateOrderResponse,
	FetchOrderResponse,
	FetchTransactionResponse,
	FetchTransactionsResponse,
} from "../types/new-order";
import { enqueueOrder } from "../lib/offline-order-store";

export function useOrder() {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isLoadingOrder, setIsLoadingOrder] = useState(false);
	const [apiError, setApiError] = useState("");

	const clearApiError = useCallback(() => {
		setApiError("");
	}, []);

	const createOrder = useCallback(async (request: CreateOrderRequest): Promise<CreateOrderResponse & { localQueueId?: string }> => {
		setIsSubmitting(true);
		setApiError("");

		if (typeof navigator !== "undefined" && !navigator.onLine) {
			try {
				const localId = await enqueueOrder(request);

				fetch("/api/member/order", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"x-offline-local-id": localId,
					},
					body: JSON.stringify(request),
				}).catch(() => {
				});

				return { success: true, orderId: "offline-queued", localQueueId: localId };
			} catch {
			} finally {
				setIsSubmitting(false);
			}
		}

		try {
			const response = await fetch("/api/member/order", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(request),
			});

			const data = (await response.json()) as CreateOrderResponse;

			if (!response.ok || !data.success) {
				const errorMessage = data.error || "Failed to create order.";
				setApiError(errorMessage);
				return { success: false, error: errorMessage };
			}

			return data;
		} catch {
			const errorMessage = "Network error. Please try again.";
			setApiError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setIsSubmitting(false);
		}
	}, []);

	const fetchOrder = useCallback(async (orderId: string): Promise<FetchOrderResponse> => {
		setIsLoadingOrder(true);
		setApiError("");

		try {
			const response = await fetch(`/api/member/order?id=${orderId}`);
			const data = (await response.json()) as FetchOrderResponse;

			if (!response.ok || !data.success) {
				const errorMessage = data.error || "Failed to fetch order details.";
				setApiError(errorMessage);
				return { success: false, error: errorMessage };
			}

			return data;
		} catch {
			const errorMessage = "Network error. Please try again.";
			setApiError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setIsLoadingOrder(false);
		}
	}, []);

	const createCheckout = useCallback(async (request: CreateCheckoutRequest): Promise<CreateCheckoutResponse> => {
		setIsSubmitting(true);
		setApiError("");

		try {
			const response = await fetch("/api/member/transaction", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(request),
			});

			const data = (await response.json()) as CreateCheckoutResponse;

			if (!response.ok || !data.success) {
				const errorMessage = data.error || "Failed to process checkout.";
				setApiError(errorMessage);
				return { success: false, error: errorMessage };
			}

			return data;
		} catch {
			const errorMessage = "Network error. Please try again.";
			setApiError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setIsSubmitting(false);
		}
	}, []);

	const fetchTransaction = useCallback(async (transactionId: string): Promise<FetchTransactionResponse> => {
		setIsLoadingOrder(true);
		setApiError("");

		try {
			const response = await fetch(`/api/member/transaction?id=${transactionId}`);
			const data = (await response.json()) as FetchTransactionResponse;

			if (!response.ok || !data.success) {
				const errorMessage = data.error || "Failed to fetch transaction details.";
				setApiError(errorMessage);
				return { success: false, error: errorMessage };
			}

			return data;
		} catch {
			const errorMessage = "Network error. Please try again.";
			setApiError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setIsLoadingOrder(false);
		}
	}, []);

	const fetchTransactions = useCallback(async (page: number = 1): Promise<FetchTransactionsResponse & { pagination?: { total: number; page: number; limit: number; totalPages: number } }> => {
		setIsLoadingOrder(true);
		setApiError("");

		try {
			const response = await fetch(`/api/member/transaction?page=${page}&limit=10`);
			const data = (await response.json()) as FetchTransactionsResponse;

			if (!response.ok || !data.success) {
				const errorMessage = data.error || "Failed to fetch transactions.";
				setApiError(errorMessage);
				return { success: false, error: errorMessage };
			}

			return data;
		} catch {
			const errorMessage = "Network error. Please try again.";
			setApiError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setIsLoadingOrder(false);
		}
	}, []);

	const fetchDashboard = useCallback(async () => {
		setIsLoadingOrder(true);
		setApiError("");

		try {
			const response = await fetch("/api/member/dashboard");
			const data = await response.json();

			if (!response.ok || !data.success) {
				const errorMessage = data.error || "Failed to fetch dashboard data.";
				setApiError(errorMessage);
				return { success: false, error: errorMessage };
			}

			return data;
		} catch {
			const errorMessage = "Network error. Please try again.";
			setApiError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setIsLoadingOrder(false);
		}
	}, []);

	return {
		isSubmitting,
		isLoadingOrder,
		apiError,
		clearApiError,
		createOrder,
		fetchOrder,
		createCheckout,
		fetchTransaction,
		fetchTransactions,
		fetchDashboard,
	};
}
