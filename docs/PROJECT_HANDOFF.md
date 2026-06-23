# Vela — PROJECT HANDOFF

> Документ для продолжения работы в новом чате Claude Code **без доступа к истории переписки**.
> Прочитай его целиком, затем продолжай с раздела **«Открытые задачи»**.

## 0. Где работать (начни отсюда)

```
Рабочая папка проекта:  /Users/marat/Desktop/Repository
GitHub (origin/main):   https://github.com/Pahar0001/WW
Прод (фронтенд):        https://vela-web-zr2u.onrender.com
Прод (API):             https://vela-api-8rta.onrender.com
API health:             https://vela-api-8rta.onrender.com/api/health
```

Первым делом:
```bash
cd /Users/marat/Desktop/Repository
git status          # есть 1 незакоммиченное изменение (см. ниже)
git log --oneline -5
```

**Важно:** есть незакоммиченное изменение — `backend/src/modules/auth/auth.service.ts`
(добавлен метод `resendVerification(userId)` — повторная отправка письма верификации).
Оно компилируется, но ещё **не подключено** к контроллеру/фронту. Это часть незавершённой
задачи (см. «Открытые задачи → A. Resend» и «→ B. Функция 4»).

---

## 1. Что это за проект

**Vela** — премиальная платформа планирования и совместной организации путешествий
(RU-интерфейс). Есть готовые маршруты, конструктор, карты, бюджет, билеты/документы/
календарь, отели, чат участников, фотоальбомы/воспоминания, приватные поездки,
приглашения по email, авторизация + RBAC + админка. Первый маршрут — «China — The
Floating Mountains» (Китай 2027).

**Главные принципы:**
- **Real Data Policy:** не выдумывать цены/расстояния/время/погоду; неизвестное помечать
  `dataStatus: PENDING`. Бюджет — `ESTIMATED` (оценка из заявленного диапазона), не котировка.
- Спокойный тёплый дизайн (шалфей/камень), светлая (по умолчанию) + тёмная темы.

---

## 2. Стек технологий

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 14.2 (App Router, TS), Tailwind (HSL-токены в стиле shadcn), Framer Motion, Leaflet+OSM (карты, без ключей) |
| Backend | NestJS 10, Prisma 5, REST, zod-валидация |
| БД | PostgreSQL 16 |
| Auth | Своя: JWT (`jsonwebtoken`) + `bcryptjs`, guards/decorators (без passport) |
| Файлы | S3-совместимый адаптер (сейчас **Supabase Storage**), fallback на локальный диск |
| Email | `EmailService` → Resend (если задан `RESEND_API_KEY`), иначе ссылка в лог |
| Деплой | Render Blueprint (`render.yaml`): db + api + web; Docker |
| Локально | Docker Compose; для UI-итераций — Next dev + Preview MCP (Node ставится через `brew install node`) |

**Архитектурная особенность (важно для деплоя):** фронтенд **проксирует** браузерные
запросы к бэкенду на лету. Браузер всегда зовёт свой origin (`/api/*`, `/uploads/*`),
а Next-сервер форвардит их на `BACKEND_URL` (runtime).
Это убирает CORS и build-time URL. Серверные компоненты зовут бэкенд напрямую через
`BACKEND_URL`. Файлы прокси: `frontend/src/app/api/[...path]/route.ts`,
`frontend/src/app/uploads/[...path]/route.ts`, `frontend/src/lib/proxy.ts`.
Приватные поездки в SSR читают токен из cookie `vela_token`.

---

## 3. Структура БД (Prisma)

Каноничная схема: `backend/prisma/schema.prisma` (копия для справки — `database/prisma/schema.prisma`).

**География/контент:** `Country → Region → City → Place`, `SeasonInsight`.
**Поездка:** `Trip` → `RouteVariant` (CALM/BALANCED/ACTIVE) → `Day` → `DayPlace`/`TransportLeg`;
`BudgetBreakdown`→`BudgetLine`; `TripScore`; `TripOpinion`; `Hotel` (адрес/координаты/даты/фото).
**Планирование (Фаза 1–2):** `Ticket`, `TripDocument`, `CalendarEvent`→`Reminder`, `ChatMessage`.
**Воспоминания (Фаза 3):** `Album`→`Photo`, `Memory`.
**Auth/RBAC:** `User`, `TripMember`, `AuditLog`, `SavedTrip`.

**Ключевые enum'ы:** `TripStatus` (DRAFT/PUBLISHED/HIDDEN), `TripVisibility` (PUBLIC/PRIVATE),
`UserRole` (SUPER_ADMIN/ADMIN/ORGANIZER/MEMBER), `UserStatus` (ACTIVE/BLOCKED),
`TripMemberRole` (ORGANIZER/MEMBER), `TicketKind`, `CalendarEventType`, `ReminderChannel`,
`Pace`, `DataStatus`, `BudgetCategory`, `TransportMode`.

**Провенанс:** на `Place`/`TransportLeg`/`BudgetLine`/`SeasonInsight` поля
`source/sourceUrl/dataStatus/trustLevel/fetchedAt`.

### Миграции
**Сейчас миграций НЕТ.** Схема применяется при старте контейнера командой
`npx prisma db push` (см. `backend/Dockerfile` CMD и `docker-compose.yml`).
Папки `backend/prisma/migrations` не существует.
➡️ Рекомендация: при стабилизации перейти на `prisma migrate` (создать baseline-миграцию,
заменить `db push` на `migrate deploy` в Dockerfile/compose).

---

## 4. RBAC (модель доступа)

- Глобальные роли: `SUPER_ADMIN` (всё) > `ADMIN` (пользователи, поездки, статистика, аудит) >
  `ORGANIZER` (создание/редактирование поездок, участники, планирование) > `MEMBER` (участник).
- Роль в поездке: `TripMember.role` (ORGANIZER/MEMBER).
- Guards: `JwtAuthGuard` (проверяет Bearer-токен, грузит юзера, блокирует BLOCKED),
  `RolesGuard` (`@Roles(...)`, SUPER_ADMIN проходит везде). Декораторы: `@Roles`, `@CurrentUser`, `@Public`.
  Файлы: `backend/src/modules/auth/auth.guards.ts`, `auth.decorators.ts`, `common/jwt.ts`.
- Первый Super Admin создаётся на старте из `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD` (idempotent,
  `auth.module.ts` `onModuleInit`).
- Токен на клиенте: `localStorage('vela_token')` + cookie `vela_token` (для SSR приватных поездок).

Доступ к редактированию поездки: `ORGANIZER`+ (PATCH/POST `/trips`), удаление: `ADMIN`+ (DELETE).
Приватная поездка видна `ADMIN`/`SUPER_ADMIN` и участникам.

---

## 5. Backend-модули и ключевые эндпоинты

`backend/src/modules/`: `auth`, `admin`, `planning`, `trips`, `uploads`, `email`, `audit`,
`prisma`, `health`, `analytics`, `integrations`, `recommendations`, `routes`.

| Метод | Маршрут | Доступ |
|------|---------|--------|
| POST | `/api/auth/register` `/login` `/forgot-password` `/reset-password` `/verify-email` | публично |
| GET | `/api/auth/me` | вошедший |
| POST | `/api/auth/resend-verification` | **❗ ещё не реализован контроллер** (метод в сервисе готов) |
| GET | `/api/trips` | публично (только PUBLIC+PUBLISHED) |
| GET | `/api/trips/:slug` | опц. auth (приватные — только доступным) |
| POST | `/api/trips` | ORGANIZER+ |
| PATCH | `/api/trips/:slug` | ORGANIZER+ (поля + status/visibility/архив) |
| DELETE | `/api/trips/:slug` | ADMIN+ |
| POST | `/api/uploads` | вошедший (image/pdf → Supabase или диск) |
| GET | `/api/trips/:slug/planning` | вошедший |
| POST/DELETE | tickets/documents/events/hotels | ORGANIZER+ |
| GET/POST | `/api/trips/:slug/chat` | вошедший |
| GET/POST/DELETE | `/api/trips/:slug/members` (invite by email) | ORGANIZER+ |
| GET/POST/DELETE | memories: albums/photos/memories, `/timeline` | вошедший (delete — ORGANIZER+) |
| GET | `/api/admin/stats` `/users` `/audit` | ADMIN+ |
| PATCH/POST/DELETE | `/api/admin/users/:id/...` (role/block/verify/reset/delete) | ADMIN+ (role/delete — SUPER_ADMIN) |

Reminder-воркер: `PlanningService` каждые 60с шлёт просроченные email-напоминания.

---

## 6. Frontend (App Router)

Страницы (`frontend/src/app`): `/`, `/login`, `/register`, `/forgot-password`,
`/reset-password`, `/verify-email`, `/admin` (CMS поездок), `/admin/users` (дашборд+юзеры+аудит),
`/trips/[slug]`, `/trips/[slug]/edit`, `/trips/[slug]/plan` (вкладки: Билеты/Отели/Документы/
Календарь/Участники/Воспоминания/Чат). Прокси-роуты: `/api/[...path]`, `/uploads/[...path]`.

**Дизайн-система:** HSL CSS-переменные в `frontend/src/app/globals.css` (`:root` светлая,
`.dark` тёмная); Tailwind-токены (`ink/paper/aurora`) в `frontend/tailwind.config.ts` ссылаются
на переменные. Тема: класс `.dark` на `<html>`, дефолт — светлая; переключатель
`components/ui/ThemeToggle.tsx` (событие `vela-theme`).
**UI-примитивы:** `components/ui/Toaster.tsx` (`toast.success/error/info`), `Skeleton.tsx`,
`EmptyState.tsx` (иконка по умолчанию — компас).
**Декор:** `components/decor/TravelDecor.tsx` — `Constellation`/`RoutePath`(самолёт по SMIL)/
`Contours`/`CompassRose`. Всё `pointer-events-none`, в пустых зонах.
**API-клиент:** `frontend/src/lib/api.ts`, `auth.ts`, `admin.ts`, `planning.ts`.

---

## 7. Реализованные функции (готово, в проде)

- **Фаза 0 — Auth/RBAC:** регистрация/вход/сброс пароля/подтверждение email, JWT+bcrypt,
  роли, guards, первый Super Admin из env, защита write-эндпоинтов, аудит-лог.
- **Хранилище:** S3-адаптер → **Supabase Storage** (подключено, файлы переживают передеплой),
  поддержка image+PDF.
- **Фаза 1:** билеты (рейс/перевозчик/откуда-куда/даты/PDF), документы, календарь
  (по дням/месяц), напоминания (1ч/1д/1нед/произвольно, email-воркер).
- **Фаза 2:** отели (адрес/координаты/даты/фото), карта маршрута (Leaflet/OSM, точки+отели),
  чат участников (HTTP polling каждые 4с).
- **Фаза 3:** приватные поездки, приглашение участников по email (создаёт аккаунт-инвайт +
  письмо «установить пароль»), воспоминания (альбомы/дневник/лента-timeline).
- **Редактирование поездок** (ORGANIZER+): поля + статус (архив через HIDDEN) + доступ.
- **Дизайн:** спокойная тёплая палитра, светлая/тёмная темы, тосты, skeleton, empty states,
  адаптив, тревел-арт (созвездие Vela, маршруты, контуры, компас).
- **Деплой:** Render Blueprint (db+api+web), runtime-прокси, фикс холодного старта/HOSTNAME.

CMS: создание/удаление/редактирование поездок без кода. Маршрут Китая засеян (фото мест из
Wikipedia, координаты `ESTIMATED`, цены/время `PENDING`).

---

## 8. Открытые задачи (продолжать отсюда)

### A. Email-верификация через Resend (в работе)
Пользователь зарегистрировался в Resend. Нужно:
1. **Дореализовать `resend-verification`:** добавить в `backend/src/modules/auth/auth.module.ts`
   эндпоинт `POST /auth/resend-verification` (под `@UseGuards(JwtAuthGuard)`), вызывающий
   уже добавленный `AuthService.resendVerification(user.id)`.
2. Во `frontend/src/lib/auth.ts` добавить `auth.resendVerification()`.
3. Сделать баннер для невёрифицированных (client-компонент, проверяет `auth.me().emailVerified`,
   кнопка «Отправить письмо снова» → toast). Смонтировать в `layout.tsx` или на ключевых страницах.
4. **Настройка владельцем (Render → vela-api → Environment):** задать `RESEND_API_KEY`,
   `EMAIL_FROM` и `APP_URL=https://vela-web-zr2u.onrender.com`. На free-тарифе Resend без
   верифицированного домена `from` ограничен `onboarding@resend.dev` и письма уходят только на
   email владельца аккаунта — для рассылки всем нужен верифицированный домен в Resend.
5. (Опц.) Мягко гейтить часть действий до верификации (без жёсткой блокировки, чтобы не залочить).

### B. Функция 4 — остаток админки
- **Управление поездками в админке:** эндпоинт `GET /api/admin/trips?search=&status=&visibility=`
  (все поездки, ADMIN+; в `admin.module.ts`) + страница `/admin/trips` (таблица, смена статуса
  через существующий `PATCH /trips/:slug`, архив=HIDDEN, удаление). Ссылка в навигации админки.
- **Расширенная аналитика:** дополнить `GET /api/admin/stats` счётчиками documents/photos/
  memories/messages; вывести на дашборде `/admin/users`.
- **Модерация контента:** скрыть/восстановить/удалить фото/сообщения/воспоминания.
  Потребуется поле `hidden Boolean @default(false)` на `ChatMessage`/`Photo`/`Memory` +
  admin-эндпоинты + UI. Сейчас есть только удаление через planning-роуты (ORGANIZER+).
- **Настройки платформы:** модель `PlatformSetting (key/value)` + раздел в админке
  (вкл/выкл email, настройки и т.п.).

### C. Дизайн/качество (полировка)
- Довести тёмную тему до 9/10 по всем страницам; тосты+skeleton во все клиентские формы
  (планировщик, edit); заменить оставшиеся `alert()`.
- (Опц.) полная миграция компонентов на готовые shadcn/ui через CLI (сейчас внедрена
  только система токенов + примитивы).

### D. Инфраструктура/прод-хардненинг
- Перейти с `prisma db push` на `prisma migrate` (baseline + `migrate deploy`).
- httpOnly-cookie для JWT вместо localStorage; rate-limit на `/auth`.
- Подключить недельный вид календаря; реальные данные по времени переездов Китая (Tier-1/2).
- Keep-alive (UptimeRobot) против засыпания Render free (иначе воркер напоминаний спит).

---

## 9. Переменные окружения

`.env.example` — полный список. Ключевые на **vela-api** (Render):
```
DATABASE_URL            # из Render Postgres (Blueprint подставляет)
NODE_ENV=production
JWT_SECRET              # генерится Render (generateValue)
JWT_EXPIRES=7d
APP_URL                 # = https://vela-web-zr2u.onrender.com (для ссылок в письмах)
SUPERADMIN_EMAIL        # логин супер-админа (владелец задал)
SUPERADMIN_PASSWORD     # пароль супер-админа (владелец задал)
RESEND_API_KEY          # ❗ задать для реальных писем (Resend)
EMAIL_FROM              # напр. "Vela <onboarding@resend.dev>"
# Хранилище (Supabase Storage, уже подключено):
S3_ENDPOINT=https://yqmxwrpjujfaareyykjj.storage.supabase.co/storage/v1/s3
S3_REGION=eu-central-1
S3_BUCKET=uploads
S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY
S3_PUBLIC_URL=https://yqmxwrpjujfaareyykjj.supabase.co/storage/v1/object/public/uploads
```
На **vela-web** (Render): только `BACKEND_URL=https://vela-api-8rta.onrender.com` (runtime).
Карта работает без ключей (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` не нужен — используем OSM/Leaflet).
Интеграции (`BOOKING_API_KEY` и пр.) — опциональны, адаптеры без ключа возвращают NOT_CONFIGURED.

---

## 10. Как запускать / проверять

**Прод-деплой:** просто `git push origin main` → Render auto-deploy (Blueprint `render.yaml`).

**Локально через Docker:**
```bash
cd /Users/marat/Desktop/Repository
cp .env.example .env   # заполнить значения (JWT_SECRET, SUPERADMIN_*, S3_* при желании)
docker compose up --build      # db:5432, api:4000, web:3000
```
> backend на старте: `prisma db push` → seed (best-effort) → старт. Образ backend — `node:20-slim`
> (Prisma + OpenSSL). Frontend — standalone, `ENV HOSTNAME=0.0.0.0`.

**Быстрые UI-итерации (Next dev + Preview MCP), Node нужен локально:**
```bash
brew install node
cd frontend && npm install
docker compose stop web                # освободить порт 3000 (db+api оставить)
# launch.json для Preview MCP уже есть в "<рабочая папка Claude>/.claude/launch.json"
# (команда: cd frontend && BACKEND_URL=http://localhost:4000 npm run dev -- --port 3000)
```
Затем Preview MCP: `preview_start` → `preview_screenshot`/`preview_inspect`/`preview_resize`
(светлая/тёмная, мобайл). `.claude/` в .gitignore (локальный helper).
Проверка прод-сборки фронта: `cd frontend && BACKEND_URL=http://localhost:4000 npm run build`.

**Тесты бэкенда:** `cd backend && npm test` (jest, есть `test/scoring.spec.ts`).

---

## 11. Текущий статус

- **В проде, работает:** Фазы 0–3 + редактирование + хранилище Supabase + новый дизайн/арт.
- **Незакоммичено:** `auth.service.ts` (метод `resendVerification`) — часть задачи A.
- **Готовность к продакшену:** функционально ~85% по ТЗ. Не закрыто: остаток Функции 4
  (управление поездками/модерация/настройки/аналитика в админке), Resend-верификация (дореализовать
  + настроить ключ), прод-хардненинг (миграции, httpOnly cookie, rate-limit, keep-alive).

## 12. Рекомендованный порядок дальнейшей работы
1. **Задача A** (Resend) — дореализовать эндпоинт + клиент + баннер; попросить владельца задать
   `RESEND_API_KEY`/`EMAIL_FROM`/`APP_URL` на Render; проверить письмо.
2. **Задача B** (Функция 4) — admin trips management + расширенная аналитика (быстро и ценно),
   затем модерация + настройки (схема + UI).
3. **Задача C/D** — полировка тёмной темы и прод-хардненинг.

После каждого изменения: `npm run build` (фронт) / `docker compose build` (бэк) для проверки,
затем `git commit` + `git push` (Render задеплоит). UI проверять через Preview MCP скриншотами.
Соблюдать **Real Data Policy** (не выдумывать цифры) и спокойную тёплую палитру.

— Конец хендоффа —
