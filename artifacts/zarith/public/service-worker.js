const BUILD_VERSION = '__ZARITH_BUILD_VERSION__';
const CACHE_NAME = `zarith-pwa-${BUILD_VERSION}`;
const APP_SHELL = [
  '/',
  '/chat',
  '/index.html',
  '/manifest.json',
  '/changelog.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  await Promise.all(clients.map((client) => client.postMessage({ version: BUILD_VERSION, ...message })));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => notifyClients({ type: 'SW_UPDATE_READY' }))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
      .then(() => notifyClients({ type: 'SW_ACTIVATED' }))
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', responseClone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          const url = new URL(request.url);

          if (
            networkResponse.ok &&
            url.origin === self.location.origin &&
            ['script', 'style', 'image', 'font', 'manifest'].includes(request.destination)
          ) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }

          return networkResponse;
        })
        .catch(() => new Response('', { status: 504, statusText: 'Offline' }));
    })
  );
});
