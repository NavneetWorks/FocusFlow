// FocusFlow Background Notification Service Worker
const CACHE_NAME = "focusflow-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/src/main.tsx",
  "/src/index.css"
];

// Install Event
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

// Fetch Listener (Pass-through for network first, fallback to cached static files)
self.addEventListener("fetch", (e) => {
  // Pass-through
});

// Background Notification Click Handler
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Focus or open the application tab
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        return client.focus();
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});

// Handle Background Push or Sync events if any
self.addEventListener("sync", (event) => {
  console.log("[Service Worker] Background sync event triggered:", event.tag);
});
