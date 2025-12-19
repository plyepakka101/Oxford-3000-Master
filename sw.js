
const CACHE_NAME = 'oxford-3000-v3';
const DYNAMIC_CACHE = 'oxford-dynamic-v1';

// ไฟล์หลักที่ต้องมีเพื่อให้แอปเปิดขึ้นมาได้
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600&display=swap'
];

// Install Event: เก็บไฟล์พื้นฐาน
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: ลบ Cache เก่า
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

// Fetch Event: กลยุทธ์การดึงข้อมูล
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 1. ถ้าเป็น Gemini API (Generative Language) - ไม่ต้องยุ่ง ปล่อยให้ geminiService จัดการผ่าน Cache API เอง
  if (url.hostname.includes('generativelanguage.googleapis.com')) return;

  // 2. ถ้าเป็นโมดูลจาก esm.sh หรือ Google Fonts ให้ใช้ Cache First แล้วค่อย Update (Stale-While-Revalidate)
  if (url.hostname.includes('esm.sh') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(event.request, cacheCopy));
          }
          return networkResponse;
        });
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. สำหรับไฟล์อื่นๆ ในแอป ใช้กลยุทธ์ Network First, Fallback to Cache
  // เพื่อให้มั่นใจว่าถ้ามีเน็ตจะได้เวอร์ชันล่าสุดเสมอ
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cacheCopy));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
