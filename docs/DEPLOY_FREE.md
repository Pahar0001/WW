# Vela — бесплатный деплой (Vercel + Koyeb + Neon)

Хостинг reg.ru **Host-0** — это PHP shared-хостинг без Node.js, поэтому само
приложение там не запустить. Панель reg.ru используем только для **DNS** (домен
`velatrips.ru`). Само приложение — на бесплатных сервисах:

| Часть | Сервис | Бесплатно |
|------|--------|-----------|
| База данных (PostgreSQL) | **Neon** | ✅ без срока жизни |
| Бэкенд (NestJS, Docker) | **Koyeb** | ✅ 1 сервис |
| Фронтенд (Next.js) | **Netlify** | ✅ щедрый лимит, без телефона |
| Домен / DNS | **reg.ru** (уже есть) | — |

Схема: браузер → Netlify (Next.js) → проксирует `/api` и `/uploads` → Koyeb (NestJS) → Neon.

> Vercel требует номер телефона при регистрации — поэтому используем **Netlify**
> (регистрация через GitHub/email, телефон не нужен). Альтернатива без телефона —
> Cloudflare Pages, но с Next.js SSR там больше ручной настройки.

---

## 1. База данных — Neon
1. Зарегистрируйтесь на https://neon.tech → **New Project** (регион ближе к Koyeb, напр. EU).
2. Скопируйте **Connection string** (Pooled). Добавьте `&schema=public`:
   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require&schema=public
   ```
   Это значение — `DATABASE_URL`.

## 2. Бэкенд — Koyeb
1. https://www.koyeb.com → **Create Web Service** → **GitHub** → репозиторий `Pahar0001/WW`.
2. Build:
   - **Work directory / context:** `backend`
   - **Builder:** Dockerfile (путь `backend/Dockerfile`)
   - **Port:** `4000`
3. **Environment variables** (Settings → Environment):
   ```
   DATABASE_URL      = <строка из Neon>
   NODE_ENV          = production
   JWT_SECRET        = <openssl rand -hex 32>
   JWT_EXPIRES       = 7d
   APP_URL           = https://velatrips.ru
   SUPERADMIN_EMAIL  = <ваш email админа>
   SUPERADMIN_PASSWORD = <пароль админа>
   RESEND_API_KEY    = <ключ Resend, опц.>
   EMAIL_FROM        = Vela <no-reply@velatrips.ru>
   GROQ_API_KEY      = <ключ Groq, опц.>
   GROQ_MODEL        = llama-3.3-70b-versatile
   # Хранилище Supabase (опц.; при пустом — диск-фолбэк). Для Supabase S3_REGION
   # = реальный регион проекта (не "auto").
   S3_ENDPOINT / S3_REGION / S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY / S3_PUBLIC_URL
   ```
4. Deploy. На старте контейнер сам применит схему (`prisma db push`) и засеет данные
   (супер-админ + маршруты). Запомните публичный URL, вида `https://<app>-<org>.koyeb.app`.
5. Проверка: откройте `https://<app>-<org>.koyeb.app/api/health` → `{"status":"ok"}`.

## 3. Фронтенд — Vercel
1. https://vercel.com → **Add New Project** → импорт репозитория `Pahar0001/WW`.
2. **Root Directory:** `frontend` (важно — не корень репозитория).
3. Framework: Next.js (определится сам). Build/Output — по умолчанию.
4. **Environment Variables:**
   ```
   BACKEND_URL = https://<app>-<org>.koyeb.app        (URL бэкенда с шага 2, без /api)
   ```
5. Deploy. Проверьте `https://<project>.vercel.app` — сайт должен открыться и данные подтянуться.

## 4. Домен на reg.ru → Vercel
1. В Vercel: Project → **Settings → Domains** → добавьте `velatrips.ru` и `www.velatrips.ru`.
   Vercel покажет нужные записи (обычно: A `76.76.21.21` для apex и CNAME
   `cname.vercel-dns.com` для www — используйте те значения, что покажет Vercel).
2. В reg.ru: **Управление DNS** для `velatrips.ru`:
   - Замените A-запись `@` (`velatrips.ru.`) на A-запись, которую показал Vercel.
   - Замените/создайте CNAME `www` на значение от Vercel.
   - Почтовые записи (`mail/smtp/pop/ftp` → `31.31.196.48`, MX) **не трогайте**.
3. Через несколько минут Vercel сам выпустит SSL. `https://velatrips.ru` заработает.

## 5. Перенос данных со старого Render (опционально)
Если нужны старые пользователи/поездки:
1. В Render временно снимите приостановку БД (или дождитесь сброса лимита) и в
   разделе БД возьмите **External Database URL**.
2. Локально: `pg_dump "<render_url>" > dump.sql` → `psql "<neon_url>" < dump.sql`.
Если старые данные не нужны — ничего не переносите: Koyeb на старте создаст схему и
засеет супер-админа и демо-маршруты.

## Примечания
- Koyeb free-инстанс «засыпает» при простое; первый запрос будит его (фронтенд уже
  умеет переживать холодный старт — ретраи в `lib/api.ts`).
- `render.yaml`, `docker-compose.prod.yml`, `deploy/Caddyfile` оставлены для
  альтернативных путей (Render Blueprint / собственный VPS) — для этого плана не нужны.
