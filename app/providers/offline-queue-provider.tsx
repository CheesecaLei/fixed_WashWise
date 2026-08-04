"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

// Safe layout effect — useLayoutEffect on client, useEffect during SSR.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  clearAllPendingOrders,
  enqueueOrder,
  getPendingOrders,
  removeOrder,
  resetOrderForResubmit,
  type PendingOrder,
} from "../lib/offline-order-store";
import type { CreateOrderRequest } from "../types/new-order";
import { usePrefetchOfflineRoutes } from "../hooks/use-prefetch-offline-routes";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SyncState = "idle" | "syncing" | "complete" | "partial" | "attention";

type OfflineQueueContextValue = {
  /** Single source of truth for network status — initialized before first paint. */
  isOffline: boolean;
  pendingOrders: PendingOrder[];
  pendingCount: number;
  syncState: SyncState;
  /** Server orderId from the most recently synced order — used to navigate to checkout. */
  lastSyncedOrderId: string | null;
  /** localIds of orders that exhausted all retry attempts and need manual re-submission. */
  exhaustedOrderIds: string[];
  addPendingOrder: (payload: CreateOrderRequest) => Promise<string>;
  removePendingOrder: (id: string) => Promise<void>;
  /** Re-queues an exhausted order for another round of sync attempts. */
  resubmitOrder: (localId: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  dismissSyncBanner: () => void;
};

// ─── Context ──────────────────────────────────────────────────────────────────

const OfflineQueueContext = createContext<OfflineQueueContextValue | null>(null);

// ─── SW message shapes ────────────────────────────────────────────────────────

type SwMessage =
  | { type: "ORDER_SYNC_START" }
  | { type: "ORDER_SYNCED"; localId?: string; orderId?: string }
  | { type: "ORDER_SYNC_EXHAUSTED"; localId: string }
  | { type: "ORDER_SYNC_COMPLETE"; results: { synced: string[]; failed: string[]; exhausted: string[] } }
  | { type: string; [key: string]: unknown };

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OfflineQueueProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isOffline, setIsOffline] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSyncedOrderId, setLastSyncedOrderId] = useState<string | null>(null);
  const [exhaustedOrderIds, setExhaustedOrderIds] = useState<string[]>([]);
  const listenerAttached = useRef(false);

  // Warm SW caches for /member/new-order and /api/services while online.
  usePrefetchOfflineRoutes();

  // ── Single source of truth for network status ──────────────────────────────
  // useIsomorphicLayoutEffect reads navigator.onLine before the first paint so
  // every consumer of useOfflineQueue() sees the correct value immediately —
  // no flash of "online" UI when the page loads while already offline.
  useIsomorphicLayoutEffect(() => {
    setIsOffline(!navigator.onLine);

    const handleOffline = () => {
      setIsOffline(true);
      toast.info("📵 You're offline — orders will be queued and submitted automatically when you reconnect.", {
        autoClose: 6000,
        toastId: "offline-status",
      });
    };

    const handleOnline = () => {
      setIsOffline(false);
      toast.dismiss("offline-status");
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // ── Load from IDB on mount ─────────────────────────────────────────────────
  useEffect(() => {
    getPendingOrders()
      .then(setPendingOrders)
      .catch(() => { /* IDB unavailable (SSR / private-mode) */ });
  }, []);

  // ── SW message listener ───────────────────────────────────────────────────
  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator) ||
      listenerAttached.current
    ) return;

    const handleMessage = (event: MessageEvent<SwMessage>) => {
      const msg = event.data;
      if (!msg?.type?.startsWith("ORDER_")) return;

      switch (msg.type) {

        case "ORDER_SYNC_START":
          setSyncState("syncing");
          break;

        case "ORDER_SYNCED": {
          const { localId } = msg as { type: string; localId?: string; orderId?: string };

          // Clean up IDB record.
          if (localId && typeof localId === "string") {
            removeOrder(localId).catch(() => {});
            setPendingOrders((prev) => prev.filter((o) => o.id !== localId));
          } else {
            getPendingOrders().then(setPendingOrders).catch(() => {});
          }

          fetch("/api/member/order?status=draft", { credentials: "include" })
            .then((res) => res.json())
            .then((data: { success: boolean; orderId?: string }) => {
              const resolvedOrderId = data.success ? data.orderId : undefined;
              if (resolvedOrderId) {
                setLastSyncedOrderId(resolvedOrderId);
                setSyncState("complete");
              }
            })
            .catch(() => {
              // Silently fail or handle error — banner/modal won't show without orderId
            });

          break;
        }

        case "ORDER_SYNC_EXHAUSTED": {
          const { localId } = msg as { type: string; localId: string };
          if (localId && typeof localId === "string") {
            setExhaustedOrderIds((prev) =>
              prev.includes(localId) ? prev : [...prev, localId]
            );
            setSyncState("attention");
          }
          break;
        }

        case "ORDER_SYNC_COMPLETE": {
          const { results } = msg as {
            type: string;
            results: { synced: string[]; failed: string[]; exhausted: string[] };
          };

          // Determine final banner state from results.
          if (results.exhausted.length > 0) {
            setSyncState("attention");
          } else if (results.failed.length > 0) {
            setSyncState("partial");
          } else if (results.synced.length > 0) {
            setSyncState("complete");
          } else {
            setSyncState("idle");
          }
          break;
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);
    listenerAttached.current = true;

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      listenerAttached.current = false;
    };
  }, [router]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const addPendingOrder = useCallback(async (payload: CreateOrderRequest) => {
    const id = await enqueueOrder(payload);
    const updated = await getPendingOrders();
    setPendingOrders(updated);
    return id;
  }, []);

  const removePendingOrder = useCallback(async (id: string) => {
    await removeOrder(id);
    setPendingOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const resubmitOrder = useCallback(async (localId: string) => {
    // Find the original payload in IDB.
    const orders = await getPendingOrders();
    const order = orders.find((o) => o.id === localId);
    if (!order) return;

    // Reset attempts so the sync engine treats it as fresh.
    await resetOrderForResubmit(localId);
    setPendingOrders((prev) =>
      prev.map((o) => o.id === localId ? { ...o, status: "pending", attempts: 0, nextRetryAt: 0 } : o)
    );

    // Remove from exhausted list.
    setExhaustedOrderIds((prev) => prev.filter((id) => id !== localId));

    // Re-fire the fetch — the SW BackgroundSyncPlugin will re-queue it.
    fetch("/api/member/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-offline-local-id": localId,
      },
      body: JSON.stringify(order.payload),
    }).catch(() => {});
  }, []);

  const clearQueue = useCallback(async () => {
    await clearAllPendingOrders();
    setPendingOrders([]);
    setExhaustedOrderIds([]);
  }, []);

  const dismissSyncBanner = useCallback(() => {
    setSyncState("idle");
    setLastSyncedOrderId(null);
  }, []);

  return (
    <OfflineQueueContext.Provider
      value={{
        isOffline,
        pendingOrders,
        pendingCount: pendingOrders.length,
        syncState,
        lastSyncedOrderId,
        exhaustedOrderIds,
        addPendingOrder,
        removePendingOrder,
        resubmitOrder,
        clearQueue,
        dismissSyncBanner,
      }}
    >
      {children}
    </OfflineQueueContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOfflineQueue() {
  const ctx = useContext(OfflineQueueContext);
  if (!ctx) throw new Error("useOfflineQueue must be used inside <OfflineQueueProvider>");
  return ctx;
}
