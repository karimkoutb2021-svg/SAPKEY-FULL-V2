const CACHE_NAME = 'sm-cache-f2d0107-1779871874344';
const BUILD_ID = 'f2d0107';
const STATIC_CACHE = 'sm-static-v5';
const BYPASS_URLS = ['/version.json', '/api/version', '/api/manifest', '/sw.js', '/manifest.json'];
const ASSETS = ['/offline.html'];

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
    event.respondWith(
      fetch(event.request).catch(() => {
        if (url.pathname === '/manifest.json') {
          return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
        }
        return new Response('Offline', { status: 503 });
      })
    );
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
  if (event.data?.type === 'FORCE_UPDATE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
    self.skipWaiting();
    event.source?.postMessage({ type: 'UPDATE_READY' });
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

// ===== PERIODIC VERSION CHECK =====
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'version-check') {
    event.waitUntil(checkForUpdates());
  }
});

async function checkForUpdates() {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.buildId && data.buildId !== BUILD_ID) {
        self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'VERSION_MISMATCH', serverBuildId: data.buildId, currentBuildId: BUILD_ID });
          });
        });
      }
    }
  } catch {}
}
