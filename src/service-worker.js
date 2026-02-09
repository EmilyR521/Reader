// Basic service worker for PWA
const CACHE_NAME = 'reading-list-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/main.js'
];

// Check if we're in development mode
const isDevelopment = self.location.hostname === 'localhost' || 
                     self.location.hostname === '127.0.0.1';

// Install event - cache resources (skip in development)
self.addEventListener('install', (event) => {
  if (isDevelopment) {
    // Skip caching in development
    console.log('Service worker: Development mode, skipping cache');
    self.skipWaiting();
    return;
  }
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fallback to network (skip in development)
self.addEventListener('fetch', (event) => {
  if (isDevelopment) {
    // In development, always fetch from network
    return fetch(event.request);
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
