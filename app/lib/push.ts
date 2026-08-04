import webpush from 'web-push';
import { getDb } from '../config/mongodb';

if (
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT
) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('VAPID keys are not set. Web Push will not work.');
}

/**
 * Removes an expired/unsubscribed push endpoint from ALL user documents in MongoDB.
 * Called automatically when we receive a 410 Gone from the push service.
 */
async function pruneExpiredSubscription(endpoint: string): Promise<void> {
  try {
    const db = await getDb();
    const result = await db.collection('users').updateMany(
      { 'pushSubscriptions.endpoint': endpoint },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { $pull: { pushSubscriptions: { endpoint } } as any }
    );
    if (result.modifiedCount > 0) {
      console.log(`[Push] 🧹 Pruned expired subscription from ${result.modifiedCount} user(s): ${endpoint.slice(-30)}`);
    }
  } catch (err) {
    console.error('[Push] Failed to prune expired subscription:', err);
  }
}

export const sendPushNotification = async (
  subscription: webpush.PushSubscription,
  payload: string | Buffer | null
) => {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.error('VAPID keys are not configured');
    return;
  }
  
  try {
    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    // 410 Gone = subscription expired or user unsubscribed — remove it from DB
    if ((error as { statusCode?: number })?.statusCode === 410) {
      console.warn(`[Push] ⚠️ Subscription expired (410). Removing from DB: ${subscription.endpoint.slice(-30)}`);
      await pruneExpiredSubscription(subscription.endpoint);
    } else {
      console.error('Error sending push notification:', error);
    }
    throw error;
  }
};

export const broadcastToSubscriptions = async (
  subscriptions: webpush.PushSubscription[],
  payload: { title: string; body: string; url?: string }
) => {
  if (!subscriptions || subscriptions.length === 0) return;

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      sendPushNotification(sub, JSON.stringify(payload))
    )
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.warn(`${failed.length} push notifications failed to send.`);
  }
};
