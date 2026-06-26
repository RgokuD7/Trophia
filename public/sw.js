const CACHE_NAME = "trophia-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/logo.png",
  "/manifest.json"
];

// Install Event - Pre-cache essential shells
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Network first, fallback to Cache
self.addEventListener("fetch", (e) => {
  if (!e.request.url.startsWith("http")) return;

  // Crucial Safety Bypass for Local Development (Vite HMR, WebSockets, Node Modules)
  if (
    e.request.url.includes("localhost") || 
    e.request.url.includes("@vite") || 
    e.request.url.includes("hmr") || 
    e.request.url.includes("node_modules")
  ) {
    return; // Let browser load natively without caching during development
  }

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful requests dynamically
        if (res.status === 200 && e.request.method === "GET") {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, resClone);
          });
        }
        return res;
      })
      .catch(() => {
        // Fallback to cache if network fails (offline support)
        return caches.match(e.request);
      })
  );
});

// Push Event - Receive notification from server
self.addEventListener("push", (e) => {
  let data = { title: "Trophia", body: "¡Es hora de registrar tus comidas y agua de hoy!" };
  if (e.data) {
    try {
      data = e.data.json();
    } catch (err) {
      data = { title: "Trophia", body: e.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: "/logo.png",
    badge: "/logo.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event - Open app or focus tab
self.addEventListener("notificationclick", (e) => {
  const notification = e.notification;
  notification.close();

  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) {
          return client.focus();
        }
      }
      // Or open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow("/");
      }
    })
  );
});

