const VERSION = 'v0.3.2-beta1';
const CACHE_PREFIX = 'samtalestotte:' + new URL(self.registration.scope).pathname + ':';
const CACHE_NAME = CACHE_PREFIX + VERSION;
const APP_SHELL = ['./', './index.html',
  './styles.css?v=0.3.2-beta1', './app.js?v=0.3.2-beta1', './lib.js?v=0.3.2-beta1',
  './language-model.js?v=0.3.2-beta1', './default-data.js?v=0.3.2-beta1', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png'];
const LANGUAGE_ASSETS = ['./language-data.json'];
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL.map((p) => new URL(p, self.registration.scope).href));
    for (const path of LANGUAGE_ASSETS) {
      try { await cache.add(new URL(path, self.registration.scope).href); }
      catch { /* Source/development package can run with an explicit missing-model warning. */ }
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin
      || !url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (event.request.mode === 'navigate') {
      try {
        const response = await fetch(event.request);
        if (response.ok) await cache.put(event.request, response.clone());
        return response;
      } catch {
        const exact = await cache.match(event.request, {ignoreSearch: true});
        if (exact) return exact;
        if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
          return (await cache.match(new URL('./index.html', self.registration.scope).href))
            || Response.error();
        }
        return Response.error();
      }
    }
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok) await cache.put(event.request, response.clone());
    return response;
  })());
});
