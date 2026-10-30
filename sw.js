/**
 * VIDEM Admin - Progressive Web App Service Worker
 * Cache Version: videm-admin-v1.0.0
 */

const CACHE_NAME = 'videm-admin-shell-v1';

const STATIC_ASSETS = [
  '/admin',
  '/admin.html',
  '/css/admin.css',
  '/js/admin.js',
  '/admin.webmanifest',
  '/manifest.json',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/apple-touch-icon.png',
  '/assets/icons/icon-maskable-512.png'
];

// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[VIDEM SW] Pre-caching offline shell assets...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[VIDEM SW] Pre-cache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[VIDEM SW] Removing outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Bypass Service Worker for API calls and non-GET requests (Always Network First / Only)
  if (
    req.method !== 'GET' ||
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('strem.io') ||
    url.hostname.includes('real-debrid.com') ||
    url.hostname.includes('railway.app') ||
    url.hostname.includes('torrentio.strem.fun')
  ) {
    return; // Dejar que el navegador maneje la solicitud directamente
  }

  // 2. Navigation / HTML pages -> Network first, fallback to cache
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return networkRes;
        })
        .catch(async () => {
          const cachedRes = await caches.match(req);
          if (cachedRes) return cachedRes;
          const adminFallback = await caches.match('/admin.html') || await caches.match('/admin');
          if (adminFallback) return adminFallback;
          return new Response('<h1>VIDEM Admin - Conexión sin internet</h1><p>Verifica tu conexión para sincronizar con Stremio y Real-Debrid.</p>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // 3. Static assets (CSS, JS, Fonts, Icons) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cachedRes) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => cachedRes);

      return cachedRes || fetchPromise;
    })
  );
});
