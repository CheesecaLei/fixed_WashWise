"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReportMetric, ServiceReport } from "../types/dashboard";

export function useReports() {
    const [metrics, setMetrics] = useState<ReportMetric[]>([]);
    const [serviceReports, setServiceReports] = useState<ServiceReport[]>([]);
    const [checkouts, setCheckouts] = useState<{ finalTotal?: number; paymentStatus?: string; createdAt?: string }[]>([]);
    const [weightToday, setWeightToday] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [timeframe, setTimeframe] = useState<"all" | "week" | "month" | "annual">("all");
    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");

    const fetchData = useCallback(async (tf: string = timeframe) => {
        try {
            setLoading(true);
            const params = new URLSearchParams({ timeframe: tf });
            if (fromDate && toDate) {
                params.set("from", fromDate);
                params.set("to", toDate);
            }
            const response = await fetch(`/api/admin/report-gen?${params.toString()}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to fetch reports");
            setMetrics(data.metrics);
            setServiceReports(data.serviceReports);
            setCheckouts(data.checkouts || []);
            setWeightToday(data.weightToday || 0);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to load report data.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [timeframe, fromDate, toDate]);

    useEffect(() => {
        fetchData(timeframe);
    }, [fetchData, timeframe, fromDate, toDate]);

    const downloadExcel = (timeFilter: "all" | "month" | "week" = "all") => {
        if (checkouts.length === 0 && serviceReports.length === 0) return;

        let filteredCheckouts = checkouts;
        const now = new Date();
        if (fromDate && toDate) {
            const start = new Date(fromDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(toDate);
            end.setHours(23, 59, 59, 999);
            filteredCheckouts = checkouts.filter(c => {
                if (!c.createdAt) return false;
                const d = new Date(c.createdAt);
                return d >= start && d <= end;
            });
        } else if (timeFilter === "month") {
            filteredCheckouts = checkouts.filter(c => {
                if (!c.createdAt) return false;
                const d = new Date(c.createdAt);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
        } else if (timeFilter === "week") {
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filteredCheckouts = checkouts.filter(c => {
                if (!c.createdAt) return false;
                return new Date(c.createdAt) >= weekAgo;
            });
        }

        // Dynamically import xlsx-js-style for full cell styling
        import("xlsx-js-style").then((XLSX) => {
            const workbook = XLSX.utils.book_new();

            // --- STYLES DEFINITION ---
            const borderThin = {
                top: { style: "thin", color: { rgb: "E2E8F0" } },
                bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                left: { style: "thin", color: { rgb: "E2E8F0" } },
                right: { style: "thin", color: { rgb: "E2E8F0" } },
            };

            const titleBannerStyle = {
                fill: { fgColor: { rgb: "0284C7" } }, // Primary WashWise Blue
                font: { name: "Segoe UI", sz: 14, bold: true, color: { rgb: "FFFFFF" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "medium", color: { rgb: "0369A1" } },
                    bottom: { style: "thin", color: { rgb: "38BDF8" } },
                    left: { style: "medium", color: { rgb: "0369A1" } },
                    right: { style: "medium", color: { rgb: "0369A1" } },
                },
            };

            const subtitleBannerStyle = {
                fill: { fgColor: { rgb: "0369A1" } }, // Deep Navy Accent
                font: { name: "Segoe UI", sz: 10, italic: true, color: { rgb: "E0F2FE" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "38BDF8" } },
                    bottom: { style: "medium", color: { rgb: "0284C7" } },
                    left: { style: "medium", color: { rgb: "0369A1" } },
                    right: { style: "medium", color: { rgb: "0369A1" } },
                },
            };

            const tableHeaderStyle = {
                fill: { fgColor: { rgb: "0284C7" } }, // Primary WashWise Blue
                font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "FFFFFF" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "0284C7" } },
                    bottom: { style: "medium", color: { rgb: "0369A1" } },
                    left: { style: "thin", color: { rgb: "0284C7" } },
                    right: { style: "thin", color: { rgb: "0284C7" } },
                },
            };

            const evenRowStyle = {
                fill: { fgColor: { rgb: "F8FAFC" } },
                font: { name: "Segoe UI", sz: 10, color: { rgb: "1E293B" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: borderThin,
            };

            const oddRowStyle = {
                fill: { fgColor: { rgb: "FFFFFF" } },
                font: { name: "Segoe UI", sz: 10, color: { rgb: "1E293B" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: borderThin,
            };

            const currencyStyleEven = {
                ...evenRowStyle,
                alignment: { horizontal: "right", vertical: "center" },
                font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "0F172A" } },
            };

            const currencyStyleOdd = {
                ...oddRowStyle,
                alignment: { horizontal: "right", vertical: "center" },
                font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "0F172A" } },
            };

            const paidStatusStyle = {
                fill: { fgColor: { rgb: "DCFCE7" } },
                font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "15803D" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: borderThin,
            };

            const pendingStatusStyle = {
                fill: { fgColor: { rgb: "FEF3C7" } },
                font: { name: "Segoe UI", sz: 10, bold: true, color: { rgb: "B45309" } },
                alignment: { horizontal: "center", vertical: "center" },
                border: borderThin,
            };

            const totalLabelStyle = {
                fill: { fgColor: { rgb: "E0F2FE" } },
                font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "0369A1" } },
                alignment: { horizontal: "left", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "0284C7" } },
                    bottom: { style: "double", color: { rgb: "0284C7" } },
                    left: { style: "thin", color: { rgb: "BAE6FD" } },
                    right: { style: "thin", color: { rgb: "BAE6FD" } },
                },
            };

            const totalValueStyle = {
                fill: { fgColor: { rgb: "E0F2FE" } },
                font: { name: "Segoe UI", sz: 11, bold: true, color: { rgb: "0369A1" } },
                alignment: { horizontal: "right", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "0284C7" } },
                    bottom: { style: "double", color: { rgb: "0284C7" } },
                    left: { style: "thin", color: { rgb: "BAE6FD" } },
                    right: { style: "thin", color: { rgb: "BAE6FD" } },
                },
            };

            // --- SHEET 1: INCOME SUMMARY ---
            const filterLabel = fromDate && toDate ? `${fromDate} to ${toDate}` : timeframe.toUpperCase();
            
            const wsData: any[][] = [
                [
                    { v: "WASHWISE LAUNDRY SERVICES — FINANCIAL INCOME REPORT", s: titleBannerStyle },
                    { v: "", s: titleBannerStyle },
                    { v: "", s: titleBannerStyle }
                ],
                [
                    { v: `Report Generated: ${new Date().toLocaleString()} | Period Filter: ${filterLabel}`, s: subtitleBannerStyle },
                    { v: "", s: subtitleBannerStyle },
                    { v: "", s: subtitleBannerStyle }
                ],
                ["", "", ""],
                [
                    { v: "Transaction Date", s: tableHeaderStyle },
                    { v: "Income (PHP)", s: tableHeaderStyle },
                    { v: "Payment Status", s: tableHeaderStyle }
                ]
            ];

            let totalIncome = 0;
            filteredCheckouts.forEach((c, idx) => {
                const isEven = idx % 2 === 0;
                const amount = Number(c.finalTotal || 0);
                totalIncome += amount;

                const isPaid = (c.paymentStatus || "").toLowerCase() === "paid";
                const dateStr = c.createdAt
                    ? new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
                    : "N/A";

                wsData.push([
                    { v: dateStr, s: isEven ? evenRowStyle : oddRowStyle },
                    { v: amount, t: "n", z: '"₱"#,##0.00', s: isEven ? currencyStyleEven : currencyStyleOdd },
                    { v: isPaid ? "Realized (Paid)" : "Pending", s: isPaid ? paidStatusStyle : pendingStatusStyle }
                ]);
            });

            wsData.push(["", "", ""]);
            wsData.push([
                { v: "TOTAL PERIOD INCOME", s: totalLabelStyle },
                { v: totalIncome, t: "n", z: '"₱"#,##0.00', s: totalValueStyle },
                { v: "", s: totalLabelStyle }
            ]);

            const ws = XLSX.utils.aoa_to_sheet(wsData);
            
            // Merge header title and subtitle across columns A1:C1 and A2:C2
            ws["!merges"] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }
            ];

            // Set custom row heights
            ws["!rows"] = [
                { hpt: 32 }, // Title Banner
                { hpt: 22 }, // Subtitle Banner
                { hpt: 10 }, // Spacer
                { hpt: 26 }  // Table Header
            ];

            ws["!cols"] = [
                { wch: 32 },
                { wch: 22 },
                { wch: 22 }
            ];

            // --- SHEET 2: SERVICE BREAKDOWN ---
            const serviceWsData: any[][] = [
                [
                    { v: "WASHWISE LAUNDRY SERVICES — SERVICE PERFORMANCE BREAKDOWN", s: titleBannerStyle },
                    { v: "", s: titleBannerStyle },
                    { v: "", s: titleBannerStyle },
                    { v: "", s: titleBannerStyle }
                ],
                [
                    { v: `Report Generated: ${new Date().toLocaleString()} | Period Filter: ${filterLabel}`, s: subtitleBannerStyle },
                    { v: "", s: subtitleBannerStyle },
                    { v: "", s: subtitleBannerStyle },
                    { v: "", s: subtitleBannerStyle }
                ],
                ["", "", "", ""],
                [
                    { v: "Service Name", s: tableHeaderStyle },
                    { v: "Total Orders", s: tableHeaderStyle },
                    { v: "Total Income (PHP)", s: tableHeaderStyle },
                    { v: "Average Order Value (PHP)", s: tableHeaderStyle }
                ]
            ];

            serviceReports.forEach((s, idx) => {
                const isEven = idx % 2 === 0;
                const rev = parseFloat(s.revenue.replace(/[^0-9.-]+/g, "")) || 0;
                const avg = parseFloat(s.average.replace(/[^0-9.-]+/g, "")) || 0;

                serviceWsData.push([
                    { v: s.name, s: { ...(isEven ? evenRowStyle : oddRowStyle), alignment: { horizontal: "left", vertical: "center" } } },
                    { v: s.orders, t: "n", s: isEven ? evenRowStyle : oddRowStyle },
                    { v: rev, t: "n", z: '"₱"#,##0.00', s: isEven ? currencyStyleEven : currencyStyleOdd },
                    { v: avg, t: "n", z: '"₱"#,##0.00', s: isEven ? currencyStyleEven : currencyStyleOdd }
                ]);
            });

            const serviceWs = XLSX.utils.aoa_to_sheet(serviceWsData);
            
            // Merge service header title and subtitle across A1:D1 and A2:D2
            serviceWs["!merges"] = [
                { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
                { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }
            ];

            serviceWs["!rows"] = [
                { hpt: 32 },
                { hpt: 22 },
                { hpt: 10 },
                { hpt: 26 }
            ];

            serviceWs["!cols"] = [
                { wch: 32 },
                { wch: 18 },
                { wch: 24 },
                { wch: 28 }
            ];

            XLSX.utils.book_append_sheet(workbook, ws, "Income Summary");
            XLSX.utils.book_append_sheet(workbook, serviceWs, "Service Breakdown");

            const fileName = `washwise-financial-report-${new Date().toISOString().split("T")[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
        }).catch((err) => {
            console.error("Failed to export Excel file via xlsx-js-style library:", err);
        });
    };

    return {
        metrics,
        serviceReports,
        checkouts,
        weightToday,
        loading,
        error,
        timeframe,
        setTimeframe,
        fromDate,
        setFromDate,
        toDate,
        setToDate,
        refresh: () => fetchData(timeframe),
        downloadExcel,
    };
}
