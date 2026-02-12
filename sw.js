// EXOT Service Worker v2.7
const CACHE_NAME = 'exot-v2.7';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/register.html',
    '/attendance.html',
    '/dashboard.html',
    '/exam-english.html',
    '/exam-arabic.html',
    '/exam-alquran.html',
    '/scan-examiner.html',
    '/examiner-reward.html',
    '/css/styles.css',
    '/js/storage.js',
    '/js/api-service.js',
    '/img/logo-alwildan.png',
    '/manifest.json'
];

// Install - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(STATIC_ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip external requests
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Cache successful responses
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Return cached version when offline
                return caches.match(event.request);
            })
    );
});
