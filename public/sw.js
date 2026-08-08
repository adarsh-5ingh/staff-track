const CACHE_NAME = 'staff-track-kiosk-v1';
const URLS_TO_CACHE = [
  '/kiosk',
  '/',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // If the request is for the checkin API, don't use cache, try network, fallback to queuing (in a real advanced PWA)
  if (event.request.url.includes('/api/checkin')) {
    event.respondWith(fetch(event.request).catch(() => {
      return new Response(JSON.stringify({ error: 'Offline. Try again later.' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
