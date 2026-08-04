"use client";

import { useCallback, useEffect, useState } from "react";
import type { ActivityLog } from "../types/dashboard";

interface PaginationData {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export function useActivities() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<PaginationData | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [timeframeFilter, setTimeframeFilter] = useState("all");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const fetchData = useCallback(async (pageNum: number = 1) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pageNum.toString(),
                limit: "20",
                sort: sortOrder,
            });
            
            if (searchQuery) params.append("search", searchQuery);
            if (typeFilter !== "all") params.append("type", typeFilter);
            if (timeframeFilter !== "all") params.append("timeframe", timeframeFilter);

            const response = await fetch(`/api/admin/logs?${params.toString()}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to fetch logs");
            setLogs(data.logs);
            setPagination(data.pagination);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to load activity logs.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, typeFilter, timeframeFilter, sortOrder]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, typeFilter, timeframeFilter, sortOrder]);

    useEffect(() => {
        fetchData(page);
    }, [fetchData, page]);

    return {
        logs,
        loading,
        error,
        page,
        setPage,
        pagination,
        searchQuery,
        setSearchQuery,
        typeFilter,
        setTypeFilter,
        timeframeFilter,
        setTimeframeFilter,
        sortOrder,
        setSortOrder,
        refresh: () => fetchData(page),
    };
}
