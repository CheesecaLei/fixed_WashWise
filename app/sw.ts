import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import {
  Serwist,
  BackgroundSyncPlugin,
  NetworkOnly,
  NetworkFirst,
  StaleWhileRevalidate,
} from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (string | PrecacheEntry)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// ─── SW-local IDB helpers (mirror of offline-order-store, SW-safe) ────────────

const SW_DB = "washwise-offline";
const SW_DB_VER = 2;
const SW_ORDERS = "pending-orders";

function swOpenDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SW_DB, SW_DB_VER);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(SW_ORDERS))
        db.createObjectStore(SW_ORDERS, { keyPath: "id" });
      if (!db.objectStoreNames.contains("cached-services"))
        db.createObjectStore("cached-services");
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(new Error("SW: cannot open IDB"));
  });
}

async function swGetOrder(id: string): Promise<{ attempts: number; maxAttempts: number; nextRetryAt: number } | null> {
  try {
    const db = await swOpenDb();
    return new Promise((resolve) => {
      const tx = db.transaction(SW_ORDERS, "readonly");
      const req = tx.objectStore(SW_ORDERS).get(id);
      req.onsuccess = () => resolve((req.result as { attempts: number; maxAttempts: number; nextRetryAt: number }) ?? null);
      req.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });
  } catch { return null; }
}

async function swUpdateAttempt(id: string, attempts: number, nextRetryAt: number): Promise<void> {
  try {
    const db = await swOpenDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(SW_ORDERS, "readwrite");
      const store = tx.objectStore(SW_ORDERS);
      const get = store.get(id);
      get.onsuccess = () => {
        if (get.result) store.put({ ...get.result, attempts, nextRetryAt, status: "pending" });
        resolve();
      };
      get.onerror = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch { /* ignore */ }
}

async function swMarkExhausted(id: string): Promise<void> {
  try {
    const db = await swOpenDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(SW_ORDERS, "readwrite");
      const store = tx.objectStore(SW_ORDERS);
      const get = store.get(id);
      get.onsuccess = () => {
        if (get.result) store.put({ ...get.result, status: "exhausted" });
        resolve();
      };
      get.onerror = () => resolve();
      tx.oncomplete = () => db.close();
    });
  } catch { /* ignore */ }
}

// ─── Utility: notify all open window clients ──────────────────────────────────

async function notifyClients(message: Record<string, unknown>): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clients = await (self as any).clients.matchAll({ type: "window" });
  for (const client of clients) client.postMessage(message);
}

// ─── Background Sync Plugin ───────────────────────────────────────────────────

const orderSyncPlugin = new BackgroundSyncPlugin("order-sync-queue", {
  maxRetentionTime: 24 * 60, // retain for up to 24 hours

  async onSync({ queue }) {
    // Signal sync start so the UI can show the syncing banner.
    await notifyClients({ type: "ORDER_SYNC_START" });

    const results: { synced: string[]; failed: string[]; exhausted: string[] } = {
      synced: [],
      failed: [],
      exhausted: [],
    };

    let entry;
    while ((entry = await queue.shiftRequest())) {
      const localId = entry.request.headers.get("x-offline-local-id") ?? "";

      // ── Backoff gate ──────────────────────────────────────────────────────
      if (localId) {
        const record = await swGetOrder(localId);
        if (record && record.nextRetryAt > Date.now()) {
          // Too soon — put back and stop processing this cycle.
          await queue.unshiftRequest(entry);
          break;
        }
      }

      // ── Attempt the request ───────────────────────────────────────────────
      try {
        const response = await fetch(entry.request.clone());

        if (response.ok) {
          // Read body once — avoid response.clone() issues in SW context.
          let orderId: string | undefined;
          try {
            const text = await response.text();
            const data = JSON.parse(text) as Record<string, unknown>;
            orderId = typeof data.orderId === "string" ? data.orderId : undefined;
          } catch { /* non-JSON response */ }

          await notifyClients({ type: "ORDER_SYNCED", localId: localId || undefined, orderId });
          if (localId) results.synced.push(localId);

        } else {
          // Non-2xx — apply backoff or exhaust.
          await handleFailedEntry({ queue, entry, localId, results });
        }
      } catch {
        // Network error — apply backoff or exhaust.
        await handleFailedEntry({ queue, entry, localId, results });
      }
    }

    await notifyClients({ type: "ORDER_SYNC_COMPLETE", results });
  },
});

// ─── Shared failure handler (backoff / exhaustion) ────────────────────────────

async function handleFailedEntry({
  queue,
  entry,
  localId,
  results,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queue: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entry: any;
  localId: string;
  results: { synced: string[]; failed: string[]; exhausted: string[] };
}): Promise<void> {
  if (!localId) {
    await queue.unshiftRequest(entry);
    return;
  }

  const record = await swGetOrder(localId);
  const attempts = (record?.attempts ?? 0) + 1;
  const maxAttempts = record?.maxAttempts ?? 5;

  if (attempts >= maxAttempts) {
    // Exhausted — drop from queue, mark in IDB, notify client.
    await swMarkExhausted(localId);
    await notifyClients({ type: "ORDER_SYNC_EXHAUSTED", localId });
    results.exhausted.push(localId);
  } else {
    // Exponential backoff: 30s × 2^(attempts-1), capped at 2 hours.
    const delay = Math.min(30_000 * Math.pow(2, attempts - 1), 7_200_000);
    await swUpdateAttempt(localId, attempts, Date.now() + delay);
    await queue.unshiftRequest(entry);
    results.failed.push(localId);
  }
}

// ─── Offline navigation fallback plugin ──────────────────────────────────────

const offlineFallbackPlugin = {
  async handlerDidError(): Promise<Response | undefined> {
    const cache = await caches.open("pages-v2");
    const cached = await cache.match("/member/new-order");
    if (cached) return cached;

    return new Response(
      '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<title>Offline — WashWise</title>' +
      '<style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc}' +
      '.card{text-align:center;padding:2rem;border-radius:1rem;background:#fff;box-shadow:0 4px 24px rgba(0,0,0,.08)}' +
      'h2{margin:0 0 .5rem;color:#1e293b}p{color:#64748b;margin:0 0 1.5rem}' +
      'button{padding:.6rem 1.5rem;border-radius:.5rem;border:none;background:#2563eb;color:#fff;font-size:1rem;cursor:pointer;font-weight:600}' +
      'button:hover{background:#1d4ed8}</style></head>' +
      '<body><div class="card"><h2>You\'re offline</h2>' +
      '<p>Reconnect to use WashWise.</p>' +
      '<button onclick="location.reload()">Try Again</button>' +
      '</div></body></html>',
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  },
};

// ─── Serwist instance ─────────────────────────────────────────────────────────

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    // Order & transaction POSTs — Background Sync + synthetic queued response.
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/api/member/order") ||
        url.pathname.startsWith("/api/member/transaction"),
      method: "POST",
      handler: new NetworkOnly({
        plugins: [
          orderSyncPlugin,
          {
            async handlerDidError() {
              // BackgroundSyncPlugin has already queued the request.
              // Return a synthetic 202 so the FetchEvent never rejects.
              return new Response(
                JSON.stringify({ success: true, orderId: "offline-queued", queued: true }),
                { status: 202, headers: { "Content-Type": "application/json" } }
              );
            },
          },
        ],
      }),
    },

    // Services list — served from cache when offline.
    {
      matcher: ({ url }) => url.pathname === "/api/services",
      handler: new StaleWhileRevalidate({ cacheName: "services-v1" }),
    },

    // Page navigations — NetworkFirst with offline fallback.
    {
      matcher: ({ request }) =>
        request.mode === "navigate" || request.destination === "document",
      handler: new NetworkFirst({
        cacheName: "pages-v2",
        plugins: [offlineFallbackPlugin],
      }),
    },

    ...defaultCache,
  ],
});

serwist.addEventListeners();

// ─── Web Push Event Listeners ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sw = self as any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
sw.addEventListener("push", (event: any) => {
  const data = event.data?.json() ?? {};
  const title = data.title || "WashWise Update";
  const options = {
    body: data.body || "You have a new notification.",
    icon: "/icons/icon-192x192.png", // Ensure this path matches your public folder icon
    badge: "/icons/icon-192x192.png",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(sw.registration.showNotification(title, options));
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
sw.addEventListener("notificationclick", (event: any) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, sw.location.origin).href;

  event.waitUntil(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sw.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients: any[]) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      if (sw.clients.openWindow) {
        return sw.clients.openWindow(urlToOpen);
      }
    })
  );
});
