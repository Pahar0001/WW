/*
 * Service worker Vela.
 *
 * Задачи:
 *  1) установка на телефон (вместе с manifest.webmanifest);
 *  2) офлайн-доступ к сохранённой поездке — страница маршрута, её печатная
 *     версия и фотографии кладутся в кэш по кнопке «Сохранить офлайн»;
 *  3) мгновенная повторная загрузка статики.
 *
 * Принципы: API никогда не кэшируем (данные должны быть свежими и приватными),
 * навигации — network-first с откатом в кэш, статика — cache-first.
 */

const VERSION = 'v1';
const SHELL = `vela-shell-${VERSION}`;
const ASSETS = `vela-assets-${VERSION}`;
const PAGES = `vela-pages-${VERSION}`;
/** Кэш сохранённых поездок; переживает смену версии SW (чистится только вручную). */
const TRIPS = 'vela-trips';

const OFFLINE_URL = '/offline';

const PRECACHE = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL);
      // Отдельными запросами: один недоступный адрес не должен рушить установку.
      await Promise.all(
        PRECACHE.map((url) => cache.add(url).catch(() => undefined)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, ASSETS, PAGES, TRIPS]);
      const names = await caches.keys();
      await Promise.all(names.filter((n) => !keep.has(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

// Кнопка «Сохранить офлайн» присылает список адресов поездки.
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'CACHE_TRIP' && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(TRIPS);
        let saved = 0;
        await Promise.all(
          data.urls.map(async (url) => {
            try {
              // no-cors нужен для сторонних фото (Википедия): ответ непрозрачный,
              // но из кэша он отдаётся браузером корректно.
              const sameOrigin = new URL(url, self.location.origin).origin === self.location.origin;
              const res = await fetch(url, sameOrigin ? { cache: 'reload' } : { mode: 'no-cors' });
              if (res && (res.ok || res.type === 'opaque')) {
                await cache.put(url, res.clone());
                saved++;
              }
            } catch {
              /* один недоступный файл не отменяет сохранение поездки */
            }
          }),
        );
        // includeUncontrolled: на первом визите страница ещё не под управлением
        // SW (он зарегистрировался после загрузки) — без этого ответ не дойдёт.
        const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
        clients.forEach((c) => c.postMessage({ type: 'TRIP_CACHED', saved, total: data.urls.length }));
      })(),
    );
  }
  if (data.type === 'CLEAR_TRIPS') {
    event.waitUntil(caches.delete(TRIPS));
  }
});

const isStatic = (url) =>
  url.pathname.startsWith('/_next/static/') ||
  url.pathname.startsWith('/icons/') ||
  url.pathname === '/manifest.webmanifest' ||
  /\.(?:css|js|woff2?|ttf|png|jpe?g|webp|avif|svg|ico)$/.test(url.pathname);

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Приватные и живые данные не кэшируем никогда.
  if (url.origin === self.location.origin && (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/'))) {
    return;
  }

  // Видео-герой (16 МБ, range-запросы) оставляем браузеру.
  if (url.pathname.startsWith('/hero/')) return;

  // Навигация: сеть, при неудаче — сохранённая страница, затем офлайн-заглушка.
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(PAGES);
          cache.put(req, fresh.clone()).catch(() => undefined);
          return fresh;
        } catch {
          const saved = await caches.match(req, { ignoreSearch: true });
          if (saved) return saved;
          // Именно редирект, а не отдача HTML заглушки под чужим адресом:
          // иначе Next.js гидрирует страницу /offline на URL другого раздела
          // и падает с client-side exception.
          if (url.pathname !== OFFLINE_URL) return Response.redirect(OFFLINE_URL, 302);
          const offline = await caches.match(OFFLINE_URL);
          return (
            offline ||
            new Response('<h1>Нет соединения</h1>', {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        }
      })(),
    );
    return;
  }

  // Статика: из кэша сразу, в фоне обновляем.
  if (isStatic(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(ASSETS);
          cache.put(req, fresh.clone()).catch(() => undefined);
          return fresh;
        } catch {
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  // Остальное (в т.ч. фото маршрутов со сторонних хостов): сеть, откат в кэш.
  event.respondWith(
    fetch(req).catch(async () => (await caches.match(req)) || Response.error()),
  );
});
