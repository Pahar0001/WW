/**
 * Идентификатор сборки. Нужен service worker'у, чтобы при каждом деплое
 * СМЕНИТЬ имена своих кэшей и удалить старые.
 *
 * Без этого версия кэша была захардкожена ('v1') и не менялась никогда:
 * обработчик `activate` в sw.js честно удалял «всё, кроме текущих имён», но
 * текущие имена совпадали со старыми, и чистка была мёртвым кодом. В кэше
 * PAGES навсегда оставался HTML, отданный ДО деплоя, а он ссылается на чанки
 * со старыми хешами, которых на сервере уже нет, — навигация из кэша
 * заканчивалась «Application error: a client-side exception has occurred».
 *
 * На Render есть RENDER_GIT_COMMIT; локально и в докере берём время сборки.
 *
 * ⚠️ Значение кладём в process.env и переиспользуем: next.config.js
 * вычисляется НЕСКОЛЬКО раз за одну сборку (отдельные процессы компиляции
 * сервера и клиента), и `Date.now()` давал там разные значения — идентификатор
 * сборки Next и NEXT_PUBLIC_BUILD_ID расходились. На работу SW это не влияло
 * (в бандл попадает одно значение), но пара «одно и то же под двумя именами»
 * рано или поздно кого-нибудь подведёт.
 */
if (!process.env.__VELA_BUILD_ID) {
  process.env.__VELA_BUILD_ID = process.env.RENDER_GIT_COMMIT || `b${Date.now().toString(36)}`;
}
const BUILD_ID = process.env.__VELA_BUILD_ID;

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Политика содержимого и прочие заголовки безопасности.
 *
 * `'unsafe-inline'` в script-src оставлен ОСОЗНАННО: Next вставляет в страницу
 * собственные встроенные сценарии (загрузчик, поток данных), плюс наш выбор темы
 * до первой отрисовки в `layout.tsx`. Убрать его можно только вместе с переходом
 * на nonce через middleware — это отдельная работа, и делать её заодно значит
 * рисковать белым экраном на проде. Остальные директивы при этом работают:
 * `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` и
 * `frame-ancestors 'none'` закрывают внедрение плагинов, подмену базового
 * адреса, отправку формы на чужой сайт и показ Vela внутри чужого фрейма.
 *
 * Что чему нужно именно в этом приложении:
 *   img-src https:   — плитки карт CARTO и фотографии мест из Википедии
 *                      (ниже `remotePatterns` уже разрешает любой https-хост);
 *   media-src blob:  — хиро-видео и голосовые сообщения, записанные на месте;
 *   connect-src      — только свой origin: страница ходит в API через свой же
 *                      Next-сервер, наружу запросов нет. В dev добавлен ws: —
 *                      по нему живёт горячая перезагрузка;
 *   worker-src blob: — service worker и воркеры three.js.
 *   frame-src        — виджет заказа трансфера, и ТОЛЬКО он (см. ниже).
 */

/**
 * ⚠️ frame-src для виджета трансфера — ловушка §12.15 в чистом виде.
 *
 * Директивы `frame-src` в политике не было вовсе, а значит действовал откат к
 * `default-src 'self'`: любой чужой фрейм молча блокировался. Виджет заказа
 * трансфера отрисовался бы пустым прямоугольником — без запроса в сеть, без
 * ошибки в консоли, вообще без улик, как уже было с картами и с картинками.
 *
 * Список хостов СТАТИЧЕСКИЙ и лежит в `src/lib/widget-hosts.js`. Соблазн взять
 * хост из `KIWITAXI_WL_URL` велик и неверен: Next вмораживает эти заголовки в
 * `routes-manifest.json` на СБОРКЕ, и переменная, заданная потом в панели
 * Render, на политику уже не повлияет — проверено. Подробности и правило
 * добавления партнёра — в том же файле.
 */
const { WIDGET_FRAME_HOSTS } = require('./src/lib/widget-hosts');

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  `frame-src 'self' ${WIDGET_FRAME_HOSTS.join(' ')}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/**
 * ⚠️ ОТДЕЛЬНАЯ ПОЛИТИКА ДЛЯ SERVICE WORKER — иначе он рвёт все чужие картинки.
 *
 * Воркер наследует CSP того ответа, которым отдан его скрипт. Он перехватывает
 * КАЖДЫЙ GET и переспрашивает его своим `fetch()`, а `fetch` в воркере
 * подчиняется `connect-src`. С `connect-src 'self'` любой запрос наружу внутри
 * воркера обрывался — и на проде умирали разом обложки маршрутов с Викимедиа и
 * плитки карт CARTO. Со стороны это выглядело как «фото не грузятся»: запроса в
 * сеть нет, ошибки в консоли страницы нет, а картинка пустая.
 *
 * Локально не воспроизводилось: воркер регистрируется только в production.
 *
 * Странице `connect-src 'self'` оставляем — она и правда никуда наружу не ходит,
 * в API она стучится через свой же Next-сервер. Послабление получает только
 * воркер, и только на исходящие запросы.
 */
const swCsp = csp.replace("connect-src 'self'", "connect-src 'self' https:");

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Браузер не должен угадывать тип содержимого: на этом строятся атаки, когда
  // загруженный пользователем файл начинают исполнять как сценарий.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  // Наружу уходит только домен, с которого пришли, — без пути и параметров.
  // На этом же держится обещание политики: из реферера храним только хост.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Микрофон и камера нужны своим же страницам (голосовые, кружки),
  // геолокация — картам. Остальное выключено и чужим фреймам не выдаётся.
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=(self), interest-cohort=()',
  },
  // Действует только по https; на localhost браузер заголовок игнорирует.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
];

/** Те же заголовки, но с политикой, разрешающей воркеру исходящие запросы. */
const swHeaders = securityHeaders.map((h) =>
  h.key === 'Content-Security-Policy' ? { key: h.key, value: swCsp } : h,
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: () => BUILD_ID,
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  async headers() {
    return [
      // Всё, кроме самого воркера. Отрицательный просмотр вперёд нужен, чтобы
      // на /sw.js не попали ДВА заголовка CSP: браузер применяет пересечение
      // политик, и строгая всё равно победила бы.
      { source: '/((?!sw\\.js$).*)', headers: securityHeaders },
      { source: '/sw.js', headers: swHeaders },
    ];
  },
  // 'standalone' is for the Docker image (CMD runs server.js). On Netlify/Vercel
  // the platform's own Next runtime handles output, so leave it default there.
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};
module.exports = nextConfig;
