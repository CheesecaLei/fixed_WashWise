"use client";

import { useCallback, useEffect, useState } from "react";
import type { LiveOrder, OrderStatus, ProgressStat } from "../types/dashboard";

interface PaginationData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function useOrderProgress() {
    const [orders, setOrders] = useState<LiveOrder[]>([]);
    const [stats, setStats] = useState<ProgressStat[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationData | null>(null);

    const fetchData = useCallback(async (pageNum: number = 1) => {
        try {
            setLoading(true);
            const response = await fetch(`/api/admin/service-mng?page=${pageNum}&limit=10`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to fetch progress data");
            setOrders(data.orders);
            setStats(data.stats);
            setPagination(data.pagination);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to load progress data.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const updateStatus = async (orderId: string, status: OrderStatus) => {
        try {
            setUpdatingId(orderId);
            const response = await fetch("/api/admin/service-mng", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, status }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to update status");
            
            // Local update for responsiveness
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
            return { ok: true };
        } catch (err) {
            console.error(err);
            return { ok: false, error: err instanceof Error ? err.message : "Failed to update status." };
        } finally {
            setUpdatingId(null);
        }
    };

    useEffect(() => {
        fetchData(page);
    }, [fetchData, page]);

    const verifyWeight = async (orderId: string, verifiedWeight: number, proofImage?: string) => {
        try {
            setUpdatingId(orderId);
            const response = await fetch("/api/admin/service-mng", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, action: "verify-weight", verifiedWeight, proofImage }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to verify weight");
            
            await fetchData(page);
            return { ok: true };
        } catch (err) {
            console.error(err);
            return { ok: false, error: err instanceof Error ? err.message : "Failed to verify weight." };
        } finally {
            setUpdatingId(null);
        }
    };

    return {
        orders,
        stats,
        loading,
        error,
        updatingId,
        page,
        setPage,
        pagination,
        refresh: () => fetchData(page),
        updateStatus,
        verifyWeight,
    };
}
