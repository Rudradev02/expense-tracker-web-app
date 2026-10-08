const CACHE_VERSION = 'v1.0.0';
const SHELL_CACHE_NAME = `expense-tracker-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `expense-tracker-runtime-${CACHE_VERSION}`;
const API_CACHE_NAME = `expense-tracker-api-${CACHE_VERSION}`;

// Core static assets required for offline app shell
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-192-maskable.png',
  '/icons/icon-512-maskable.png',
  '/icons/icon.svg',
];

// ─────────────────────────────────────────────────────────────
// INSTALLATION
// ─────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Auto-activate on first install
  self.skipWaiting();
});

// ─────────────────────────────────────────────────────────────
// ACTIVATION: Purge stale caches and claim clients immediately
// ─────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const currentCaches = [SHELL_CACHE_NAME, RUNTIME_CACHE_NAME, API_CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            if (!currentCaches.includes(name)) {
              return caches.delete(name);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ─────────────────────────────────────────────────────────────
// MESSAGE: Allow clients to trigger skipWaiting on update
// ─────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─────────────────────────────────────────────────────────────
// HELPER: Check if a request is an API call
// ─────────────────────────────────────────────────────────────
function isApiRequest(url) {
  const pathname = url.pathname;
  return (
    pathname.startsWith('/api') ||
    pathname.startsWith('/transactions') ||
    pathname.startsWith('/summary') ||
    pathname.startsWith('/categories') ||
    pathname.startsWith('/budgets') ||
    pathname.startsWith('/recurring-rules') ||
    pathname.startsWith('/insights') ||
    pathname.startsWith('/forecast') ||
    pathname.startsWith('/suggest-category') ||
    pathname.startsWith('/scan-receipt') ||
    pathname.startsWith('/goals')
  );
}

// ─────────────────────────────────────────────────────────────
// FETCH: Network-first for APIs, Cache-first for shell & assets
// ─────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Bypass non-GET requests for custom caching (let browser handle mutation directly)
  if (request.method !== 'GET') {
    return;
  }

  // 1. API Endpoints: Network-First with graceful offline fallback
  if (isApiRequest(url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // If valid response, clone and cache for offline reading
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Network failed (offline): try cached API response
          const cachedResponse = await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }

          // Return structured JSON with offline status
          return new Response(
            JSON.stringify({
              error: 'Offline',
              message: 'You are currently offline. Cached data will sync once your connection is restored.',
              offline: true,
            }),
            {
              status: 503,
              statusText: 'Service Unavailable (Offline)',
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
    );
    return;
  }

  // 2. Navigation Requests (HTML pages / SPA routing)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedIndex = await caches.match('/index.html');
        if (cachedIndex) {
          return cachedIndex;
        }
        return caches.match('/');
      })
    );
    return;
  }

  // 3. Static Assets (Scripts, Styles, Fonts, Images): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
