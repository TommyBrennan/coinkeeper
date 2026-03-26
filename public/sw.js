/**
 * CoinKeeper Service Worker
 * Handles push notifications and notification click events.
 */

self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const payload = event.data.json();

    const options = {
      body: payload.body || "",
      icon: payload.icon || "/icon-192.png",
      badge: payload.badge || "/icon-badge.png",
      tag: payload.tag || "coinkeeper",
      data: {
        url: payload.url || "/notifications",
        ...payload.data,
      },
      vibrate: [200, 100, 200],
      requireInteraction: payload.data?.priority === "high",
    };

    event.waitUntil(
      self.registration.showNotification(payload.title || "CoinKeeper", options)
    );
  } catch (err) {
    console.error("Push event handler error:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/notifications";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If there's already an open window, focus it and navigate
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  // Handle subscription refresh by re-subscribing
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription?.options || { userVisibleOnly: true })
      .then((subscription) => {
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
      })
      .catch((err) => {
        console.error("Push subscription change handler error:", err);
      })
  );
});
