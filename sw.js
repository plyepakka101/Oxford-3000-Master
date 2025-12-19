
const CACHE_NAME = 'oxford-3000-v5';
const DYNAMIC_CACHE = 'oxford-dynamic-v2';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== DYNAMIC_CACHE && !key.includes('oxford-3000-master-cache'))
            .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// กลยุทธ์ Stale-While-Revalidate: แสดงจาก Cache ทันที + อัปเดตจาก Network เบื้องหลัง
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ปล่อย Gemini API ให้ geminiService จัดการเอง
  if (url.hostname.includes('generativelanguage.googleapis.com')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          const targetCache = url.origin === self.location.origin ? CACHE_NAME : DYNAMIC_CACHE;
          caches.open(targetCache).then((cache) => cache.put(event.request, cacheCopy));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
