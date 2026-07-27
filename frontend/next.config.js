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

/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: () => BUILD_ID,
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  // 'standalone' is for the Docker image (CMD runs server.js). On Netlify/Vercel
  // the platform's own Next runtime handles output, so leave it default there.
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};
module.exports = nextConfig;
