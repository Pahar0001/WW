# Vela — PROJECT HANDOFF

> Документ для продолжения работы в новом чате Claude Code **без доступа к истории переписки**.
> Прочитай целиком, затем продолжай с раздела **«Открытые задачи»**.
> Последнее обновление: **2026‑07‑17**. Ветка: `main`, всё запушено (HEAD = `1a6d9a1`).

---

## 0. Где работать (начни отсюда)

```
Рабочая папка:          /Users/marat/Desktop/Repository
GitHub (origin/main):   https://github.com/Pahar0001/WW
Прод (сайт, домен):     https://velatrips.ru      (= vela-web на Render)
Прод (фронтенд Render): https://vela-web-zr2u.onrender.com
Прод (API):             https://vela-api-8rta.onrender.com
API health:             https://vela-api-8rta.onrender.com/api/health
Запасной домен:         velatrips.online (куплен, не подключён)
```

Первым делом:
```bash
cd /Users/marat/Desktop/Repository
git status          # untracked: backend/dist-seed/, backend/package-lock.json,
                    # frontend/tsconfig.tsbuildinfo — НЕ коммитить (артефакты)
git log --oneline -12
```

**Деплой:** `git push origin main` → Render авто‑деплоит по Blueprint (`render.yaml`): db + api + web.
Коммитить только относящиеся к задаче файлы. Заканчивай сообщения коммитов строкой:
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## 1. Что это за проект

**Vela** — премиальная платформа планирования и совместной организации путешествий (RU‑интерфейс)
с социальным слоем. Готовые маршруты, конструктор по дням, карты, бюджет, автооценка трат,
билеты/документы/календарь, отели, чат участников, фотоальбомы/воспоминания, **калькулятор общих
расходов (с точными суммами на человека)**, приватные поездки, приглашения по email,
**соцсеть** (лента/новости/друзья/уведомления/профили), **сообщество по странам** (визы/документы),
**ИИ‑консультант (Groq)**, **чат поддержки**, авторизация + RBAC + админка.

Засеяно два маршрута: «China — The Floating Mountains» (публичный) и «Санкт‑Петербург — Белые ночи
и фонтаны» (приватный, владелец — Super Admin, 3 дня).

**Главные принципы:**
- **Real Data Policy:** не выдумывать цены/расстояния/время/погоду; неизвестное → `dataStatus: PENDING`.
  Бюджет и «примерные траты» — `ESTIMATED` (оценка), не котировка. Соц‑контент под правило не подпадает.
  Публично объяснено на странице `/data`.
- **Дизайн (актуальный):** **крем + приглушённое антикварное золото + тёплый уголь**, премиальный
  «дорогой» вид, спокойный фон (лёгкий шань‑шуй: солнце, облака, холмы, сакура — всё приглушено).
  Светлая (по умолчанию) + тёмная темы. **Курсор системный** (кастомный удалён).

---

## 2. Стек технологий

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 14.2 (App Router, TS), Tailwind (HSL‑токены в стиле shadcn), Framer Motion, Leaflet+OSM (карты, без ключей) |
| Backend | NestJS 10, Prisma 5.22, REST, zod‑валидация |
| БД | PostgreSQL 16 |
| Auth | Своя: JWT (`jsonwebtoken`) + `bcryptjs`, guards/decorators (без passport) |
| Файлы | S3‑совместимый адаптер (Supabase Storage), **fallback на локальный диск при сбое S3** |
| Email | `EmailService` → Resend (домен `velatrips.ru` верифицирован); без `RESEND_API_KEY` — ссылка/код в лог |
| ИИ | **Groq** (OpenAI‑совместимый API), модель `llama-3.3-70b-versatile` |
| Деплой | Render Blueprint (`render.yaml`): db + api + web; Docker. Домен `velatrips.ru` (reg.ru, DNS в панели reg.ru) |
| Локально | Docker Compose; для UI — Next dev + Preview MCP (Node: `brew install node`) |

---

## 3. Архитектура

**Ключевая особенность — runtime‑прокси.** Браузер всегда зовёт свой origin (`/api/*`, `/uploads/*`),
Next‑сервер форвардит на `BACKEND_URL`. Это убирает CORS и build‑time URL. Серверные компоненты
зовут бэкенд напрямую через `BACKEND_URL`. Приватные поездки в SSR читают токен из cookie `vela_token`.

```
Браузер ──▶ Next.js (web) ──proxy /api,/uploads──▶ NestJS (api) ──▶ PostgreSQL
                                                        └──▶ Supabase Storage (S3)
                                                        └──▶ Resend (email)
                                                        └──▶ Groq (ИИ-консультант)
```

Файлы прокси: `frontend/src/app/api/[...path]/route.ts`, `frontend/src/app/uploads/[...path]/route.ts`,
`frontend/src/lib/proxy.ts`.
Бэкенд имеет глобальный префикс `api` (`backend/src/main.ts`) → контроллер с `@Controller()` и
`@Get('feed')` отвечает на `/api/feed`.

---

## 4. Структура БД (Prisma)

Каноничная схема: `backend/prisma/schema.prisma`.
**Копия для справки:** `database/prisma/schema.prisma` — держать в синхроне (копировать после правок).

**География/контент:** `Country → Region → City → Place`, `SeasonInsight`.
**Поездка:** `Trip` → `RouteVariant` (CALM/BALANCED/ACTIVE) → `Day` → `DayPlace`/`TransportLeg`;
`BudgetBreakdown`→`BudgetLine`; `TripScore`; `TripOpinion`; `Hotel`. `Trip` имеет `startWindow`/`endWindow`.
**Планирование:** `Ticket`, `TripDocument`, `CalendarEvent`→`Reminder`, `ChatMessage`, **`Expense`**.
**Воспоминания:** `Album`→`Photo`, `Memory`.
**Поддержка:** `SupportMessage` (1:1 тред пользователь ↔ super admin).
**Соцсеть:** `Post`, `Like` (полиморфный), `Comment` (полиморфный), `Repost`, `Friendship`, `Notification`.
**Сообщество:** **`CommunityMessage`**.
**Auth/RBAC:** `User`, `TripMember`, `AuditLog`, `SavedTrip`.

### Ключевые модели

**`User`:** `email`, `name`, `image`, `bio`, `passwordHash`, `role`, `status`, `emailVerified`,
`emailVerifyToken` (6‑значный код), `emailVerifyExpiry` (15 мин), `passwordResetToken`,
`passwordResetExpiry`, **`termsAcceptedAt`** (null = показать блокирующую модалку соглашения).
`/auth/me` и логин возвращают `image`/`bio`/`termsAcceptedAt`.

**`TripMember`:** `tripId`+`userId` (unique), `role` (`ORGANIZER`/`MEMBER`).
**У `Trip` нет поля владельца** — владелец = `TripMember(role=ORGANIZER)`, создаётся автоматически.

**`Expense` (калькулятор расходов):** `tripId`, `paidById`, `description`, `amount` (Int, **в копейках**),
`currency` (RUB), `date`, `participants String[]`, **`shares Int[]`**, **`exactSplit Boolean`**, `createdById`.
- `exactSplit=false` (по умолчанию) → `shares` = **веса** (пусто/равные = поровну).
- `exactSplit=true` → `shares` = **точные суммы на человека в копейках**, `amount` = их сумма
  (пересчитывается на сервере, авторитетно).

**`CommunityMessage` (сообщество по странам):** `country` (код из `common/countries.ts`), `userId`,
`text`, `parentId` (null = вопрос, иначе ответ — **один уровень вложенности**), `createdAt`.
Индекс `[country, parentId, createdAt]`.

**`Like`/`Comment`:** `userId`, `targetType (SocialTarget = TRIP|POST)`, `targetId` (+ `text` у Comment).
**`Friendship`:** `requesterId`, `addresseeId` (unique пара), `status (PENDING|ACCEPTED)`.
**`Notification`:** `userId`, `type (FRIEND_REQUEST|FRIEND_ACCEPT|LIKE|COMMENT|REPOST)`, `actorId?`,
`targetType?`, `targetId?`, `read`.

**Enum'ы:** `TripStatus`, `TripVisibility`, `Pace`, `UserRole` (SUPER_ADMIN/ADMIN/ORGANIZER/MEMBER),
`UserStatus`, `TripMemberRole`, `TicketKind`, `CalendarEventType`, `ReminderChannel`, `DataStatus`,
`BudgetCategory`, `TransportMode`, `SocialTarget`, `FriendStatus`, `NotificationType`.

**Провенанс:** на `Place`/`TransportLeg`/`BudgetLine`/`SeasonInsight` — `source`, `sourceUrl`,
`dataStatus`, `trustLevel`, `fetchedAt`.

---

## 5. Миграции

**Формальных миграций НЕТ.** Схема применяется при старте контейнера: `npx prisma db push`
(см. `backend/Dockerfile` CMD и `docker-compose.yml`). Папки `backend/prisma/migrations` не существует.

Все поля/модели добавлялись через `db push` (nullable или с `@default` — безопасно):
`emailVerifyExpiry`, `Expense` (+ `shares`), `SupportMessage`, `User.bio`, соц‑модели
(`Post`/`Like`/`Comment`/`Repost`/`Friendship`/`Notification`), `Trip.startWindow/endWindow`,
**`User.termsAcceptedAt`**, **`CommunityMessage`**, **`Expense.exactSplit`**.

Локально применить:
```bash
cd backend
DATABASE_URL='postgresql://vela:change_me_in_production@localhost:5432/vela?schema=public' \
  npx prisma db push --skip-generate
npx prisma generate
cp prisma/schema.prisma ../database/prisma/schema.prisma   # синхронизировать копию
```
➡️ **Рекомендация:** при стабилизации перейти на `prisma migrate` (baseline + `migrate deploy`).

---

## 6. RBAC (модель доступа)

- Роли: `SUPER_ADMIN` > `ADMIN` > `ORGANIZER` > `MEMBER`.
- Роль в поездке: `TripMember.role` (ORGANIZER/MEMBER) — меняется в планировщике («Участники»).
- Guards: `JwtAuthGuard` (Bearer, блокирует BLOCKED), `RolesGuard` (`@Roles(...)`, SUPER_ADMIN проходит везде).
  Декораторы: `@Roles`, `@CurrentUser`, `@Public`.
  Файлы: `backend/src/modules/auth/auth.guards.ts`, `auth.decorators.ts`, `common/jwt.ts`.
  Опциональная авторизация (гость) — ручной разбор Bearer (`optionalUserId`/`optionalAccessor`).
- Первый Super Admin создаётся на старте из `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD`
  (idempotent, `auth.module.ts` `onModuleInit`, `emailVerified=true`).
- Токен на клиенте: `localStorage('vela_token')` + cookie `vela_token` (для SSR приватных поездок).

**Доступ к поездкам:**
- Создание `/trips`: любой авторизованный. Не‑админ → поездка принудительно **PRIVATE** (сервер форсит).
- Копирование `/trips/:slug/copy`: любой авторизованный, только PUBLIC → приватная копия себе.
- Редактирование (PATCH): `ORGANIZER`+. Удаление (DELETE): `ADMIN`+.
- Приватная поездка видна `ADMIN`/`SUPER_ADMIN` и участникам.
- Соц‑действия, сообщество (публикация), ИИ‑консультант: любой авторизованный.
- Чат поддержки: пользователь видит свой тред; инбокс и ответы — только `SUPER_ADMIN`.

---

## 7. Backend‑модули и эндпоинты

`backend/src/modules/`: `auth`, `admin`, `planning`, `trips`, `social`, `network`, `community`,
`assistant`, `support`, `uploads`, `email`, `audit`, `prisma`, `health`, `analytics`, `integrations`,
`recommendations`, `routes`.
`backend/src/common/`: `budget.ts`, `estimate.ts`, `countries.ts`, `jwt.ts`, `scoring.ts`.
Все маршруты под глобальным префиксом `/api`.

| Метод | Маршрут | Доступ |
|------|---------|--------|
| POST | `/api/auth/register` `/login` `/forgot-password` `/reset-password` | публично |
| POST | `/api/auth/verify-email` `{email, code}` · `/resend-verification` | публично / вошедший |
| POST | `/api/auth/accept-terms` | вошедший |
| GET | `/api/auth/me` | вошедший (name/image/bio/role/termsAcceptedAt) |
| GET | `/api/trips` · `/api/trips/mine` · `/api/trips/:slug` | публично / вошедший / опц. auth |
| GET | **`/api/trips/:slug/estimate?travelers=&comfort=`** (автооценка трат) | опц. auth |
| POST | `/api/trips` · `/api/trips/:slug/copy` | вошедший |
| PATCH/DELETE | `/api/trips/:slug` | ORGANIZER+ / ADMIN+ |
| POST | `/api/uploads` (image/pdf → Supabase или диск) | вошедший |
| GET | `/api/trips/:slug/planning` | вошедший |
| POST/DELETE | tickets/documents/events/hotels | ORGANIZER+ |
| GET/POST | `/api/trips/:slug/chat` | вошедший |
| GET/POST/DELETE | `/api/trips/:slug/expenses`, `DELETE /api/expenses/:id` | вошедший (участник) |
| GET/POST/DELETE | `/api/trips/:slug/members` (invite by email) · PATCH `/members/:userId/role` | ORGANIZER+ |
| GET/POST/DELETE | memories: albums/photos/memories, `/timeline` | вошедший (delete — ORGANIZER+) |
| GET | `/api/feed` | опц. auth |
| GET/POST | `/api/news`, `DELETE /api/posts/:id` | опц. auth / вошедший |
| POST | `/api/like` `{targetType,targetId}` (toggle) | вошедший |
| GET/POST | `/api/comments?targetType=&targetId=`, `DELETE /api/comments/:id` | опц. / вошедший |
| POST | `/api/reposts/:tripId` (toggle) | вошедший |
| GET | `/api/users?search=`, `/api/users/:id` | вошедший |
| GET/POST/DELETE | `/api/friends`, `/api/friends/:userId[/accept]` | вошедший |
| GET/POST | `/api/notifications`, `/api/notifications/read` | вошедший |
| GET/PATCH | `/api/profile` | вошедший |
| GET/POST | `/api/support/thread` | вошедший |
| GET/POST | `/api/support/threads[/:userId]` | SUPER_ADMIN |
| **GET** | **`/api/community/rooms`** · **`/api/community/:country`** | публично |
| **POST** | **`/api/community/:country`** `{text, parentId?}` · **DELETE** `/api/community/messages/:id` | вошедший (delete — свой или ADMIN) |
| **GET/POST** | **`/api/assistant/status`** · **`/api/assistant/chat`** `{messages[]}` | вошедший |
| GET | `/api/admin/stats` `/users` `/audit` `/trips` | ADMIN+ |
| PATCH/POST/DELETE | `/api/admin/users/:id/...` | ADMIN+ (role/delete — SUPER_ADMIN) |

### Ключевая бизнес‑логика

**Калькулятор расходов (`planning.service.ts`):** суммы в копейках.
- *Веса:* деление пропорционально `shares`, остаток раздаётся по 1 копейке наибольшим дробным частям — без потери копеек.
- *Точные суммы (`exactSplit`):* плательщику начисляется весь чек, каждому участнику — его точная сумма.
- `computeSettlement` → нетто‑балансы + **минимальный набор переводов** (жадный зачёт) = «кто кому
  одним платежом». Отчёт также группируется по дням.

**Автооценка трат (`common/estimate.ts`, `trips.service.estimateSpend`):** параметрическая модель.
Вход: длительность и число городов (берутся из поездки автоматически) + `travelers` + `comfort`
(BUDGET/STANDARD/COMFORT). Выход: суммы по категориям, итог на человека и группу, диапазон ±18%,
резерв 10%. Всё `dataStatus: ESTIMATED`. Ставки — в одном месте, помечены как допущения.

**Envelope‑бюджет (`common/budget.ts`):** распределяет заявленный диапазон бюджета по долям категорий
с учётом темпа. Работает только при заданном `budgetMinRub/budgetMaxRub`.

**ИИ‑консультант (`assistant.service.ts`):** Groq chat completions, системный промпт про маршруты/визы/
документы + Real Data Policy (не выдумывать цены/сроки, советовать официальные источники). История
обрезается до последних ~12 сообщений. Без `GROQ_API_KEY` — вежливая заглушка (не падает).

**Сообщество (`community.service.ts`):** комнаты = страны из `common/countries.ts` (30 шт., единый
источник). `rooms()` отдаёт счётчики и последнюю активность, сортируя активные вверх. Ответ на ответ
запрещён (400). Удаление — автор или ADMIN.

**Соглашение (`auth.service.acceptTerms`):** idempotent, пишет `termsAcceptedAt`, audit‑лог.

**Уведомления (`social.service.ts`/`network.service.ts`):** сайд‑эффекты, никогда себе. Заявка → адресату;
принятие → отправителю; лайк/коммент поста → автору; лайк/коммент/репост поездки → ORGANIZER‑участникам.

**Копирование (`trips.service.copyTrip`):** клонирует весь граф публичной поездки в новую PRIVATE,
копирующий = ORGANIZER.

**Хранилище (`uploads/storage.service.ts`):** при сбое S3 **не отдаёт 500** — логирует реальную ошибку
и падает на локальный диск. ⚠️ Для Supabase `S3_REGION` должен быть **реальным регионом проекта**
(например `eu-central-1`), а не `auto` — иначе ломается подпись запроса.

**Reminder‑воркер:** `PlanningService` каждые 60с шлёт просроченные email‑напоминания.

---

## 8. Frontend (App Router)

**Страницы** (`frontend/src/app`): `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`,
`/verify-email`, **`/terms`**, **`/data`**, `/admin`, `/admin/users`, `/admin/support`,
`/trips/[slug]`, `/trips/[slug]/edit`, `/trips/[slug]/plan`, `/trips/new`, `/feed`, `/news`,
**`/community`**, **`/community/[country]`**, `/network`, `/notifications`, `/profile`, `/u/[id]`.
Прокси‑роуты: `/api/[...path]`, `/uploads/[...path]`. Фавикон: `app/icon.svg` (парусник, авто‑подключение Next).

**Дизайн‑система:** HSL CSS‑переменные в `globals.css` (`:root` светлая, `.dark` тёмная);
Tailwind‑токены (`ink`/`paper`/`aurora`) в `tailwind.config.ts`.
Актуальная палитра: `--bg` крем, `--fg` тёплый уголь, `--primary` приглушённое золото
(`text-aurora`/`bg-aurora`), `--primary-fg` эспрессо (тёмный текст на золоте).
Утилиты `.shadow-soft` / `.shadow-soft-lg`. Тема: класс `.dark` на `<html>`, дефолт светлая,
переключатель `ThemeToggle`. **Курсор системный** (кастомный `MagneticCursor` удалён).

**UI‑примитивы:** `Toaster.tsx` (`toast.success/error/info`), `Skeleton.tsx`, `EmptyState.tsx`, `Reveal.tsx`.

**Навигация:** `SiteHeader.tsx` (десктоп: Путешествия / Честные данные → `/data` / Лента / Новости /
Сообщество / Люди + колокольчик + аватар‑меню; мобайл — бургер). `BottomNav.tsx` — мобильная нижняя
панель (Лента/Новости/**Страны**/Люди/Уведом./Профиль). `SocialTabs.tsx` — вкладки соц‑страниц.
В `layout.tsx` смонтированы: `SiteScenery`, `SupportWidget`, **`AssistantWidget`**, `BottomNav`,
**`TermsGate`**, `Toaster`.

**Декор (шань‑шуй, приглушённый):** `decor/SiteScenery.tsx` (солнце, 2 облака, холмы, 4 лепестка),
`decor/SakuraTree.tsx` (`opacity-40`, только десктоп), `decor/TravelDecor.tsx`.
Бегущая строка: **`ui/Marquee.tsx`** (48с, пауза при наведении, золотые ✦) на главной.
Меню главной: **`ui/HomeMenu.tsx`** (Маршруты / Собрать поездку / Сообщество / Лента / ИИ‑консультант;
плитка ИИ шлёт событие `vela:open-assistant`).

**API‑клиенты (`frontend/src/lib/`):** `api.ts` (trips, `getTripEstimate`, `uploadImage`, `copyTrip`),
`auth.ts` (`AuthUser` c `termsAcceptedAt`, `acceptTerms`; `setToken` шлёт событие `vela:auth-changed`),
`admin.ts`, `planning.ts` (билеты/отели/…/expenses c `exactSplit`), `social.ts`, `network.ts`,
**`community.ts`**, **`assistant.ts`**, `support.ts`, **`terms.ts`** (текст соглашения — единый источник
для `/terms` и модалки), `proxy.ts`.

---

## 9. Реализованные функции (готово)

- **Auth/RBAC:** регистрация/вход/сброс пароля, JWT+bcrypt, роли, guards, первый Super Admin из env,
  аудит‑лог; email‑верификация 6‑значным кодом через Resend, страница `/verify-email`, баннер.
- **Пользовательское соглашение:** блокирующая модалка `TermsGate` после подтверждения email
  (без принятия сайт недоступен), страница `/terms`, `User.termsAcceptedAt`, `/auth/accept-terms`.
- **Хранилище:** S3‑адаптер → Supabase Storage, **фолбэк на диск при сбое** + ошибки видны тостом.
- **Планирование:** билеты, документы, календарь, напоминания (email‑воркер), отели, карта маршрута
  (Leaflet/OSM), чат участников (polling 4с).
- **Приватные поездки**, приглашение по email, воспоминания (альбомы/дневник/timeline).
- **Создание поездок участниками** (`/trips/new`, темп + даты), **копирование публичных поездок**.
- **Калькулятор общих расходов:** кто платил, между кем делить, **веса ИЛИ точные суммы на человека**,
  «кто кому должен» одним платежом (точные копейки, минимум переводов) + отчёт по дням.
- **Автооценка трат** («Примерные траты» на странице поездки): переключатели путешественников/комфорта,
  живой пересчёт, диапазон, ESTIMATED.
- **Соцсеть:** лента, новости‑микроблог, друзья, уведомления, профили (`/profile`, `/u/:id`).
- **Сообщество по странам** (`/community`): 30 комнат, вопросы и ответы (1 уровень), публичное чтение,
  публикация/удаление — вошедшим, опрос 5с.
- **ИИ‑консультант (Groq):** плавающий виджет, открывается кнопкой и из меню главной.
- **Чат поддержки:** виджет → super admin; инбокс `/admin/support`.
- **Админка/CMS:** создание/удаление/редактирование поездок, список всех поездок, дашборд/пользователи/аудит.
- **Страница «Честные данные»** `/data`: принципы, три статуса, провенанс, оценки, исключение.
- **Дизайн:** крем‑золотая премиум‑палитра, бегущая строка, меню главной, оригинальная кнопка
  «Все маршруты», адаптивная шапка + нижняя навигация, светлая/тёмная темы, фавикон‑парусник.
- **Деплой:** Render Blueprint (db+api+web), runtime‑прокси, домен `velatrips.ru` (SSL).

---

## 10. Переменные окружения

Полный список — `.env.example`. Прод‑шаблон для VPS — `.env.prod.example`.

**Ключевые на `vela-api` (Render):**
```
DATABASE_URL            # из Render Postgres (Blueprint подставляет)
NODE_ENV=production
JWT_SECRET              # генерится Render (generateValue)
JWT_EXPIRES=7d
APP_URL=https://velatrips.ru
SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD
RESEND_API_KEY          # ЗАДАН на проде
EMAIL_FROM=Vela <no-reply@velatrips.ru>
GROQ_API_KEY            # ⚠️ НЕ ЗАДАН — ИИ-консультант отвечает заглушкой
GROQ_MODEL=llama-3.3-70b-versatile
S3_ENDPOINT / S3_REGION / S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY / S3_PUBLIC_URL
```
На **`vela-web`** (Render): только `BACKEND_URL=https://vela-api-8rta.onrender.com` (runtime).
Карта работает без ключей (OSM/Leaflet). Интеграции (`BOOKING_API_KEY` и пр.) — опциональны, off.

Локально (`.env`, Docker): `POSTGRES_USER/PASSWORD/DB=vela/change_me_in_production/vela`,
`DATABASE_URL=postgresql://vela:change_me_in_production@db:5432/vela?schema=public`.

---

## 11. Как запускать / проверять

**Прод‑деплой:** `git push origin main` → Render auto‑deploy (Blueprint `render.yaml`).

**Локально (Docker):**
```bash
cd /Users/marat/Desktop/Repository
cp .env.example .env
docker compose up --build     # db:5432, api:4000, web:3000
```
> Бэкенд на старте: `prisma db push` → seed (best‑effort) → старт.
> **После правок бэка/схемы:** `docker compose up -d --build backend`.
> Обычно подняты `repository-db-1`, `repository-backend-1`, `repository-web-1`.
> psql: `docker exec repository-db-1 psql -U vela -d vela -c "..."`.

**Быстрые UI‑итерации (Next dev + Preview MCP):**
```bash
cd frontend && npm install
docker compose stop web        # освободить порт 3000
```
`.claude/launch.json` настроен. `preview_start("web")` → `preview_screenshot`/`preview_eval`/`preview_resize`.
**Важно:** не запускать `npm run build` пока работает `next dev`. Dev‑компиляция медленная (8–20с) —
после навигации ждать перед скриншотом. После работы вернуть: `docker compose start web`.

**Проверки:**
```bash
cd backend && npx prisma generate && npx tsc --noEmit -p tsconfig.json
cd frontend && npx tsc --noEmit
```
**Смоук‑тест API:**
```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@vela.local","password":"<SUPERADMIN_PASSWORD>"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s http://localhost:4000/api/feed -H "Authorization: Bearer $TOKEN"
```
> При тестах создавай временных пользователей и **подчищай данные** после (каскады по `User`/`Trip`).
> В zsh `$UID` зарезервирован. `timeout` на macOS отсутствует.

---

## 12. Изменённые/добавленные файлы (последние сессии)

Свежие коммиты `origin/main` (новые → старые):
```
1a6d9a1 chore(deploy): free-tier + VPS deploy configs and guide
5b804f6 feat(expenses): exact per-person amounts in the shared-cost calculator
25a61cc design: cream & gold premium theme, marquee, honest-data page
16997a9 design: softer premium palette, calmer background, refined home menu
5b20912 feat: Groq AI consultant, home menu, upload-500 fix (implementation)
c6d449e feat: Groq AI consultant, home menu; fix upload 500 + native cursor
d67f0f0 feat(community): country-scoped community board for visa/document help
72577a4 feat(brand): Vela favicon — sailboat mark on eucalyptus tile
500aea9 feat: trip spend estimator, terms agreement gate, fix Yandex hotels link
```

**Backend:**
- `prisma/schema.prisma` (+ `User.termsAcceptedAt`, `CommunityMessage`, `Expense.exactSplit`);
  копия `database/prisma/schema.prisma`.
- `src/app.module.ts` (+ `CommunityModule`, `AssistantModule`).
- `src/common/estimate.ts` (**новый**, автооценка трат), `src/common/countries.ts` (**новый**, 30 стран).
- `src/modules/community/` (**новый**), `src/modules/assistant/` (**новый**, Groq).
- `src/modules/trips/trips.service.ts` (+ `estimateSpend`), `trips.module.ts` (+ `GET :slug/estimate`).
- `src/modules/planning/planning.service.ts` (exactSplit в `createExpense` + `computeSettlement`),
  `planning.module.ts` (zod `exactSplit`).
- `src/modules/auth/auth.service.ts` (+ `acceptTerms`, `termsAcceptedAt` в `publicUser`), `auth.module.ts` (+ `POST /accept-terms`).
- `src/modules/uploads/storage.service.ts` (try/catch S3 → лог + фолбэк на диск).

**Frontend:**
- `app/globals.css` (крем‑золотая палитра, `.shadow-soft*`, keyframes marquee; удалён `cursor:none`).
- `app/layout.tsx` (+ `AssistantWidget`, `TermsGate`; удалён `MagneticCursor`).
- `app/page.tsx` (+ `Marquee`, `HomeMenu`, новая кнопка «Все маршруты», тизер `/data`).
- `app/data/page.tsx` (**новая**), `app/terms/page.tsx` (**новая**), `app/icon.svg` (**новый**, фавикон).
- `app/community/page.tsx`, `app/community/[country]/page.tsx` (**новые**).
- `app/trips/[slug]/page.tsx` (+ `SpendEstimator`), `app/trips/[slug]/plan/page.tsx` (режим точных сумм).
- `app/profile/page.tsx`, `app/news/page.tsx` (тосты ошибок загрузки фото), `app/verify-email/page.tsx` (событие).
- `components/`: `ui/Marquee.tsx`, `ui/HomeMenu.tsx`, `assistant/AssistantWidget.tsx`,
  `auth/TermsGate.tsx`, `trip/SpendEstimator.tsx` (**все новые**);
  `trip/HotelsSection.tsx` (фикс ссылки Яндекса), `ui/SiteHeader.tsx`, `ui/BottomNav.tsx`,
  `social/SocialTabs.tsx` (навигация), `decor/SiteScenery.tsx`, `decor/SakuraTree.tsx` (успокоены).
- `lib/`: `assistant.ts`, `community.ts`, `terms.ts` (**новые**); `api.ts` (+ estimate), `auth.ts`,
  `planning.ts` (exactSplit).
- **Удалено:** `components/cursor/MagneticCursor.tsx`.

**Корень/деплой:** `render.yaml` (+ GROQ_*, пометка про S3_REGION), `.env.example`, `.env.prod.example`
(**новый**), `docker-compose.prod.yml` (**новый**), `deploy/Caddyfile` (**новый**), `docs/DEPLOY_FREE.md` (**новый**).

---

## 13. Текущий статус

- **В проде работает:** весь функционал из раздела 9. Домен `velatrips.ru` открывается (SSL ок).
- **Незакоммичено:** ничего по фичам. Untracked артефакты: `backend/dist-seed/`,
  `backend/package-lock.json`, `frontend/tsconfig.tsbuildinfo` — **не коммитить**.
- **DNS исправлен:** apex `velatrips.ru` A‑запись → **`216.24.57.8`** (раньше стояла `216.24.57.1` —
  этот IP Render не терминирует TLS, сайт не открывался). `www` → CNAME `vela-web-zr2u.onrender.com`
  → редирект на apex. DNS управляется в панели **reg.ru**.

### ⚠️ Известные проблемы прода (требуют действий владельца)

1. **Render free‑лимиты.** 3 бесплатных сервиса (db+api+web) × ~720ч > 750ч/мес → аккаунт уже был
   приостановлен («This service has been suspended», 503 на всех сервисах). Восстановлен вручную,
   **но повторится**. Варианты: оплатить Starter (~$7/мес × 2 сервиса) ИЛИ перенести по `docs/DEPLOY_FREE.md`.
2. **Бесплатная БД Render живёт 90 дней**, потом приостанавливается/удаляется. Перенос на Neon (бесплатно,
   без срока) — в `docs/DEPLOY_FREE.md`.
3. **Загрузка фото на проде падала с 500** (Supabase). Причина: в `render.yaml` `S3_REGION: auto`, а
   Supabase требует реальный регион проекта → ломается подпись. Код теперь не 500‑ит (фолбэк на диск,
   но файлы эфемерны). **Фикс:** в Render → `vela-api` → Environment → `S3_REGION` = реальный регион
   Supabase (напр. `eu-central-1`).
4. **`GROQ_API_KEY` не задан на проде** → ИИ‑консультант отвечает заглушкой. Ключ: console.groq.com →
   добавить в env `vela-api`.
5. **Мусор на проде:** тестовый пользователь `diag-upload-…@example.com` (создан при диагностике
   загрузки) — удалить в `/admin/users`.
6. **reg.ru Host‑0** — PHP shared‑хостинг **без Node.js**, приложение там запустить нельзя. Используется
   только для DNS. (`docker-compose.prod.yml` + `deploy/Caddyfile` — на случай своего VPS.)

---

## 14. Открытые задачи

### A. Дизайн (владелец согласовал направление, часть сделана)
Сделано: крем‑золотая палитра, спокойный фон, меню главной, бегущая строка, кнопка «Все маршруты».
Осталось из согласованного:
- **Герой + красивые пустые состояния** (EmptyState с иллюстрацией вместо текста).
- **Тёмная тема + доступность:** аудит контраста поверхностей, фокус‑стили, `prefers-reduced-motion`.
- **Полировка остальных страниц** под новый премиум‑стиль: auth (вход/регистрация), формы, страница
  поездки, соц‑страницы.
- Единый компонент `Card` (сейчас `rounded-2xl border border-ink-line bg-ink-soft/40 p-5/p-7` дублируется
  десятками мест) и `Button`.
- Скелетоны вместо текста «Загрузка…» (компонент `Skeleton.tsx` есть, почти не используется).
- Нижняя навигация: 6 пунктов тесновато на узких экранах — рассмотреть «Ещё».

### B. Функциональность
- **Уведомления о новых ответах в Сообществе** и о сообщениях поддержки (сейчас `Notification` только
  для соц‑действий) — самое ценное для оживления форума.
- **Личные чаты 1:1** (давно отложены). Модуль `network` с заделом; зеркалить паттерн `support`/`chat`.
- **Лучший ответ / голосование** в Сообществе — превращает чат в базу знаний.
- **Чек‑лист документов по стране** (гражданство → страна → цель) с сохранением в «Документы» поездки;
  логично связать с ИИ‑консультантом и Сообществом.
- **Поиск** по маршрутам и сообществу (глобального поиска нет).
- **Расходы:** мультивалютность, экспорт отчёта, привязка расхода к дню маршрута явно.
- **Даты поездки в редакторе** `/trips/[slug]/edit` (сейчас задаются только при создании).
- **Модерация соц‑контента** в админке (есть DELETE author/ADMIN, нужен admin‑обзор; возможный `hidden Boolean`).
- **Пагинация** ленты/новостей/уведомлений/сообщества (сейчас `take: 50–100`, community `take: 1000`).
- Реальные данные по времени переездов (Real Data Policy); недельный вид календаря.

### C. Админка
- Расширенная аналитика: счётчики posts/comments/friends/expenses/messages в `/admin/users`.
- Отдельная страница `/admin/trips` с фильтрами и инлайн‑сменой статуса.
- Настройки платформы: модель `PlatformSetting (key/value)` + раздел.

### D. Прод‑хардненинг
- **Хостинг/деньги:** решить вопрос лимитов Render (оплата или перенос) — см. раздел 13.
- Перейти с `prisma db push` на `prisma migrate` (baseline + `migrate deploy`).
- httpOnly‑cookie для JWT вместо localStorage; **rate‑limit на `/auth` и `/assistant`** (ИИ стоит денег).
- Keep‑alive (UptimeRobot) против засыпания Render free (иначе воркер напоминаний спит).
- Добавить `frontend/tsconfig.tsbuildinfo` в `.gitignore`.
- (Опц.) Пересоздать `RESEND_API_KEY` — старый светился в скриншотах переписки.

---

## 15. Рекомендации по дальнейшей разработке

1. **Сначала — хостинг (Задача D).** Сайт снова приостановят при исчерпании лимита. Либо оплата
   Starter для `vela-api`+`vela-web`, либо перенос по `docs/DEPLOY_FREE.md` (Netlify + Koyeb + Neon).
   Параллельно перенести БД на Neon — это снимает и 90‑дневный риск, и экономит деньги.
2. **Быстрые фиксы прода:** `S3_REGION` (фото), `GROQ_API_KEY` (ИИ), удалить тестового пользователя.
3. **Уведомления о ответах в Сообществе (Задача B)** — дешёво и сильно повышает возвращаемость.
4. **Дизайн‑полировка (Задача A)** — герой, пустые состояния, компоненты `Card`/`Button`, скелетоны.
5. **Личные чаты 1:1** — логичное продолжение соцслоя после Сообщества.
6. **Хардненинг:** `prisma migrate`, httpOnly cookie, rate‑limit (особенно `/assistant`).

**Правила работы:**
- После изменений: `npx tsc --noEmit` (фронт/бэк), `docker compose up -d --build backend` (бэк),
  смоук‑тест API (curl) и UI через Preview MCP (mobile + desktop, светлая + тёмная), потом
  `git commit` + `git push` (Render задеплоит).
- Соблюдать **Real Data Policy** (не выдумывать цифры) и текущий **крем‑золотой премиум‑стиль**.
- Схему править в `backend/prisma/schema.prisma` и **синхронизировать копию**
  `database/prisma/schema.prisma`; применять через `prisma db push`.
- Не коммитить `backend/dist-seed/`, `backend/package-lock.json`, `frontend/tsconfig.tsbuildinfo`.

— Конец хендоффа —
