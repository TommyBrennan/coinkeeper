/**
 * Client-side push notification utilities.
 * Handles service worker registration, permission requests, and subscription management.
 */

/**
 * Check if push notifications are supported in this browser.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Get the current push notification permission state.
 */
export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Register the service worker if not already registered.
 */
async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  return registration;
}

/**
 * Convert a URL-safe base64 string to a Uint8Array for applicationServerKey.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const outputArray = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    outputArray[i] = raw.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe the current browser to push notifications.
 * Returns true if subscription was successful.
 */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported in this browser");
  }

  // Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }

  try {
    // Get VAPID public key from server
    const keyRes = await fetch("/api/push/vapid-key");
    if (!keyRes.ok) {
      throw new Error("Failed to get VAPID key");
    }
    const { publicKey } = await keyRes.json();

    // Register service worker and subscribe
    const registration = await getServiceWorkerRegistration();

    // Check if already subscribed
    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      // Re-send to server in case it was lost
      await saveSubscription(existing);
      return true;
    }

    const keyArray = urlBase64ToUint8Array(publicKey);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyArray.buffer as ArrayBuffer,
    });

    await saveSubscription(subscription);
    return true;
  } catch (error) {
    console.error("Push subscription failed:", error);
    throw error;
  }
}

/**
 * Unsubscribe the current browser from push notifications.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return false;

    // Remove from server
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    });

    // Unsubscribe locally
    await subscription.unsubscribe();
    return true;
  } catch (error) {
    console.error("Push unsubscription failed:", error);
    throw error;
  }
}

/**
 * Check if the current browser is subscribed to push notifications.
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

/**
 * Save a push subscription to the server.
 */
async function saveSubscription(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      },
    }),
  });

  if (!res.ok) {
    throw new Error("Failed to save push subscription to server");
  }
}
