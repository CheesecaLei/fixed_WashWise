"use client";

import { useCallback, useEffect, useState } from "react";
import { pusherClient } from "../lib/pusher-client";
import { toast } from "react-toastify";

export interface ProfileRequestItem {
	id: string;
	userId: string;
	userName: string;
	userEmail: string;
	userPhone: string;
	field: "username" | "contactNo" | "email";
	currentValue: string;
	proposedValue: string;
	reason: string;
	status: "pending" | "approved" | "rejected";
	rejectionReason?: string;
	createdAt: string;
	reviewedAt?: string | null;
}

interface PaginationData {
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export function useProfileRequests() {
	const [requests, setRequests] = useState<ProfileRequestItem[]>([]);
	const [pendingCount, setPendingCount] = useState<number>(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [page, setPage] = useState(1);
	const [pagination, setPagination] = useState<PaginationData | null>(null);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
		}, 300);
		return () => clearTimeout(timer);
	}, [search]);

	const fetchRequests = useCallback(async (pageNum: number = 1, filterStatus: string = "all", searchQuery: string = "") => {
		try {
			setLoading(true);
			const url = `/api/admin/profile-requests?page=${pageNum}&limit=10&status=${filterStatus}&search=${encodeURIComponent(searchQuery)}`;
			const response = await fetch(url);
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Failed to fetch profile requests");
			
			setRequests(data.requests || []);
			setPendingCount(data.pendingCount || 0);
			setPagination(data.pagination || null);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to load profile requests.");
			console.error(err);
		} finally {
			setLoading(false);
		}
	}, []);

	const approveRequest = async (requestId: string) => {
		try {
			const response = await fetch("/api/admin/profile-requests", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ requestId, action: "approve" }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Failed to approve request");

			await fetchRequests(page, statusFilter, debouncedSearch);
			return { ok: true, message: data.message };
		} catch (err) {
			console.error(err);
			return { ok: false, error: err instanceof Error ? err.message : "Failed to approve request." };
		}
	};

	const rejectRequest = async (requestId: string, rejectionReason: string) => {
		try {
			const response = await fetch("/api/admin/profile-requests", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ requestId, action: "reject", rejectionReason }),
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.error || "Failed to reject request");

			await fetchRequests(page, statusFilter, debouncedSearch);
			return { ok: true, message: data.message };
		} catch (err) {
			console.error(err);
			return { ok: false, error: err instanceof Error ? err.message : "Failed to reject request." };
		}
	};

	useEffect(() => {
		fetchRequests(page, statusFilter, debouncedSearch);
	}, [fetchRequests, page, statusFilter, debouncedSearch]);

	useEffect(() => {
		if (typeof window === "undefined" || !pusherClient) return;

		const channel = pusherClient.subscribe("admin-profile-requests");

		channel.bind("new-profile-request", (data: ProfileRequestItem) => {
			toast.info(`New profile update request from ${data.userName}`);
			setRequests((prev) => [data, ...prev.filter((r) => r.id !== data.id)]);
			setPendingCount((prev) => prev + 1);
		});

		channel.bind("profile-request-updated", (data: Partial<ProfileRequestItem> & { id: string }) => {
			setRequests((prev) =>
				prev.map((item) => (item.id === data.id ? { ...item, ...data } : item))
			);
			fetchRequests(page, statusFilter, debouncedSearch);
		});

		return () => {
			pusherClient.unsubscribe("admin-profile-requests");
		};
	}, [fetchRequests, page, statusFilter, debouncedSearch]);

	return {
		requests,
		pendingCount,
		loading,
		error,
		statusFilter,
		setStatusFilter,
		search,
		setSearch,
		page,
		setPage,
		pagination,
		refresh: () => fetchRequests(page, statusFilter, search),
		approveRequest,
		rejectRequest,
	};
}
