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

  // 2. Network-First for SPA/HTML navigation with offline cache update (bypasses browser HTTP max-age cache)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(event.request, { cache: 'reload' }))
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, clone);
              cache.put('./index.html', clone.clone());
              cache.put('./', clone.clone());
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const fallback =
            (await cache.match(event.request)) ||
            (await cache.match('./index.html')) ||
            (await cache.match('./')) ||
            (await cache.match('/'));
          return fallback || Response.error();
        })
    );
    return;
  }

  // 3. Static Assets:
  // - Hashed Vite chunks (/assets/*): Cache-First (immutable URLs with content-hash)
  // - Non-hashed assets (CSS/favicons/images): Stale-While-Revalidate (instant load + auto background update)
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const isHashedAsset = url.pathname.includes('/assets/');
      if (cached && isHashedAsset) {
        return cached;
      }

      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== 'opaque') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => cached || Response.error());

      return cached || fetchPromise;
    })
  );
});
