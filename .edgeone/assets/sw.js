const CACHE_NAME = 'sm-cache-ddd7e9f-1779285894008';
const BUILD_ID = 'ddd7e9f';
const STATIC_CACHE = 'sm-static-v4';
const BYPASS_URLS = ['/version.json', '/api/version', '/sw.js'];
const ASSETS = ['/offline.html', '/manifest.json'];

// ===== INSTALL =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== STATIC_CACHE && k !== CACHE_NAME).map((k) => caches.delete(k))
    )).then(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_UPDATED', buildId: BUILD_ID });
        });
      });
      return self.clients.claim();
    })
  );
});

// ===== FETCH =====
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const shouldBypass = BYPASS_URLS.some(p => url.pathname.includes(p));
  
  if (shouldBypass) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const fallback = await caches.match('/offline.html');
      if (fallback) return fallback;
    }
    return new Response('Offline', { status: 503 });
  }
}

// ===== MESSAGE HANDLER =====
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CHECK_VERSION') {
    event.source?.postMessage({ type: 'SW_VERSION', buildId: BUILD_ID, cacheName: CACHE_NAME });
  }
  if (event.data?.type === 'CLEAR_ALL_CACHES') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});

// ===== PUSH =====
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const d = event.data.json();
    self.registration.showNotification(d.title || 'SuperMarket', {
      body: d.body || '',
      icon: '/icons/icon-192.svg',
      badge: '/icons/icon-192.svg',
      dir: 'rtl', lang: 'ar',
      data: { url: d.url || '/' },
      requireInteraction: true,
    });
  } catch {
    self.registration.showNotification('SuperMarket', { body: event.data.text(), icon: '/icons/icon-192.svg' });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.matchAll({ type: 'window' }).then((cs) => {
    const match = cs.find((c) => c.url === url);
    if (match) match.focus(); else clients.openWindow(url);
  }));
});
