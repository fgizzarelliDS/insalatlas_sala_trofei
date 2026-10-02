const CACHE_NAME = 'insalatlas-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/themes.css',
  './css/layout.css',
  './favicon.png',
  './favicon-32x32.png',
  './favicon-64x64.png',
  './favicon-192x192.png',
  './favicon-512x512.png',
  './favicon-192x192-maskable.png',
  './favicon-512x512-maskable.png',
  './apple-touch-icon.png',
  './preview.png',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA: pre-cache non critico fallito:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET requests and browser extensions
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 1. Stale-While-Revalidate for data.json
  if (url.pathname.endsWith('data.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // 2. Navigation fallback for SPA/HTML
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const fallback = await cache.match('./index.html') || await cache.match('/');
        return fallback || Response.error();
      })
    );
    return;
  }

  // 3. Cache-First for static assets (scripts, styles, images, fonts)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache successfully fetched same-origin or CDN resources
        if (response && response.status === 200 && response.type !== 'opaque') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // Silent catch for broken images/fonts when offline
        return cached || Response.error();
      });
    })
  );
});
