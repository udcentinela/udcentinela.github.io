/**
 * UD Centinela - Service Worker PWA & Modo Estadio Offline
 * Version: 20260824_all_30_jornadas_v1
 */

const CACHE_NAME = 'udc-cache-v20260824_all_30_jornadas_v1';
const DATA_CACHE_NAME = 'udc-data-cache-v20260824_all_30_jornadas_v1';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/regional/',
  '/regional/index.html',
  '/calendario/',
  '/calendario/index.html',
  '/noticias/',
  '/noticias/index.html',
  '/historia/',
  '/identidad/',
  '/patrocinios/',
  '/patrocinios/index.html',
  '/offline.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/assets/css/site.css',
  '/assets/css/common.css',
  '/assets/site-motion.js',
  '/assets/js/mobile-nav.js',
  '/assets/js/likes-system.js',
  '/assets/js/player-stats.js',
  '/assets/js/news-renderer.js',
  '/assets/js/pwa-manager.js',
  '/assets/data/calendar.json',
  '/assets/data/players.json',
  '/assets/data/news.json',
  '/assets/img/icon-192.png',
  '/assets/img/icon-512.png',
  '/assets/img/icon-maskable-512.png',
  '/assets/img/logo-nav.webp',
  '/assets/img/logo-hero.webp',
  '/assets/img/logo-social.jpg',
  '/assets/img/sebas.webp',
  '/assets/img/aday.webp',
  '/assets/img/pablo.webp',
  '/assets/img/adrian-tejera.webp',
  '/assets/img/iriome.webp'
];

// 1. Install Event: Precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[UDC SW] Precaching assets de la web y modo estadio...');
      return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' }))).catch((err) => {
        console.warn('[UDC SW] Advertencia precaching:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// 2. Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
            console.log('[UDC SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Fetch Event: Intelligent Offline Routing
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ignore non-GET and third-party tracking/analytics/API hits
  if (req.method !== 'GET') return;
  if (url.origin !== self.location.origin) {
    // External fonts (Google Fonts, cdnjs gsap) -> Stale-while-revalidate
    if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com') || url.origin.includes('cdnjs.cloudflare.com')) {
      event.respondWith(
        caches.match(req).then((cached) => {
          const fetched = fetch(req).then((response) => {
            if (response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return response;
          }).catch(() => cached);
          return cached || fetched;
        })
      );
    }
    return;
  }

  // Strategy A: JSON Data (/assets/data/*.json) -> Network-first with Cache fallback
  if (url.pathname.startsWith('/assets/data/') && url.pathname.endsWith('.json')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match(req).then((cachedRes) => {
            if (cachedRes) return cachedRes;
            return new Response(JSON.stringify({ error: 'offline', offline: true }), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Strategy B: HTML Navigation / Pages -> Network-first with Offline Stadium Fallback
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((networkRes) => {
          if (networkRes.ok) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(async () => {
          const cachedRes = await caches.match(req);
          if (cachedRes) return cachedRes;

          // Try matching pathname directory (e.g. /calendario/ -> /calendario/index.html)
          const cleanPath = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname + '/index.html';
          const dirCached = await caches.match(cleanPath);
          if (dirCached) return dirCached;

          // Fallback to offline stadium screen
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || new Response('Sin conexión a internet. Modo Estadio UD Centinela.', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Strategy C: Static Assets (CSS, JS, WebP Images) -> Stale-While-Revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkRes;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
