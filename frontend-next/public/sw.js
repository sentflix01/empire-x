// Nodbusiness service worker — offline page + push notifications.
//
// Privacy rule (audit F-048): only public, versioned static files are cached.
// Pages, API responses and anything from another origin always go to the
// network, so no signed-in data is stored on the device and nothing needs
// clearing on logout.

const VERSION = 'v4'; // v4: logos and icons are network-first, so a new logo shows at once
const SHELL_CACHE = `nodbusiness-shell-${VERSION}`;
const STATIC_CACHE = `nodbusiness-static-${VERSION}`;
const OFFLINE_URL = '/offline';
const SHELL_ASSETS = [OFFLINE_URL, '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'];
const MAX_STATIC_ENTRIES = 300;

// Next.js build output is content-hashed (a change gets a new URL), so a
// cached copy never goes stale and can be served first.
function isHashedAsset(url) {
  return url.pathname.startsWith('/_next/static/');
}

// Logos, icons and the manifest keep their URL when their content changes.
// They come from the network first; the cached copy is only for offline use.
function isBrandAsset(url) {
  return url.pathname.startsWith('/icons/') || url.pathname.startsWith('/brand/') || url.pathname === '/manifest.json';
}

// Install — cache the offline page and the scripts and styles it needs.
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const shell = await caches.open(SHELL_CACHE);
    await shell.addAll(SHELL_ASSETS);
    const page = await shell.match(OFFLINE_URL);
    const html = page ? await page.text() : '';
    const assets = [...new Set(html.match(/\/_next\/static\/[^"'\s)]+/g) || [])];
    if (assets.length) await (await caches.open(STATIC_CACHE)).addAll(assets);
    await self.skipWaiting();
  })());
});

// Activate — remove caches from earlier versions (including v2, which cached pages).
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !keep.has(k)).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function trimStaticCache(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - MAX_STATIC_ENTRIES; i += 1) await cache.delete(keys[i]);
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Pages: always from the network; the offline page only when it fails.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()));
    return;
  }

  // Content-hashed build files: cache first.
  if (isHashedAsset(url)) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, response.clone());
        trimStaticCache(cache);
      }
      return response;
    })());
    return;
  }

  // Logos and icons: network first, cached copy only when offline. Range
  // requests (video seeking) go straight to the network and are not stored.
  if (isBrandAsset(url)) {
    if (request.headers.has('range')) return;
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && response.status === 200 && response.type === 'basic') {
          const cache = await caches.open(STATIC_CACHE);
          await cache.put(request, response.clone());
          trimStaticCache(cache);
        }
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })());
  }
  // Everything else: default browser handling (network).
});

// Push notifications
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Nodbusiness', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url || '/' },
    })
  );
});

// Notification click — open the app at the relevant URL
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      const existing = windowClients.find(c => c.url === url && 'focus' in c);
      if (existing) return existing.focus();
      return clients.openWindow(url);
    })
  );
});
