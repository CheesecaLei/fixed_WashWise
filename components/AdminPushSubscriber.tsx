"use client";

import { usePushNotifications } from "../app/hooks/use-push-notifications";

/**
 * Silently auto-subscribes the logged-in admin to push notifications
 * as soon as they enter the admin panel. No UI is rendered.
 */
export default function AdminPushSubscriber() {
  // autoSubscribe=true will request permission and register on mount
  usePushNotifications({ role: "admin", autoSubscribe: true });
  return null;
}
