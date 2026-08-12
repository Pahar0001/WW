# Vela web — multi-stage Next.js standalone build
FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
# Публичный адрес сайта нужен именно на сборке: Next печёт его в sitemap.xml,
# robots.txt и OG-теги. Если не передать — останется значение по умолчанию
# из frontend/src/lib/site.ts.
ARG NEXT_PUBLIC_SITE_URL
# Видео первого экрана: пусто — берётся public/hero/thailand.mp4, «none» — выключено
ARG NEXT_PUBLIC_HERO_MEDIA_URL
ARG NEXT_PUBLIC_HERO_MEDIA_POSTER
# Версия сборки попадает в адрес service worker (/sw.js?v=…). Если её не менять,
# браузер продолжает держать прежний worker и его кэш — люди после обновления
# видят старый сайт. См. frontend/src/components/pwa/PwaProvider.tsx.
ARG NEXT_PUBLIC_BUILD_ID=dev
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_HERO_MEDIA_URL=$NEXT_PUBLIC_HERO_MEDIA_URL
ENV NEXT_PUBLIC_HERO_MEDIA_POSTER=$NEXT_PUBLIC_HERO_MEDIA_POSTER
ENV NEXT_PUBLIC_BUILD_ID=$NEXT_PUBLIC_BUILD_ID
# Produce a standalone server for the Docker runtime (server.js).
ENV BUILD_STANDALONE=true
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Bind to all interfaces. Docker auto-sets HOSTNAME to the container ID, and
# Next.js standalone binds to it — which platforms like Render can't reach (502).
# Forcing 0.0.0.0 fixes external reachability.
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
