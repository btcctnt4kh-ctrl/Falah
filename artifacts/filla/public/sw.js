const CACHE_NAME = 'filla-shell-v3';
const SHELL_FILES = [
  '/',
  '/manifest.webmanifest',
  '/filla-logo.jpeg',
  '/filla-app-icon.svg',
  '/filla-app-icon-192.png',
  '/filla-app-icon-512.png',
  '/filla-apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('filla-') && key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  const isNavigation = event.request.mode === 'navigate';
  if (isNavigation) {
    event.respondWith(fetch(event.request).then((response) => {
      if (!response.ok) return response;
      return caches.open(CACHE_NAME).then((cache) => cache.put('/', response.clone())).then(() => response);
    }).catch(() => caches.match('/')));
    return;
  }
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (!response.ok) return response;
    return caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone())).then(() => response);
  }).catch(() => caches.match(event.request).then((cached) => cached || Response.error()))));
});
