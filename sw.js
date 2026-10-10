// Offline support: precache the files listed in precache.json (written by
// `npm run build`), then serve same-origin files from cache while refreshing
// them in the background. Fonts are cached on first use.

const VERSION = 'v4';
const CACHE = `yijie-${VERSION}`;
const FONT_CACHE = 'yijie-fonts';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const shell = ['./', './index.html', './styles/main.css', './src/main.js', './manifest.webmanifest'];
      let files = [];
      try {
        const res = await fetch('./precache.json', { cache: 'no-cache' });
        if (res.ok) files = await res.json();
      } catch {
        /* dev server without a build: runtime caching still works */
      }
      await cache.addAll([...new Set([...shell, ...files])]);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('yijie-v') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
      const refresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    }),
  );
});
