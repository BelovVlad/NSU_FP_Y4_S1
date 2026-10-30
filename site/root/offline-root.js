// Offline copies of the site's short addresses: …/NSU_FP_Y4_S1/ (redirects to docs/) and particles/.
// docs/sw.js has the more specific scope, so it alone controls the site itself; this worker
// answers only for these two pages and leaves every other request to the browser.
const CACHE = 'nsu-root-v1';
const PAGES = ['./', './particles/'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(PAGES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith('nsu-root-') && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url), root = new URL('./', self.location);
  if (event.request.method !== 'GET' || url.origin !== root.origin) return;
  const page = { '': './', 'index.html': './', 'particles/': './particles/', 'particles/index.html': './particles/' }[url.pathname.slice(root.pathname.length)];
  if (!page) return;
  const key = new URL(page, self.location).href;
  // Network first, so a changed redirect is picked up; the copy is for when there is no connection.
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); event.waitUntil(caches.open(CACHE).then(cache => cache.put(key, copy))); }
    return response;
  }).catch(() => caches.match(key).then(response => response || Response.error())));
});
