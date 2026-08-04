import { useState, useEffect, useCallback } from 'react';

// Utility to convert Base64 URL-safe string to Uint8Array
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

interface UsePushNotificationsOptions {
  /** API path segment: 'member' or 'admin'. Determines which endpoint is called. */
  role?: 'member' | 'admin';
  /** If true, will automatically attempt to subscribe on mount (after permission is granted). */
  autoSubscribe?: boolean;
}

export const usePushNotifications = (options: UsePushNotificationsOptions = {}) => {
  const { role = 'member', autoSubscribe = false } = options;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const apiPath = role === 'admin'
    ? '/api/admin/push-subscription'
    : '/api/member/push-subscription';

  const subscribe = useCallback(async (reg?: ServiceWorkerRegistration) => {
    const activeReg = reg || registration;
    if (!activeReg) {
      console.warn('[Push] No SW registration available.');
      return;
    }

    try {
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        throw new Error('[Push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set in the build environment.');
      }

      const permission = await Notification.requestPermission();
      console.log('[Push] Notification permission:', permission);
      if (permission !== 'granted') {
        throw new Error('Notification permission denied by user.');
      }

      console.log('[Push] Subscribing to push manager...');
      const sub = await activeReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
      });
      console.log('[Push] Got subscription:', sub.endpoint);

      const res = await fetch(apiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub }),
      });

      const json = await res.json().catch(() => ({}));
      console.log('[Push] Save subscription response:', res.status, json);

      if (!res.ok) {
        throw new Error(`Failed to save subscription: ${res.status} ${json?.error || ''}`);
      }

      setSubscription(sub);
      setIsSubscribed(true);
      console.log('[Push] Subscription saved successfully.');
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Unknown push error');
      setError(err);
      console.error('[Push] Subscribe error:', err.message);
      throw err;
    }
  }, [registration, apiPath]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Web Push is not supported in this browser/context.');
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    setIsSupported(true);

    navigator.serviceWorker.ready.then(async (reg) => {
      setRegistration(reg);
      const existingSub = await reg.pushManager.getSubscription();
      console.log('[Push] Existing subscription found:', !!existingSub);

      if (existingSub) {
        setIsSubscribed(true);
        setSubscription(existingSub);
        setIsLoading(false);
      } else if (autoSubscribe) {
        // Auto-subscribe (used for admins)
        console.log('[Push] Auto-subscribing...');
        try {
          await subscribe(reg);
        } catch {
          // Errors are already logged inside subscribe()
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    }).catch((err) => {
      console.error('[Push] Service worker not ready:', err);
      setIsLoading(false);
    });
  }, [autoSubscribe, subscribe]);

  const unsubscribe = async () => {
    if (!subscription) return;

    try {
      await subscription.unsubscribe();

      await fetch(apiPath, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });

      setSubscription(null);
      setIsSubscribed(false);
      console.log('[Push] Unsubscribed successfully.');
    } catch (e) {
      const err = e instanceof Error ? e : new Error('Unknown push error');
      setError(err);
      console.error('[Push] Unsubscribe error:', err.message);
      throw err;
    }
  };

  return { isSupported, isSubscribed, isLoading, subscription, subscribe, unsubscribe, error };
};
