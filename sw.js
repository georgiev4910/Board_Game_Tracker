const CACHE = 'bg-tracker-v39';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Always network-first; offline fallback only for HTML shell
  e.respondWith(
    fetch(e.request)
      .then((res) => res)
      .catch(() => {
        if (e.request.mode === 'navigate') {
          return caches.match('/Board_Game_Tracker/index.html').then(
            (r) => r || caches.match('./index.html') || Response.error()
          );
        }
        return caches.match(e.request);
      })
  );
});
