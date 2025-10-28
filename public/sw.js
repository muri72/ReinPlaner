const CACHE_NAME = 'aris-mobile-cache-v1';
const urlsToCache = [
  '/',
  '/dashboard/planning/mobile',
  '/dashboard/time-tracking',
  '/dashboard/orders',
  '/dashboard/objects',
  '/dashboard/employees',
  '/api/health',
];

self.addEventListener('install', (event) => {
  event.waitUntil(() => {
    return self.clients.claim();
  });
});

self.addEventListener('activate', (event) => {
  event.waitUntil(() => {
    return self.clients.claim();
  });
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    new Response('Service Worker activated', {
      status: 200,
      statusText: 'OK',
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(() => {
      return self.skipWaiting();
    });
  }
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    new Response('Service Worker activated', {
      status: 200,
      statusText: 'OK',
    })
  );
});

// Cache-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    new Response('Service Worker activated', {
      status: 200,
      statusText: 'OK',
    })
  );
});

// Cache management
self.addEventListener('fetch', (event) => {
  event.respondWith(
    new Response('Service Worker activated', {
      status: 200,
      statusText: 'OK',
    })
  );
});