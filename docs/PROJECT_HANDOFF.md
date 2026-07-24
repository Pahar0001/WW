# Vela — PROJECT HANDOFF

> Документ для продолжения работы в новом чате Claude Code **без доступа к истории переписки**.
> Прочитай целиком, затем продолжай с раздела **«Открытые задачи»**.
> Последнее обновление: **2026‑07‑24**. Ветка `main`, всё запушено (HEAD = `7becfe9`).
> Предыдущая версия хендоффа была на коммите `ab3bc7d` — с тех пор проведён большой
> редизайн и добавлены фичи (см. раздел 12 «Что изменилось в этой сессии»).

---

## 0. Где работать (начни отсюда)

```
Рабочая папка:          /Users/marat/Desktop/Repository
GitHub (origin/main):   https://github.com/Pahar0001/WW
Прод (сайт, домен):     https://velatrips.ru      (= vela-web на Render)
Прод (фронтенд Render): https://vela-web-zr2u.onrender.com
Прод (API):             https://vela-api-8rta.onrender.com
API health:             https://vela-api-8rta.onrender.com/api/health
```

Первым делом:
```bash
cd /Users/marat/Desktop/Repository
git status          # untracked-артефакты НЕ коммитить:
                    #   backend/dist-seed/, backend/package-lock.json, frontend/tsconfig.tsbuildinfo
git log --oneline -12
```

**Деплой:** `git push origin main` → Render авто‑деплоит по Blueprint (`render.yaml`): db + api + web.
Заканчивай коммиты строкой: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
**Пуш = прод‑деплой.** Перед пушем всегда прогоняй прод‑сборки (`next build` фронт, `nest build` +
`build:seed` бэк) — на проде запускается именно они.

**Секреты не коммитить.** `.env` в `.gitignore`. На проде — через Render Dashboard → Environment.

---

## 1. Что это за проект

**Vela** — премиальная платформа планирования и совместной организации путешествий (RU‑интерфейс)
с социальным слоем. Готовые маршруты, конструктор по дням, карты, бюджет, автооценка трат,
билеты/документы/календарь, отели, чат участников, фотоальбомы, **калькулятор общих расходов**,
приватные поездки, приглашения по email, **соцсеть** (лента/новости/друзья/уведомления/профили),
**сообщество по странам** (визы/документы + ознакомительные гиды + справка по въезду/выезду +
ссылки на посольства), **оценки маршрутов звёздами**, **ИИ‑консультант (Groq)**, чат поддержки,
авторизация + RBAC + админка.

**Бизнес‑проблема:** планирование поездки разбросано по 15 вкладкам, а конкуренты показывают
выдуманные цены/сроки. Vela собирает всё в одном месте и держит **Real Data Policy** — не выдумывать
цены/расстояния/время/погоду; неизвестное → `dataStatus: PENDING`; бюджет — `ESTIMATED` (оценка).
Соц‑слой (лента, сообщество, друзья, оценки) даёт возвращаемость; монетизация в перспективе —
партнёрские комиссии с билетов/отелей (см. открытые задачи).

**Дизайн (текущий, после редизайна):** направление **«Immersive / Design C»** — движемся к тёмной
иммерсивной эстетике с настоящим 3D (Three.js). **Главная уже открывается 3D‑героем** (золотой
глобус из частиц + светящиеся дуги‑маршруты). Ниже героя контент пока в светлой крем‑золото‑угольной
теме (переход dark→light — это ок, но по плану доводим весь сайт до тёмного иммерсива).
**«Дымка» (шань‑шуй фон `SiteScenery`) удалена** по просьбе владельца.
Базовая палитра (для светлых секций): крем `bg-ink` / тёплый уголь `text-paper` / приглушённое
золото `text-aurora`; шрифты Inter (sans) + Fraunces (serif). Тёмная/светлая темы, тумблер.

---

## 2. Стек технологий

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 14.2 (App Router, TS), Tailwind (HSL‑токены shadcn‑стиля), **Framer Motion**, **Three.js + @react-three/fiber@8 + @react-three/drei@9** (3D‑герой), Leaflet+OSM/CARTO (карты, без ключей) |
| Backend | NestJS 10, Prisma 5.22, REST, zod‑валидация |
| БД | PostgreSQL 16 |
| Auth | Своя: JWT (`jsonwebtoken`) + `bcryptjs`, guards/decorators (без passport) |
| Файлы | **Хранятся в БД** (модель `Upload`, отдаются `GET /api/uploads/:id`) — переживают рестарты. S3‑адаптер (Supabase) остаётся, если корректно сконфигурирован |
| Email | `EmailService` → Resend (домен `velatrips.ru`); без `RESEND_API_KEY` — ссылка/код в лог |
| ИИ | **Groq** (OpenAI‑совместимый), модель `llama-3.3-70b-versatile` |
| Деплой | Render Blueprint (`render.yaml`): db + api + web; Docker. Домен `velatrips.ru` (reg.ru DNS) |

⚠️ **Версии 3D‑библиотек важны:** `@react-three/fiber@9` тянет expo/React 19 и НЕ ставится с React 18
(ERESOLVE). Использованы совместимые с React 18: `three@0.160`, `@react-three/fiber@8.17`,
`@react-three/drei@9.114`.

---

## 3. Архитектура

**Ключевая особенность — runtime‑прокси.** Браузер всегда зовёт свой origin (`/api/*`, `/uploads/*`),
Next‑сервер форвардит на `BACKEND_URL`. Убирает CORS и build‑time URL. Серверные компоненты зовут
бэкенд напрямую через `BACKEND_URL`. Приватные поездки в SSR читают токен из cookie `vela_token`.

```
Браузер ──▶ Next.js (web) ──proxy /api,/uploads──▶ NestJS (api) ──▶ PostgreSQL (+ Upload bytes)
                                                        └──▶ Resend (email)
                                                        └──▶ Groq (ИИ-консультант)
```

Файлы прокси: `frontend/src/app/api/[...path]/route.ts`, `frontend/src/app/uploads/[...path]/route.ts`,
`frontend/src/lib/proxy.ts`. Бэкенд имеет глобальный префикс `api` (`backend/src/main.ts`).
Загруженные файлы отдаются как `/api/uploads/:id` (из БД) — старые дисковые остаются на `/uploads/*`.

---

## 4. Структура БД (Prisma)

Каноничная схема: `backend/prisma/schema.prisma`. Копия для справки:
`database/prisma/schema.prisma` — держать в синхроне (`cp` после правок).

**Модели (полный список):**
`Country → Region → City → Place`, `SeasonInsight`;
`Trip` → `RouteVariant` (CALM/BALANCED/ACTIVE) → `Day` → `DayPlace`/`TransportLeg`;
`BudgetBreakdown`→`BudgetLine`; `TripScore`; `TripOpinion`; `Hotel`;
`Ticket`, `TripDocument`, `CalendarEvent`→`Reminder`, `ChatMessage`, `Expense`;
`Album`→`Photo`, `Memory`; `SupportMessage`; `CommunityMessage`;
`Post`, `Like`, `Comment`, `Repost`, `Friendship`, `Notification`;
`User`, `TripMember`, `AuditLog`, `SavedTrip`;
**`TripRating` (НОВОЕ)**, **`Upload` (НОВОЕ)**.

**Новые модели этой сессии:**
```prisma
// Пользовательская оценка маршрута 1–5. Одна на пользователя на маршрут.
model TripRating {
  id String @id @default(cuid())
  tripId String
  userId String
  stars Int
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([tripId, userId])
  @@index([tripId])
}

// Постоянное хранилище загруженных файлов (аватары, фото постов) — в БД,
// чтобы переживали рестарт контейнера на free‑тарифе. Отдаётся GET /api/uploads/:id.
model Upload {
  id String @id @default(cuid())
  mime String
  data Bytes
  size Int
  createdAt DateTime @default(now())
}
```

**Ключевое (из прошлого хендоффа, без изменений):** `Trip` без поля владельца — владелец =
`TripMember(role=ORGANIZER)`. `Expense.amount` в копейках; `shares Int[]` + `exactSplit Bool`.
`CommunityMessage`: `country` (код), `parentId` (1 уровень вложенности). `User.termsAcceptedAt`
(null → блокирующая модалка). Провенанс (`source/sourceUrl/dataStatus/trustLevel/fetchedAt`) на
`Place`/`TransportLeg`/`BudgetLine`/`SeasonInsight`.

**Засеянные данные (seed):** «China — The Floating Mountains» (публичный, 3 варианта темпа, реальный
граф с местами/координатами), «Санкт‑Петербург» (приватный, владелец Super Admin), **28
ознакомительных маршрутов по странам сообщества** (публичные; hero из Википедии; описание с планом
по дням; БЕЗ точек/координат/бюджета — это ориентир, детали в конструкторе). Итого **29 публичных
маршрутов** в коллекции.

---

## 5. Миграции

**Формальных миграций НЕТ.** Схема применяется при старте контейнера через `npx prisma db push`
(см. `backend/Dockerfile` CMD). Папки `backend/prisma/migrations` не существует.

Все поля/модели добавлялись через `db push`. **Добавлено в этой сессии** (безопасно, новые таблицы):
`TripRating`, `Upload`.

Локально применить схему к БД:
```bash
cd backend
DATABASE_URL='postgresql://vela:change_me_in_production@localhost:5432/vela?schema=public' \
  npx prisma db push --skip-generate
npx prisma generate
cp prisma/schema.prisma ../database/prisma/schema.prisma   # синхронизировать копию
```
➡️ Рекомендация: при стабилизации перейти на `prisma migrate` (baseline + `migrate deploy`).

---

## 6. RBAC (модель доступа)

- Роли: `SUPER_ADMIN` > `ADMIN` > `ORGANIZER` > `MEMBER`.
- Guards: `JwtAuthGuard` (Bearer, блокирует BLOCKED), `RolesGuard` (`@Roles(...)`, SUPER_ADMIN везде).
  Декораторы `@Roles`, `@CurrentUser`, `@Public`. Опциональная авторизация — ручной разбор Bearer
  (`optionalAccessor` в trips.module). Файлы: `backend/src/modules/auth/*`, `common/jwt.ts`.
- Первый Super Admin создаётся на старте из `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD` (idempotent,
  `emailVerified=true`). Локально: `admin@vela.local` + `SUPERADMIN_PASSWORD` из `.env`.
- Токен на клиенте: `localStorage('vela_token')` + cookie `vela_token` (для SSR приватных поездок).
- **Публичные (без логина):** список/страница маршрута (public), `/community` и `/community/:country`
  (чтение), health. Соц‑страницы (`/feed`,`/news`,`/network`,`/notifications`,`/profile`) редиректят
  на `/login` без токена.

---

## 7. Backend‑модули и эндпоинты

`backend/src/modules/`: `auth`, `admin`, `planning`, `trips`, `social`, `network`, `community`,
`assistant`, `support`, `uploads`, `email`, `audit`, `prisma`, `health`, `analytics`, `integrations`,
`recommendations`, `routes`. Все маршруты под префиксом `/api`.

**Изменённые/новые эндпоинты этой сессии:**
| Метод | Маршрут | Доступ |
|------|---------|--------|
| **POST** | **`/api/trips/:slug/rate`** `{stars:1..5}` (upsert оценки) | вошедший |
| GET | `/api/trips/:slug` — теперь в ответе есть `rating: {avg,count,mine}` | опц. auth |
| GET | `/api/trips` — облегчён (только поля карточки, без longDescription/variants) | публично |
| **GET** | **`/api/uploads/:id`** — отдаёт байты файла из БД (Content‑Type из записи) | публично |
| POST | `/api/uploads` — теперь сохраняет в БД (`Upload`), возвращает `/api/uploads/:id` | вошедший |

Остальные эндпоинты — как в прошлой версии (auth, trips CRUD, `/trips/:slug/estimate`, planning,
expenses, members, memories, feed/news/like/comments/reposts, users/friends/notifications, profile,
support, community `rooms`/`:country`, assistant `status`/`chat`, admin stats/users/audit/trips).

**Ключевая логика (uploads):** `uploads/storage.service.ts` — если S3 сконфигурирован и работает,
кладёт в S3; иначе (и это дефолт) — в БД через `prisma.upload.create` и возвращает `/api/uploads/:id`.
`getUpload(id)` читает байты. Контроллер `uploads.module.ts`: `POST /uploads` (guard) + `GET /uploads/:id`
(`@Public`, `Cache-Control: immutable`).

**Star ratings (`trips.service.ts`):** `rate(slug,userId,stars)` — валидирует 1..5, upsert по
`@@unique([tripId,userId])`, возвращает свежий агрегат. `getBySlug` добавляет `rating` (avg/count/mine).

---

## 8. Frontend (App Router)

**Страницы** (`frontend/src/app`): `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`,
`/verify-email`, `/terms`, `/data`, `/admin`, `/admin/users`, `/admin/support`, `/trips/[slug]`,
`/trips/[slug]/edit`, `/trips/[slug]/plan`, `/trips/new`, `/feed`, `/news`, `/community`,
`/community/[country]`, `/network`, `/notifications`, `/profile`, `/u/[id]`.

**Дизайн‑система (globals.css):** HSL CSS‑переменные (`:root` светлая, `.dark` тёмная). Токены:
`ink`(=фон крем), `paper`(=текст уголь), `aurora`(=золото). **Добавлены** депт‑токены (glass, glow,
grain, shadow‑lift), утилиты `.card-lux` (премиум‑карточка с золотой каймой + подъёмом), `.glass`,
`.text-gold-gradient`, `.display-1/.display-2` (крупная типографика), `.sheen` (световой блик кнопок),
`.grain-overlay`, `.scroll-progress`, focus‑ring, `prefers-reduced-motion`.

**Ключевые НОВЫЕ компоненты:**
- `components/ui/Hero3D.tsx` — Three.js сцена (глобус из частиц + дуги‑маршруты, параллакс, reduced‑motion).
- `components/ui/HeroImmersive.tsx` — тёмный full‑screen 3D‑герой (динамический импорт Hero3D `ssr:false`).
- `components/ui/Hero.tsx` — прежний кинематографичный герой (с фото Тяньцзи); **сейчас не используется на
  главной** (заменён на HeroImmersive), но остаётся как компонент.
- `components/ui/FloatingNav.tsx` — плавающая нижняя «пилюля»‑навигация (десктоп). Прячется у низа
  страницы и на соц/админ/auth‑страницах (у них своя навигация). Верхняя `SiteHeader` теперь только
  на мобильном (`md:hidden`).
- `components/ui/TripCollection.tsx` — коллекция маршрутов на главной со сворачиванием (4 + «Показать все»).
- `components/ui/Button.tsx`, `Card.tsx` — единые премиум‑компоненты. `components/ui/Motion.tsx` —
  `FadeIn`/`Stagger`/`TextReveal` (framer‑motion). `components/fx/Atmosphere.tsx` — grain + scroll‑progress
  + магнитные кнопки (`[data-magnetic]`).
- `components/trip/TripRating.tsx` — виджет оценки звёздами. `components/map/TripMap.tsx` — единая карта
  (переключатель «По дням / Весь маршрут», без флага Leaflet, тайлы CARTO по теме).
- `components/community/EntryRequirements.tsx` — справка по въезду/выезду (визовый режим + чек‑лист +
  дисклеймер + ссылка на посольство). `components/community/CountryIntro.tsx` — гид «Знакомство со страной».
- `lib/`: `country-guides.ts` (30 стран), `entry-requirements.ts`, `embassies.ts` (проверенные URL
  посольств/МИД), `plural.ts` (RU‑плюрализация), `cn.ts`.

**API‑клиент (`lib/api.ts`):** + `rateTrip(slug,stars)`, тип `Trip.rating`. **Auth (`lib/auth.ts`):**
`auth.me()` кэшируется на ~15 c (дедуп запросов; сбрасывается на login/logout по событию
`vela:auth-changed`). **Avatar** (`components/social/Avatar.tsx`) — фолбэк на инициалы, если картинка 404.

---

## 9. Реализованные функции (готово)

**База (из прошлых сессий):** auth/RBAC + email‑верификация + пользовательское соглашение (`TermsGate`);
планирование (билеты/документы/календарь/напоминания/отели/карта/чат); приватные поездки, приглашения,
воспоминания; создание и копирование поездок; калькулятор общих расходов (веса ИЛИ точные суммы,
«кто кому должен»); автооценка трат (ESTIMATED); соцсеть (лента/новости/друзья/уведомления/профили);
сообщество по странам; ИИ‑консультант (Groq); чат поддержки; админка; страница «Честные данные».

**Добавлено/переделано в ЭТОЙ сессии:**
- **Полный премиум‑редизайн:** депт‑токены, grain, glow, scroll‑progress, магнитные кнопки, motion‑
  примитивы, единые `Button`/`Card`; главная, сплит‑экран auth, полноэкранный герой страницы поездки.
- **Immersive 3D‑герой** на главной (Three.js глобус + дуги‑маршруты); «дымка» удалена.
- **Плавающая нижняя навигация** (десктоп), верхняя шапка → только мобайл.
- **Коллекция маршрутов сворачивается** (4 + «Показать все»).
- **29 маршрутов** в коллекции: 28 ознакомительных по странам сообщества (реальные фото из Википедии,
  план по дням) + флагманский Китай.
- **Оценки звёздами** маршрутов (средний балл + своя оценка).
- **Загрузки хранятся в БД** — фото профиля/постов больше не пропадают после рестарта; аватар‑фолбэк.
- **Профиль переписан** — быстрее (поля из сессии сразу, посты/статистика со скелетонами) и обширнее
  (личность, роль, дата, статистика, разделы, настройки).
- **Сообщество по стране:** гид «Знакомство со страной» + справка «Въезд и выезд» (визовый режим,
  чек‑лист, дисклеймер) + **ссылка на посольство** (URL проверены curl'ом).
- **Одна карта** с переключателем «По дням / Весь маршрут» (без флага, тайлы CARTO).
- **Производительность:** дедуп `auth.me()`, облегчён `GET /api/trips`.
- Полировка соц‑страниц (шапки, скелетоны, EmptyState) и админки.

---

## 10. Переменные окружения

Полный список — `.env.example`. Прод‑декларации — `render.yaml`.

**Ключевые на `vela-api` (Render):**
```
DATABASE_URL            # Render Postgres (Blueprint подставляет)
NODE_ENV=production
JWT_SECRET              # generateValue
JWT_EXPIRES=7d
APP_URL=https://velatrips.ru
SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD
RESEND_API_KEY          # задан на проде
EMAIL_FROM=Vela <no-reply@velatrips.ru>
GROQ_API_KEY            # ⚠️ НЕ задан на проде → ИИ-консультант отвечает заглушкой
GROQ_MODEL=llama-3.3-70b-versatile
S3_* (endpoint/region/bucket/keys/public_url)   # опц.; при сбое uploads падают в БД
```
**Новое:** `TRAVELPAYOUTS_TOKEN` — токен Travelpayouts (Aviasales авиабилеты + Hotellook отели).
**Значение уже лежит локально в `.env` (в `.gitignore`, в документ не вписано).** Для прода добавить
в Render env `vela-api`. Пока в коде НЕ используется — задел под интеграцию реальных цен (см. задачи).

На **`vela-web`**: только `BACKEND_URL=https://vela-api-8rta.onrender.com`.
Локально (`.env`, docker): `POSTGRES_USER/PASSWORD/DB=vela/change_me_in_production/vela`,
`DATABASE_URL=postgresql://vela:change_me_in_production@db:5432/vela?schema=public`.

---

## 11. Как запускать / проверять

Локально уже поднят Docker: `repository-db-1` (5432), `repository-backend-1` (4000),
`repository-web-1` (3000). Для быстрых UI‑итераций — Next dev вместо контейнера web:

```bash
# 1) освободить порт 3000 (если занят контейнером web)
docker compose stop web
# 2) dev-сервер фронта против живого бэкенда
cd frontend && BACKEND_URL=http://localhost:4000 npm run dev -- --port 3000
```
> ⚠️ На macOS нет `timeout`; в zsh `$UID` зарезервирован.
> После правок **бэкенда/схемы** пересобрать контейнер: `docker compose up -d --build backend`
> (на старте он делает `db push` + seed — seed тянет ~30 фото из Википедии, ~60 c).
> Локальная строка БД для seed/psql: `postgresql://vela:change_me_in_production@localhost:5432/vela?schema=public`.

**Проверки перед пушем (обязательно — пуш = прод‑деплой):**
```bash
cd frontend && npx tsc --noEmit && BACKEND_URL=http://localhost:4000 npm run build
cd backend  && npx tsc --noEmit -p tsconfig.json && npm run build && npm run build:seed
```
> Визуальную проверку делай через Preview‑MCP (браузер‑панель). Известная особенность: скролл
> Preview‑инструментом зависает на бесконечных CSS‑анимациях, а скриншот ниже‑фолда после JS‑скролла
> бывает пустым — проверяй верх экрана, для нижних секций увеличивай высоту вьюпорта или читай DOM.

---

## 12. Что изменилось в этой сессии (изменённые файлы)

Коммиты `ab3bc7d..7becfe9`:
```
7becfe9 feat(design): immersive 3D hero (WebGL) — Design C, step 1
e15a06c fix: avatar fallback, session dedupe, lighter trips list
d691cfb feat: collapsible trips, star ratings, fuller itineraries, nav/UI fixes
f79bf88 feat: persistent uploads, richer profile, embassy links
3734e52 feat(trips): intro trips for all community countries
2371149 feat/design: floating bottom nav, unified trip map, country intro guides, UX fixes
243efd6 design: premium award-level redesign + honest entry/exit requirements
```

**Новые файлы (A):**
- backend: `prisma/seed-countries.ts`
- frontend компоненты: `ui/Hero.tsx`, `ui/Hero3D.tsx`, `ui/HeroImmersive.tsx`, `ui/FloatingNav.tsx`,
  `ui/TripCollection.tsx`, `ui/Button.tsx`, `ui/Card.tsx`, `ui/Motion.tsx`, `fx/Atmosphere.tsx`,
  `trip/TripRating.tsx`, `community/CountryIntro.tsx`, `community/EntryRequirements.tsx`
- frontend lib: `cn.ts`, `country-guides.ts`, `embassies.ts`, `entry-requirements.ts`, `plural.ts`

**Удалено (D):** `frontend/src/components/trip/TripRouteMap.tsx` (слит в единую `map/TripMap.tsx`).

**Изменено (M):** `backend/prisma/schema.prisma` (+TripRating,+Upload), `backend/prisma/seed.ts`,
`backend/src/modules/trips/{trips.module,trips.service}.ts`, `backend/src/modules/uploads/{storage.service,uploads.module}.ts`,
`database/prisma/schema.prisma`, `frontend/package.json` + `package-lock.json` (three‑деп),
`frontend/src/app/{layout,page,globals.css}`, `app/admin/{page,support/page,users/page}.tsx`,
`app/community/{page,[country]/page}.tsx`, `app/{data,feed,news,network,profile}/page.tsx`,
`app/trips/[slug]/page.tsx`, `components/auth/AuthShell.tsx`, `components/map/TripMap.tsx`,
`components/social/Avatar.tsx`, `components/trip/TripExperience.tsx`, `components/ui/SiteHeader.tsx`,
`lib/{api,auth}.ts`.

---

## 13. Текущий статус

- ✅ **В проде работает**, домен `velatrips.ru` открывается (SSL ок), API health `ok`, БД up.
- ✅ Все правки прошли `tsc` + прод‑сборки (`next build`, `nest build`, `build:seed`).
- ✅ 29 публичных маршрутов; загрузки хранятся в БД; оценки, сообщество‑гиды/въезд/посольства — на проде.
- ✅ 3D‑герой рендерится (WebGL) на десктопе; уважает `reduced-motion`.

### ⚠️ Известные проблемы / особенности
1. **Render free‑тариф спит** через 15 мин → холодный старт ~25–30 c (в мониторинге был p90 ~27 c).
   Лечится keep‑alive пингом (UptimeRobot каждые 5 мин на `/api/health`) ИЛИ Render Starter (~$7/мес ×2).
2. **GROQ_API_KEY не задан на проде** → ИИ‑консультант отвечает заглушкой.
3. **Ранее загруженные фото (до фикса)** потеряны (были на эфемерном диске). Новые — постоянны (БД).
4. **3D на слабых мобильных** может подтормаживать (частицы + WebGL). Не оптимизировано под low‑end
   (dpr капнут на 2, ~2600 частиц). При жалобах — уменьшать частицы/паузить canvas вне вьюпорта.
5. **`TRAVELPAYOUTS_TOKEN`** есть локально в `.env`, но НЕ в Render env и НЕ используется в коде.

---

## 14. Открытые задачи

### A. Дизайн C (иммерсив) — продолжение
Сделан шаг 1: 3D‑герой главной + удаление «дымки». Дальше:
- Перевести остальные секции главной и внутренние страницы в **тёмную иммерсивную тему** (сейчас ниже
  героя — светлый крем; переход dark→light ок, но по плану весь сайт тёмный).
- 3D‑акценты на других экранах (страница маршрута, «Данные»).
- Пере‑проверить контраст/доступность тёмной темы.
- **Higgsfield** видео‑фоны — договорено «позже», у владельца пока нет подписки (пришлёт API).
- Перф 3D: пауза canvas вне вьюпорта (IntersectionObserver), меньше частиц на мобиле.

### B. Реальные цены — Travelpayouts (токен уже есть)
Владелец дал `TRAVELPAYOUTS_TOKEN` (в `.env`). Интегрировать:
- **Авиабилеты (Aviasales / Travelpayouts Data API):** цены на билеты по направлению/датам; на странице
  маршрута заменить/дополнить оценку реальными ценами «от». Партнёрская ссылка = монетизация.
- **Отели (Hotellook):** цены + **автоматические красивые страницы отелей** (фото, рейтинг, цена «от»,
  карта, кнопка брони). Модель `Hotel` уже есть — наполнять из API.
- Токен добавить в Render env `vela-api`; читать на бэке; помечать реальные цены `VERIFIED`, оценки —
  `ESTIMATED` (Real Data Policy).
- Док: travelpayouts.com/developers (Data API / Flight Search / Hotellook).

### C. Функциональность / соцслой
- Уведомления о новых ответах в Сообществе и о поддержке (сейчас `Notification` только для соц‑действий).
- Личные чаты 1:1 (модуль `network` с заделом).
- Лучший ответ/голосование в Сообществе; поиск по маршрутам и сообществу.
- Пагинация ленты/новостей/уведомлений/сообщества.
- Наполнить ознакомительные маршруты реальными точками/координатами (для карты/бюджета) — по возможности
  из проверенных источников (Real Data Policy: не выдумывать).

### D. Прод‑хардненинг / инфра
- **Хостинг:** keep‑alive против засыпания Render ИЛИ платный план (см. раздел 13).
- Задать `GROQ_API_KEY` и (если нужны фото в S3) корректный `S3_REGION` на Render.
- Перейти с `prisma db push` на `prisma migrate` (baseline + `migrate deploy`).
- httpOnly‑cookie для JWT вместо localStorage; rate‑limit на `/auth` и `/assistant`.
- Добавить `frontend/tsconfig.tsbuildinfo` в `.gitignore`.

---

## 15. Рекомендации по дальнейшей разработке

1. **Спроси владельца, продолжаем ли Дизайн C на весь сайт** — это следующий крупный кусок.
   Если да — двигай тёмную иммерсивную тему по страницам, начиная с секций главной под 3D‑героем.
2. **Travelpayouts:** токен готов — самая ценная фича (реальные цены билетов/отелей + монетизация +
   авто‑страницы отелей). Начни с Hotellook (отели) или Flight Search (билеты), помечай данные статусами.
3. **Быстрые прод‑фиксы:** keep‑alive/оплата хостинга, `GROQ_API_KEY`.
4. **Higgsfield** — когда владелец пришлёт подписку/API: видео‑фоны для секций.
5. **Хардненинг:** `prisma migrate`, httpOnly cookie, rate‑limit.

**Правила работы:**
- После изменений: `tsc --noEmit` (фронт/бэк), прод‑сборки, `docker compose up -d --build backend`
  (бэк/схема), визуальная проверка через Preview‑MCP (mobile + desktop, светлая + тёмная), затем
  `git commit` + `git push` (Render задеплоит). **Не пушить без прод‑сборки.**
- Соблюдать **Real Data Policy** (не выдумывать цифры) — реальные цены помечать `VERIFIED`, оценки `ESTIMATED`.
- Схему править в `backend/prisma/schema.prisma` и **синхронизировать копию** в `database/prisma/`.
- Не коммитить: `backend/dist-seed/`, `backend/package-lock.json`, `frontend/tsconfig.tsbuildinfo`, `.env`.
- 3D‑библиотеки: держать `@react-three/fiber@8` (v9 несовместим с React 18).

— Конец хендоффа —
