/**
 * offline-order-store.ts
 *
 * IndexedDB wrapper for orders queued while offline.
 * Database : washwise-offline  (version 2)
 * Stores   : pending-orders (keyPath: "id"), cached-services
 */

import type { CreateOrderRequest } from "../types/new-order";

export type PendingOrderStatus = "pending" | "syncing" | "failed" | "exhausted";

export type PendingOrder = {
  /** Client-generated UUID — correlates SW postMessages to this record. */
  id: string;
  payload: CreateOrderRequest;
  /** Unix timestamp (ms) when the order was queued. */
  queuedAt: number;
  status: PendingOrderStatus;
  /** Number of sync attempts made so far. */
  attempts: number;
  /** Maximum attempts before the order is marked exhausted. */
  maxAttempts: number;
  /** Unix ms — do not retry before this time (exponential backoff). */
  nextRetryAt: number;
};

const DB_NAME = "washwise-offline";
const DB_VERSION = 2;
const STORE_NAME = "pending-orders";

// ─── Internal helpers ─────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("cached-services")) {
        db.createObjectStore("cached-services");
      }
    };

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => reject((event.target as IDBOpenDBRequest).error);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = callback(store);

        request.onsuccess = (event) => resolve((event.target as IDBRequest<T>).result);
        request.onerror = (event) => reject((event.target as IDBRequest).error);

        tx.oncomplete = () => db.close();
        tx.onerror = (event) => reject((event.target as IDBTransaction).error);
      }),
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Saves a new pending order to IndexedDB and returns its local id. */
export async function enqueueOrder(payload: CreateOrderRequest): Promise<string> {
  const id = crypto.randomUUID();
  const record: PendingOrder = {
    id,
    payload,
    queuedAt: Date.now(),
    status: "pending",
    attempts: 0,
    maxAttempts: 5,
    nextRetryAt: 0,
  };

  await withStore<IDBValidKey>("readwrite", (store) => store.put(record));
  return id;
}

/** Returns all pending orders sorted oldest-first. */
export function getPendingOrders(): Promise<PendingOrder[]> {
  return openDb().then(
    (db) =>
      new Promise<PendingOrder[]>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = (event) => {
          const records = (event.target as IDBRequest<PendingOrder[]>).result;
          resolve(records.sort((a, b) => a.queuedAt - b.queuedAt));
        };
        request.onerror = (event) => reject((event.target as IDBRequest).error);

        tx.oncomplete = () => db.close();
        tx.onerror = (event) => reject((event.target as IDBTransaction).error);
      }),
  );
}

/** Returns a single pending order by its local id, or null. */
export function getOrderById(id: string): Promise<PendingOrder | null> {
  return openDb().then(
    (db) =>
      new Promise<PendingOrder | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(id) as IDBRequest<PendingOrder | undefined>;

        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);

        tx.oncomplete = () => db.close();
      }),
  );
}

/** Increments attempt count and sets next retry timestamp (exponential backoff). */
export async function updateOrderAttempt(id: string, nextRetryAt: number): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const get = store.get(id) as IDBRequest<PendingOrder | undefined>;

        get.onsuccess = () => {
          if (get.result) {
            store.put({
              ...get.result,
              attempts: (get.result.attempts ?? 0) + 1,
              nextRetryAt,
              status: "pending",
            });
          }
          resolve();
        };
        get.onerror = () => reject(get.error);

        tx.oncomplete = () => db.close();
        tx.onerror = (event) => reject((event.target as IDBTransaction).error);
      }),
  );
}

/** Marks an order as exhausted (max retries reached). */
export async function markOrderExhausted(id: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const get = store.get(id) as IDBRequest<PendingOrder | undefined>;

        get.onsuccess = () => {
          if (get.result) {
            store.put({ ...get.result, status: "exhausted" });
          }
          resolve();
        };
        get.onerror = () => reject(get.error);

        tx.oncomplete = () => db.close();
        tx.onerror = (event) => reject((event.target as IDBTransaction).error);
      }),
  );
}

/** Resets an exhausted/failed order for manual re-submission. */
export async function resetOrderForResubmit(id: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const get = store.get(id) as IDBRequest<PendingOrder | undefined>;

        get.onsuccess = () => {
          if (get.result) {
            store.put({
              ...get.result,
              status: "pending",
              attempts: 0,
              nextRetryAt: 0,
            });
          }
          resolve();
        };
        get.onerror = () => reject(get.error);

        tx.oncomplete = () => db.close();
        tx.onerror = (event) => reject((event.target as IDBTransaction).error);
      }),
  );
}

/** Removes a single pending order by its local id. */
export async function removeOrder(id: string): Promise<void> {
  await withStore<undefined>("readwrite", (store) => store.delete(id));
}

/** Removes all pending orders (e.g. for a hard reset / logout). */
export async function clearAllPendingOrders(): Promise<void> {
  await withStore<undefined>("readwrite", (store) => store.clear());
}
