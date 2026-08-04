"use client";

import { useCallback, useEffect, useState } from "react";
import type { UserAccount, UserStat } from "../types/dashboard";

interface PaginationData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function useUserManagement() {
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [stats, setStats] = useState<UserStat[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationData | null>(null);

    // Debounce search input by 300ms
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchUsers = useCallback(async (pageNum: number = 1, searchQuery: string = "") => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/user-mng?page=${pageNum}&limit=10&search=${encodeURIComponent(searchQuery)}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to fetch users");
            setUsers(data.users || []);
            setPagination(data.pagination || null);
            
            // Map API stats to UserStat type
            if (data.stats) {
                const mappedStats: UserStat[] = [
                    { id: "total", label: "Total Users", value: data.stats.total, color: "primary" },
                    { id: "active", label: "Active", value: data.stats.active, color: "success" },
                    { id: "inactive", label: "Inactive", value: data.stats.inactive, color: "warning" },
                    { id: "suspended", label: "Suspended", value: data.stats.suspended, color: "error" },
                ];
                setStats(mappedStats);
            }
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to load user data.");
            console.error(err);
        } finally {
            setLoading(false);
            setIsInitialLoading(false);
        }
    }, []);

    const updateUserStatus = async (userId: string, status: string | boolean, isVerify: boolean = false) => {
        try {
            const updates = isVerify ? { isVerified: status } : { status };
            const response = await fetch("/api/admin/user-mng", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, updates }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to update user");
            
            await fetchUsers(page, debouncedSearch);
            return { ok: true };
        } catch (err) {
            console.error(err);
            return { ok: false, error: err instanceof Error ? err.message : "Failed to update user status." };
        }
    };

    const updateUser = async (userId: string, updates: { name?: string; email?: string; contactNo?: string }) => {
        try {
            const response = await fetch("/api/admin/user-mng", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, updates }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to update user");
            
            await fetchUsers(page, debouncedSearch);
            return { ok: true };
        } catch (err) {
            console.error(err);
            return { ok: false, error: err instanceof Error ? err.message : "Failed to update user details." };
        }
    };

    const deleteUser = async (userId: string) => {
        try {
            const response = await fetch("/api/admin/user-mng", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to delete user");
            
            await fetchUsers(page, debouncedSearch);
            return { ok: true };
        } catch (err) {
            console.error(err);
            return { ok: false, error: err instanceof Error ? err.message : "Failed to delete user." };
        }
    };

    useEffect(() => {
        fetchUsers(page, debouncedSearch);
    }, [fetchUsers, page, debouncedSearch]);

    return {
        users,
        stats,
        loading,
        isInitialLoading,
        error,
        search,
        setSearch,
        page,
        setPage,
        pagination,
        refresh: () => fetchUsers(page, search),
        updateUserStatus,
        updateUser,
        deleteUser,
    };
}
