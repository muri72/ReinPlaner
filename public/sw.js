const CACHE_NAME = 'aris-mobile-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/employee/dashboard',
  '/portal/dashboard',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Cached URLs');
        self.skipWaiting();
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Activated new service worker');
      self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Only cache same-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip caching for API calls
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(request).then((fetchResponse) => {
          // Cache successful responses
          if (fetchResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, fetchResponse.clone());
            });
          }
          return fetchResponse;
        });
      })
      .catch(() => {
        // Return offline page if network fails
        return caches.match('/offline.html');
      })
  );
});

// Push event
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.body || 'Neue Benachrichtigung',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    data: event.data,
  };

  event.waitUntil(
    self.registration.showNotification(
      event.data?.title || 'ARIS',
      options
    )
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Focus or open the app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === event.target.url) {
          client.focus();
          return;
        }
      }
      if (clients.length > 0) {
        clients[0].focus();
      }
    })
  );
});

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync for offline actions
      doBackgroundSync()
    );
  }
});

async function doBackgroundSync() {
  try {
    // Get offline actions from localStorage
    const offlineActions = localStorage.getItem('offlineActions');
    if (!offlineActions) return;

    const actions = JSON.parse(offlineActions);
    
    for (const action of actions) {
      try {
        await syncAction(action);
      } catch (error) {
        console.error('Error syncing action:', error);
      }
    }

    // Clear synced actions
    localStorage.removeItem('offlineActions');
  } catch (error) {
    console.error('Error in background sync:', error);
  }
}

async function syncAction(action) {
  const response = await fetch(action.endpoint, {
    method: action.method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(action.data),
  });

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.statusText}`);
  }

  return response.json();
}