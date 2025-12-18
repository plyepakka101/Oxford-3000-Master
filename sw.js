
const CACHE_NAME = 'oxford-3000-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600&display=swap'
];

// ติดตั้ง SW และเก็บไฟล์พื้นฐานลง Cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ลบ Cache เก่าเมื่อมีการอัปเดตเวอร์ชัน
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME && !name.includes('oxford-3000-master-cache'))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// จัดการการดึงข้อมูล (Fetch Strategy)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ข้ามการ Cache สำหรับ Gemini API (ปล่อยให้ geminiService จัดการเองใน Local Cache)
  if (url.hostname.includes('generativelanguage.googleapis.com')) return;

  // สำหรับ Assets ทั่วไป ใช้กลยุทธ์ Stale-While-Revalidate
  // คือแสดงจาก Cache ทันที แล้วแอบไปอัปเดตจาก Network ในเบื้องหลัง
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch(() => {
        // หาก Network ล้มเหลวและไม่มีใน Cache
        return cachedResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
