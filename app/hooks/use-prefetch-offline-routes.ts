"use client";

import { useEffect } from "react";

/**
 * Warms the SW caches for the new-order route while the user is online.
 * Inspired by usePrefetchOfflineInspectionRoutes (FTL Inspector).
 *
 * Call this once inside a component that is mounted early (e.g. OfflineQueueProvider).
 */
export function usePrefetchOfflineRoutes() {
  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.onLine ||
      !("serviceWorker" in navigator)
    ) return;

    // Warm /api/services into the services-v1 SW cache.
    fetch("/api/services", { credentials: "include" }).catch(() => {});

    // Warm /member/new-order HTML into the pages-v2 SW cache
    // so it's available if the user goes offline before navigating there.
    fetch("/member/new-order", { credentials: "include" }).catch(() => {});
  }, []);
}
