const VERSION = 'sll-pdv-v2';
const SHELL = ['/', '/manifest.webmanifest', '/assets/gestor-logo-quadrado.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL).catch(() => undefined);
    try {
      const r = await fetch('/precache.json', { cache: 'no-store' });
      if (r.ok) {
        const list = await r.json();
        await Promise.all(list.map((u) => c.add(u).catch(() => undefined)));
        const keep = new Set(list);
        for (const req of await c.keys()) {
          const p = new URL(req.url).pathname;
          if (/^\/assets\/.+\.(js|css)$/.test(p) && !keep.has(p)) await c.delete(req);
        }
      }
    } catch (e) { /* sem lista: segue com o cache sob demanda */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || Response.error()))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || Response.error());
      return cached || net;
    })
  );
});