"use client";

/**
 * useOfflineStatus
 *
 * Returns true when the browser is offline.
 *
 * Reads from OfflineQueueProvider's shared isOffline state which is initialized
 * via useLayoutEffect (before first paint) — so every component gets the correct
 * value immediately, including pages loaded via the offline redirect, with no
 * flash of "online" UI.
 */

import { useOfflineQueue } from "../providers/offline-queue-provider";

export function useOfflineStatus(): boolean {
  return useOfflineQueue().isOffline;
}
