/**
 * Web Push notification delivery.
 * Sends browser push notifications to users with active subscriptions.
 */

import webpush from "web-push";
import { db } from "@/lib/db";

// Configure VAPID details
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@coinkeeper.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: Record<string, unknown>;
}

/**
 * Send a push notification to all subscribed devices for a user.
 * Automatically cleans up invalid/expired subscriptions.
 * Returns the number of notifications successfully sent.
 */
export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("VAPID keys not configured, skipping push notification");
    return 0;
  }

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return 0;
  }

  const jsonPayload = JSON.stringify(payload);
  let sent = 0;
  const staleIds: string[] = [];

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        jsonPayload,
        { TTL: 86400 } // 24 hours
      );
      sent++;
    } catch (error: unknown) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      // 404 or 410 means subscription is no longer valid
      if (statusCode === 404 || statusCode === 410) {
        staleIds.push(sub.id);
      } else {
        console.error(
          `Push notification failed for subscription ${sub.id}:`,
          error
        );
      }
    }
  }

  // Clean up stale subscriptions
  if (staleIds.length > 0) {
    await db.pushSubscription.deleteMany({
      where: { id: { in: staleIds } },
    });
  }

  return sent;
}

/**
 * Send push notification for a newly created in-app notification.
 * Maps notification type to appropriate icon and tag.
 */
export async function sendPushForNotification(
  userId: string,
  notification: {
    type: string;
    title: string;
    message: string;
    priority: string;
  }
): Promise<void> {
  const iconMap: Record<string, string> = {
    low_balance: "⚠️",
    unusual_spending: "📊",
    expense_reminder: "📝",
    transfer_confirmation: "✅",
    system: "🔔",
  };

  try {
    await sendPushNotification(userId, {
      title: notification.title,
      body: notification.message,
      icon: "/icon-192.png",
      badge: "/icon-badge.png",
      tag: notification.type,
      url: "/notifications",
      data: {
        type: notification.type,
        priority: notification.priority,
        emoji: iconMap[notification.type] || "🔔",
      },
    });
  } catch (error) {
    // Push delivery failures should not block notification creation
    console.error("Push notification delivery failed:", error);
  }
}

/**
 * Get the VAPID public key for client-side subscription.
 */
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
