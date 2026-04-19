// ===== SERVICE WORKER V2 — Full Offline Support =====
const CACHE_NAME = 'academia-connect-v3';
const STATIC_ASSETS = [
  '/',
  '/css/main.css',
  '/css/landing.css',
  '/css/auth.css',
  '/css/student.css',
  '/css/teacher.css',
  '/css/parent.css',
  '/css/admin.css',
  '/css/games.css',
  '/css/chat.css',
  '/css/video-feed.css',
  '/js/i18n.js',
  '/js/api.js',
  '/js/ai.js',
  '/js/landing.js',
  '/js/auth.js',
  '/js/student.js',
  '/js/teacher.js',
  '/js/parent.js',
  '/js/admin.js',
  '/js/games.js',
  '/js/chat.js',
  '/js/video-feed.js',
  '/js/offline-sync.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// API routes that should be cached for offline access
const CACHEABLE_API_ROUTES = [
  '/api/student/dashboard',
  '/api/student/tasks',
  '/api/student/results',
  '/api/student/attendance',
  '/api/student/notes',
  '/api/student/materials',
  '/api/student/subjects',
  '/api/common/announcements',
  '/api/common/notifications'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS).catch(err => console.warn('Cache addAll error:', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests for caching (POST/PUT/DELETE go through normally)
  if (event.request.method !== 'GET') {
    event.respondWith(
      fetch(event.request).catch(() => 
        new Response(JSON.stringify({ success: false, message: 'Offline', offline: true }), {
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }
  
  // API routes: network-first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    const isCacheable = CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route));
    
    if (isCacheable) {
      event.respondWith(
        fetch(event.request)
          .then(response => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return response;
          })
          .catch(() => 
            caches.match(event.request).then(cached => 
              cached || new Response(JSON.stringify({ success: false, message: 'Offline', offline: true }), {
                headers: { 'Content-Type': 'application/json' }
              })
            )
          )
      );
    } else {
      event.respondWith(
        fetch(event.request).catch(() => 
          new Response(JSON.stringify({ success: false, message: 'Offline', offline: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
        )
      );
    }
    return;
  }
  
  // Uploads: network-first, no cache
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }
  
  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => caches.match('/'))
  );
});

// Background sync (when supported)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SYNC_OFFLINE_ACTIONS' });
        });
      })
    );
  }
});
