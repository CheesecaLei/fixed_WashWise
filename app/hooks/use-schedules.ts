"use client";

import { useState, useEffect, useCallback } from "react";

export interface Schedule {
    id: string;
    orderId: string;
    orderCode: string;
    customerName: string;
    customerPhone: string;
    serviceMethod: "pickup" | "dropoff";
    selectedSlot: string;
    status: string;
    finalTotal: number;
    address: string;
    createdAt: string;
    paymentMethod?: string;
    paymentStatus?: string;
    logisticsFee?: number;
    promoDiscount?: number;
    rewardDiscount?: number;
    loyaltyDiscount?: number;
    services?: Array<{
        id: string;
        label: string;
        quantity: number;
        unitLabel: string;
        lineTotal: number;
    }>;
}

interface PaginationData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

import { pusherClient } from "../lib/pusher-client";

export function useSchedules() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationData | null>(null);

    const fetchSchedules = useCallback(async (pageNum: number = 1) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/admin/scheduling?page=${pageNum}&limit=10`);
            const data = await response.json();

            if (data.success) {
                setSchedules(data.schedules);
                setPagination(data.pagination);
            } else {
                setError(data.error || "Failed to fetch schedules");
            }
        } catch (err) {
            setError("An error occurred while fetching schedules");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const updatePaymentStatus = useCallback(async (checkoutId: string, paymentStatus: string) => {
        try {
            const response = await fetch("/api/admin/scheduling", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ checkoutId, paymentStatus }),
            });
            const data = await response.json();
            if (data.success) {
                setSchedules(prev => prev.map(s => s.id === checkoutId ? { ...s, paymentStatus } : s));
                return { success: true };
            } else {
                return { success: false, error: data.error || "Failed to update payment status" };
            }
        } catch (err) {
            console.error(err);
            return { success: false, error: "An error occurred while updating payment status" };
        }
    }, []);

    useEffect(() => {
        fetchSchedules(page);
    }, [fetchSchedules, page]);

    useEffect(() => {
        const channel = pusherClient.subscribe("order-updates");
        channel.bind("order-status-updated", (data: { orderId?: string; status?: string }) => {
            if (data.orderId && data.status) {
                setSchedules(prev => prev.map(s => (s.orderId === data.orderId || s.id === data.orderId) ? { ...s, status: data.status! } : s));
            }
        });

        return () => {
            channel.unbind_all();
            pusherClient.unsubscribe("order-updates");
        };
    }, []);

    return {
        schedules,
        loading,
        error,
        page,
        setPage,
        pagination,
        updatePaymentStatus,
        refresh: () => fetchSchedules(page)
    };
}
