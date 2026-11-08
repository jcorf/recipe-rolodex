// Lets the rolodex open with no connection once it's been visited (and installed to a phone's
// Home Screen). The cards themselves are in IndexedDB; this only keeps the page, its code, fonts
// and paper textures. The recipe reader (/api/…) always goes to the network.
const CACHE = 'rolodex-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // The page: the newest one when online (so a new version shows up), the kept one when not.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) caches.open(CACHE).then((c) => c.put('/', res.clone()));
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Code, fonts, textures: built files never change under the same name, so the kept copy is fine;
  // anything else is refreshed in the background for next time.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const kept = await cache.match(request);
      const fresh = fetch(request)
        .then((res) => {
          if (res.ok) cache.put(request, res.clone());
          return res;
        })
        .catch(() => kept);
      return url.pathname.startsWith('/assets/') && kept ? kept : kept ?? fresh;
    }),
  );
});
