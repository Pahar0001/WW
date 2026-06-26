# Vela — PROJECT HANDOFF

> Документ для продолжения работы в новом чате Claude Code **без доступа к истории переписки**.
> Прочитай его целиком, затем продолжай с раздела **«Открытые задачи»**.
> Последнее обновление: 2026‑06‑26.

## 0. Где работать (начни отсюда)

```
Рабочая папка проекта:  /Users/marat/Desktop/Repository
GitHub (origin/main):   https://github.com/Pahar0001/WW
Прод (сайт, домен):     https://velatrips.ru   (= vela-web на Render)
Прод (фронтенд Render): https://vela-web-zr2u.onrender.com  (www → редирект на velatrips.ru)
Прод (API):             https://vela-api-8rta.onrender.com
API health:             https://vela-api-8rta.onrender.com/api/health
Запасной домен:         velatrips.online (куплен, пока не подключён)
```

Первым делом:
```bash
cd /Users/marat/Desktop/Repository
git status          # untracked: backend/dist-seed/, backend/package-lock.json — НЕ коммитить
git log --oneline -12
```

**Деплой:** `git push origin main` → Render авто‑деплоит по Blueprint (`render.yaml`): db + api + web.
Коммитить только относящиеся к задаче файлы. **Не коммитить** `backend/dist-seed/` (артефакт сборки)
и `backend/package-lock.json` (локальный, на проде не нужен). `.claude/` — в `.gitignore`.

Заканчивай сообщения коммитов строкой:
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## 1. Что это за проект

**Vela** — премиальная платформа планирования и совместной организации путешествий
(RU‑интерфейс) с социальным слоем. Готовые маршруты, конструктор по дням, карты, бюджет,
билеты/документы/календарь, отели, чат участников, фотоальбомы/воспоминания, **калькулятор
общих расходов**, приватные поездки, приглашения по email, **соцсеть (лента/новости/друзья/
уведомления/профили)**, **чат поддержки**, авторизация + RBAC + админка.
Засеяно два маршрута: «China — The Floating Mountains» (публичный) и «Санкт‑Петербург —
Белые ночи и фонтаны» (приватный, владелец — Super Admin, 3 дня с распределением мест).

**Главные принципы:**
- **Real Data Policy:** не выдумывать цены/расстояния/время/погоду; неизвестное помечать
  `dataStatus: PENDING`. Бюджет — `ESTIMATED` (оценка из заявленного диапазона), не котировка.
  Соц‑контент (посты, комментарии) на это правило не распространяется.
- **Дизайн:** спокойный тёплый пастельный концепт (шалфей/камень) + лёгкий азиатский мотив
  **шань‑шуй** (горы тушью, мягкое солнце, облака, **качающаяся сакура**, лепестки),
  низкоконтрастный. Светлая (по умолчанию) + тёмная темы. Поток‑штрихи (flow‑field) удалены.

---

## 2. Стек технологий

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 14.2 (App Router, TS), Tailwind (HSL‑токены в стиле shadcn), Framer Motion, Leaflet+OSM (карты, без ключей) |
| Backend | NestJS 10, Prisma 5.22, REST, zod‑валидация |
| БД | PostgreSQL 16 |
| Auth | Своя: JWT (`jsonwebtoken`) + `bcryptjs`, guards/decorators (без passport) |
| Файлы | S3‑совместимый адаптер (сейчас **Supabase Storage**), fallback на локальный диск |
| Email | `EmailService` → **Resend** (домен `velatrips.ru` верифицирован); если `RESEND_API_KEY` не задан — ссылка/код в лог |
| Деплой | Render Blueprint (`render.yaml`): db + api + web; Docker. Домен `velatrips.ru` (reg.ru, DNS через ISPmanager) |
| Локально | Docker Compose; для UI‑итераций — Next dev + Preview MCP (Node ставится `brew install node`) |

**Архитектурная особенность (важно для деплоя):** фронтенд **проксирует** браузерные
запросы к бэкенду на лету. Браузер всегда зовёт свой origin (`/api/*`, `/uploads/*`),
а Next‑сервер форвардит их на `BACKEND_URL` (runtime). Это убирает CORS и build‑time URL.
Серверные компоненты зовут бэкенд напрямую через `BACKEND_URL`. Файлы прокси:
`frontend/src/app/api/[...path]/route.ts`, `frontend/src/app/uploads/[...path]/route.ts`,
`frontend/src/lib/proxy.ts`. Приватные поездки в SSR читают токен из cookie `vela_token`.
Бэкенд имеет глобальный префикс `api` (`backend/src/main.ts`), поэтому контроллер с
`@Controller()` и `@Get('feed')` отвечает на `/api/feed`.

---

## 3. Структура БД (Prisma)

Каноничная схема: `backend/prisma/schema.prisma` (копия для справки — `database/prisma/schema.prisma`, держать в синхроне — копировать после правок).

**География/контент:** `Country → Region → City → Place`, `SeasonInsight`.
**Поездка:** `Trip` → `RouteVariant` (CALM/BALANCED/ACTIVE) → `Day` → `DayPlace`/`TransportLeg`;
`BudgetBreakdown`→`BudgetLine`; `TripScore`; `TripOpinion`; `Hotel` (адрес/координаты/даты/фото).
`Trip` имеет `startWindow`/`endWindow` (даты поездки, заполняются при создании).
**Планирование:** `Ticket`, `TripDocument`, `CalendarEvent`→`Reminder`, `ChatMessage`, **`Expense`**.
**Воспоминания:** `Album`→`Photo`, `Memory`.
**Поддержка:** `SupportMessage` (1:1 тред пользователь ↔ super admin).
**Соцсеть:** `Post` (микроблог), `Like` (полиморфный TRIP/POST), `Comment` (полиморфный),
`Repost` (репост поездки), `Friendship`, `Notification`.
**Auth/RBAC:** `User`, `TripMember`, `AuditLog`, `SavedTrip`.

**`User`:** `email`, `name`, `image` (аватар), **`bio`**, `passwordHash`, `role`, `status`,
`emailVerified`, `emailVerifyToken` (6‑значный код), `emailVerifyExpiry` (15 мин),
`passwordResetToken`, `passwordResetExpiry`, **`termsAcceptedAt`** (когда принято
пользовательское соглашение; null = показать блокирующую модалку после verify‑email).
`/auth/me` и логин возвращают `image`/`bio`/`termsAcceptedAt`.
**`TripMember`:** `tripId`+`userId` (unique), `role` (`ORGANIZER`/`MEMBER`). **У `Trip` нет поля владельца** —
владелец = `TripMember(role=ORGANIZER)`, создаётся автоматически при создании/копировании поездки.

**`Expense` (калькулятор расходов):** `tripId`, `paidById`, `description`, `amount` (Int, **в копейках**),
`currency` (RUB), `date`, `participants String[]` (кто делит), **`shares Int[]`** (вес/доля каждого,
выровнен с participants; пусто/равные = поровну), `createdById`.
**`Like`/`Comment`:** `userId`, `targetType (SocialTarget = TRIP|POST)`, `targetId` (+ `text` у Comment).
**`Friendship`:** `requesterId`, `addresseeId` (unique пара), `status (PENDING|ACCEPTED)`.
**`Notification`:** `userId` (получатель), `type (FRIEND_REQUEST|FRIEND_ACCEPT|LIKE|COMMENT|REPOST)`,
`actorId?`, `targetType?`, `targetId?`, `read`.

**Ключевые enum'ы:** `TripStatus` (DRAFT/PUBLISHED/HIDDEN), `TripVisibility` (PUBLIC/PRIVATE),
`Pace` (CALM/BALANCED/ACTIVE), `UserRole` (SUPER_ADMIN/ADMIN/ORGANIZER/MEMBER), `UserStatus`,
`TripMemberRole`, `TicketKind`, `CalendarEventType`, `ReminderChannel`, `DataStatus`,
`BudgetCategory`, `TransportMode`, `SocialTarget`, `FriendStatus`, `NotificationType`.

**Провенанс:** на `Place`/`TransportLeg`/`BudgetLine`/`SeasonInsight` поля
`source/sourceUrl/dataStatus/trustLevel/fetchedAt`.

### Миграции
**Формальных миграций НЕТ.** Схема применяется при старте контейнера командой `npx prisma db push`
(см. `backend/Dockerfile` CMD и `docker-compose.yml`). Папки `backend/prisma/migrations` не существует.
Все добавления полей/моделей (nullable или с `@default`, безопасны для `db push`) прошли так:
`emailVerifyExpiry`, `Expense` (+ `shares`), `SupportMessage`, `User.bio`, соц‑модели
(`Post`/`Like`/`Comment`/`Repost`/`Friendship`/`Notification`), `Trip.startWindow/endWindow`
(поля уже были в схеме, заполнение добавлено в форму создания), **`User.termsAcceptedAt`**.
Локально применять так:
```bash
cd backend
DATABASE_URL='postgresql://vela:change_me_in_production@localhost:5432/vela?schema=public' \
  npx prisma db push --skip-generate
npx prisma generate
cp prisma/schema.prisma ../database/prisma/schema.prisma   # держать копию в синхроне
```
➡️ Рекомендация: при стабилизации перейти на `prisma migrate` (baseline + `migrate deploy`).

---

## 4. RBAC (модель доступа)

- Глобальные роли: `SUPER_ADMIN` (всё) > `ADMIN` (пользователи, поездки, статистика, аудит) >
  `ORGANIZER` (создание/редактирование поездок, участники, планирование) > `MEMBER` (участник).
- Роль в поездке: `TripMember.role` (ORGANIZER/MEMBER) — меняется в планировщике (вкладка «Участники»).
- Guards: `JwtAuthGuard` (Bearer, грузит юзера, блокирует BLOCKED),
  `RolesGuard` (`@Roles(...)`, SUPER_ADMIN проходит везде). Декораторы: `@Roles`, `@CurrentUser`, `@Public`.
  Файлы: `backend/src/modules/auth/auth.guards.ts`, `auth.decorators.ts`, `common/jwt.ts`.
  Опциональная авторизация (читатель может быть гостем) — ручной разбор Bearer (`optionalUserId`/`optionalAccessor`).
- Первый Super Admin создаётся на старте из `SUPERADMIN_EMAIL`/`SUPERADMIN_PASSWORD`
  (idempotent, `auth.module.ts` `onModuleInit`; `emailVerified=true`).
- Токен на клиенте: `localStorage('vela_token')` + cookie `vela_token` (для SSR приватных поездок).

**Доступ к поездкам:**
- Создание `/trips`: **любой авторизованный**. Не‑админ → поездка принудительно **PRIVATE**
  (публичный каталог только у ADMIN+). Сервер форсит visibility (`trips.service.create`).
- Копирование `/trips/:slug/copy`: любой авторизованный, **только PUBLIC** поездку → приватная копия себе.
- Редактирование (PATCH): `ORGANIZER`+. Удаление (DELETE): `ADMIN`+.
- Приватная поездка видна `ADMIN`/`SUPER_ADMIN` и участникам (TripMember).
- Соц‑действия (лайк/коммент/репост/пост/друзья/уведомления): любой авторизованный.
- Чат поддержки: пользователь видит свой тред; список тредов и ответы — только `SUPER_ADMIN`.

---

## 5. Backend‑модули и ключевые эндпоинты

`backend/src/modules/`: `auth`, `admin`, `planning`, `trips`, `social`, `network`, `support`,
`uploads`, `email`, `audit`, `prisma`, `health`, `analytics`, `integrations`, `recommendations`, `routes`.
Все маршруты под глобальным префиксом `/api`.

| Метод | Маршрут | Доступ |
|------|---------|--------|
| POST | `/api/auth/register` `/login` `/forgot-password` `/reset-password` | публично |
| POST | `/api/auth/verify-email` `{email, code}` · `/resend-verification` | публично / вошедший |
| GET | `/api/auth/me` | вошедший (возвращает name/image/bio/role) |
| GET | `/api/trips` | публично (PUBLIC+PUBLISHED) |
| GET | `/api/trips/mine` | вошедший (его поездки, вкл. приватные/копии) |
| GET | `/api/trips/:slug` | опц. auth (приватные — только доступным) |
| **GET** | **`/api/trips/:slug/estimate?travelers=&comfort=`** (автооценка трат) | опц. auth |
| **POST** | **`/api/auth/accept-terms`** (принять пользовательское соглашение) | вошедший |
| POST | `/api/trips` | вошедший (не‑админ → PRIVATE; поддерживает `pace`, `startWindow`, `endWindow`) |
| **POST** | **`/api/trips/:slug/copy`** | вошедший (копия PUBLIC‑поездки в свою приватную) |
| PATCH | `/api/trips/:slug` | ORGANIZER+ (поля + status/visibility + days/hotels — замена целиком) |
| DELETE | `/api/trips/:slug` | ADMIN+ |
| POST | `/api/uploads` | вошедший (image/pdf → Supabase или диск) |
| GET | `/api/trips/:slug/planning` | вошедший |
| POST/DELETE | tickets/documents/events/hotels | ORGANIZER+ |
| GET/POST | `/api/trips/:slug/chat` | вошедший |
| **GET/POST/DELETE** | **`/api/trips/:slug/expenses`**, `DELETE /api/expenses/:id` | вошедший (любой участник) |
| GET/POST/DELETE | `/api/trips/:slug/members` (invite by email) | ORGANIZER+ |
| PATCH | `/api/trips/:slug/members/:userId/role` | ORGANIZER+ |
| GET/POST/DELETE | memories: albums/photos/memories, `/timeline` | вошедший (delete — ORGANIZER+) |
| **GET** | **`/api/feed`** (публичные поездки + счётчики лайк/коммент/репост + мои флаги) | опц. auth |
| **GET/POST** | **`/api/news`** (микроблог), `DELETE /api/posts/:id` | опц. auth / вошедший |
| **POST** | **`/api/like`** `{targetType,targetId}` (toggle) | вошедший |
| **GET/POST** | **`/api/comments?targetType=&targetId=`**, `DELETE /api/comments/:id` | опц. / вошедший |
| **POST** | **`/api/reposts/:tripId`** (toggle) | вошедший |
| **GET** | **`/api/users?search=`**, `/api/users/:id` (профиль) | вошедший |
| **GET/POST/DELETE** | **`/api/friends`**, `/api/friends/:userId[/accept]` | вошедший |
| **GET/POST** | **`/api/notifications`**, `/api/notifications/read` | вошедший |
| **GET/PATCH** | **`/api/profile`** (свой профиль: name/bio/image) | вошедший |
| **GET/POST** | **`/api/support/thread`** (свой тред) | вошедший |
| **GET/POST** | **`/api/support/threads[/:userId]`** (инбокс + ответ) | SUPER_ADMIN |
| GET | `/api/admin/stats` `/users` `/audit` `/trips` | ADMIN+ |
| PATCH/POST/DELETE | `/api/admin/users/:id/...` (role/block/verify/reset/delete) | ADMIN+ (role/delete — SUPER_ADMIN) |

Reminder‑воркер: `PlanningService` каждые 60с шлёт просроченные email‑напоминания.

**Логика калькулятора расходов (`planning.service.ts`):** суммы в копейках; деление по
весам (`shares`) пропорционально, остаток раздаётся по 1 копейке наибольшим дробным частям —
точно, без потери копеек. `computeSettlement` даёт нетто‑балансы + минимальный набор переводов
(жадный зачёт). Отчёт также группируется по дням (кто кому должен за день).

**Логика автооценки трат (`common/estimate.ts`, `trips.service.estimateSpend`):**
параметрическая модель «примерные траты» — из длительности и числа городов маршрута
(берутся из поездки автоматически) + переключатели «путешественников»/«уровень комфорта»
(BUDGET/STANDARD/COMFORT) считает per‑category суммы, итог на человека и на группу с
диапазоном ±18% и резервом 10%. Все цифры `dataStatus: ESTIMATED` (не котировка, Real Data
Policy соблюдён — ставки в одном месте, помечены как допущения). UI: `components/trip/SpendEstimator.tsx`
на странице поездки (живой пересчёт). Дополняет envelope‑эстиматор (`common/budget.ts`),
который работает только при заданном бюджетном диапазоне.

**Логика пользовательского соглашения (`auth.service.acceptTerms`, `User.termsAcceptedAt`):**
после подтверждения email пользователю показывается блокирующая модалка с соглашением
(`components/auth/TermsGate.tsx`, смонтирована в `layout.tsx`); без принятия сайт недоступен.
Текст — единый источник `lib/terms.ts` (используется и модалкой, и страницей `/terms`).
Гейт перепроверяет сессию на mount/focus/событие `vela:auth-changed` (диспатчится в `setToken`
и после verify‑email).

**Логика уведомлений (`social.service.ts`/`network.service.ts`):** создаются как сайд‑эффекты,
никогда себе. Заявка в друзья → адресату; принятие → отправителю; лайк/коммент поста → автору;
лайк/коммент/репост поездки → её ORGANIZER‑участникам. Инбокс помечает всё прочитанным при открытии.

**Логика копирования (`trips.service.copyTrip`):** клонирует весь граф публичной поездки
(варианты → дни → места → dayPlaces, бюджет, отели) в новую PRIVATE‑поездку, копирующий = ORGANIZER.

---

## 6. Frontend (App Router)

Страницы (`frontend/src/app`): `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`,
`/verify-email`, `/admin` (CMS поездок, форма создания), `/admin/users` (дашборд+юзеры+аудит),
**`/admin/support`** (инбокс поддержки), `/trips/[slug]`, `/trips/[slug]/edit`,
`/trips/[slug]/plan` (вкладки: Билеты/Отели/Документы/Календарь/**Калькулятор**/Участники/Воспоминания/Чат),
**`/trips/new`** (создание поездки участником), **`/feed`** (лента), **`/news`** (новости/микроблог),
**`/network`** (люди/друзья), **`/notifications`**, **`/profile`** (свой профиль), **`/u/[id]`** (чужой профиль).
Прокси‑роуты: `/api/[...path]`, `/uploads/[...path]`.

**Дизайн‑система:** HSL CSS‑переменные в `globals.css` (`:root` светлая, `.dark` тёмная);
Tailwind‑токены (`ink`/`paper`/`aurora`) в `tailwind.config.ts`. Тема: класс `.dark` на `<html>`,
дефолт — светлая; переключатель `components/ui/ThemeToggle.tsx`.
**UI‑примитивы:** `components/ui/Toaster.tsx` (`toast.success/error/info`), `Skeleton.tsx`, `EmptyState.tsx`.
**Шапка:** `components/ui/SiteHeader.tsx` — адаптивная. Десктоп: ссылки (Путешествия/Честные данные/
Лента/Новости/Люди) + колокольчик уведомлений с бейджем + **аватар‑меню профиля**. Мобайл: **только бургер**
(тема — внутри шторки; профиль/разделы — в нижней навигации, без дублирования).
**Мобильная нижняя навигация:** `components/ui/BottomNav.tsx` — фикс. панель (Лента/Новости/Люди/
Уведомления(бейдж)/Профиль), только для вошедших, `md:hidden`. В layout также висит `SupportWidget`
(плавающий чат поддержки, поднят над нижней навигацией).
**Визуальный концепт (шань‑шуй):**
- `components/decor/SiteScenery.tsx` — глобальный фон (мягкое солнце, плывущие облака, холмы,
  **падающие лепестки сакуры с покачиванием**), смонтирован в `layout.tsx`.
- `components/decor/SakuraTree.tsx` — **качающееся дерево сакуры** (SVG + CSS‑анимация), только десктоп,
  правый нижний угол, на `-z-10`, тема‑зависимое, текст не затеняет.
- `components/decor/TravelDecor.tsx` — `Constellation`/`RoutePath`/`Contours`/`CompassRose` (точечно).
- `components/cursor/MagneticCursor.tsx` — кастомный курсор: точка 1:1, кольцо с плотным сглаживанием
  (без «хвоста»), скрыт на тач/coarse через `globals.css`.
- Поток‑штрихи (бывш. `GenerativeBackground`) **удалены полностью**.
**API‑клиенты (`frontend/src/lib/`):** `api.ts` (`listMyTrips`, `adminListTrips`, `createTrip` c
`pace`/датами, `updateTrip`, **`copyTrip`**), `auth.ts` (`AuthUser` c image/bio, `verifyEmail`,
`resendVerification`), `admin.ts`, `planning.ts` (билеты/отели/.../**expenses**), **`social.ts`**
(feed/news/like/comment/repost), **`network.ts`** (users/friends/notifications/profile), **`support.ts`**.
**Общие соц‑компоненты:** `components/social/` (`Avatar`, `CommentThread`, `SocialTabs`),
`components/trip/CopyTripLink.tsx`, `components/trips/TripForm.tsx` (общая форма создания: pace, даты,
visibility по роли — используется в `/admin` и `/trips/new`).

---

## 7. Реализованные функции (готово, в проде)

- **Фаза 0 — Auth/RBAC:** регистрация/вход/сброс пароля, JWT+bcrypt, роли, guards, первый Super Admin из env,
  аудит‑лог; email‑верификация по 6‑значному коду через Resend (домен verified), страница `/verify-email`, баннер.
- **Хранилище:** S3‑адаптер → Supabase Storage (переживает передеплой), image+PDF.
- **Фаза 1:** билеты, документы, календарь (по дням/месяц), напоминания (email‑воркер).
- **Фаза 2:** отели (адрес/координаты/даты/фото), карта маршрута (Leaflet/OSM), чат участников (polling 4с).
- **Фаза 3:** приватные поездки, приглашение по email, воспоминания (альбомы/дневник/timeline).
- **Создание поездок участниками:** любой вошедший создаёт поездку (не‑админ → PRIVATE) на `/trips/new`,
  выбор **темпа** (CALM/BALANCED/ACTIVE) и **дат поездки** (start/end). Кнопка «+ Создать поездку» в «Мои поездки».
- **Копирование публичных поездок:** «Скопировать себе» → приватная копия всего графа, владелец = копировавший.
- **Калькулятор общих расходов** (вкладка «Калькулятор» в планировании): кто платил, между кем делить,
  **доли (веса) на участника**, расчёт «кто кому должен» (точные копейки, минимум переводов) + отчёт по дням.
- **Автооценка трат поездки** («Примерные траты» на странице поездки): параметрическая модель из
  длительности + числа городов (автоматически) и переключателей «путешественников»/«комфорт»;
  per‑category суммы, итог на человека и группу с диапазоном (ESTIMATED, не котировка).
- **Пользовательское соглашение:** блокирующая модалка после подтверждения email (без принятия сайт
  недоступен), страница `/terms`, поле `User.termsAcceptedAt`, эндпоинт `/auth/accept-terms`.
- **Соцсеть:** лента публичных поездок (лайк/коммент/репост), новости‑микроблог (текст+фото, лайк/коммент),
  друзья (заявки/принятие), уведомления (бейджи), профили (свой редактируемый + чужой `/u/:id`).
- **Чат поддержки:** плавающий виджет для пользователей → super admin; инбокс `/admin/support`.
- **Смена ролей участников** в планировщике.
- **Редактирование поездок (ORGANIZER+):** поля + статус (архив=HIDDEN) + доступ + дни/места и отели
  (`/trips/[slug]/edit`, замена графа целиком).
- **Админка/CMS:** создание/удаление/редактирование поездок без кода; список всех поездок с бейджами;
  дашборд/пользователи/аудит; инбокс поддержки.
- **Дизайн:** пастельный шань‑шуй на всём сайте (мягкое солнце, облака, холмы, падающая сакура,
  качающееся дерево сакуры на десктопе), стеклянные auth‑страницы, адаптивная шапка + мобильная нижняя
  навигация, светлая/тёмная темы, тосты/skeleton/empty states, цельный курсор (скрыт на тач).
- **Деплой:** Render Blueprint (db+api+web), runtime‑прокси, кастомный домен `velatrips.ru` (SSL).

---

## 8. Открытые задачи (продолжать отсюда)

### A. Соцсеть — доработки
- **Личные чаты (1:1)** между пользователями (намеренно отложены). Модуль `network` оставлен с заделом;
  можно зеркалить паттерн `support`/`chat` (polling). Точка входа — со страницы `/network` и `/u/:id`.
- **Репосты в ленте** показаны счётчиком; можно вынести репост отдельной карточкой с автором.
- **Модерация соц‑контента** в админке: скрыть/удалить посты/комментарии (есть DELETE author/ADMIN,
  нужен admin‑обзор). Возможный `hidden Boolean` + UI.
- **Пагинация** ленты/новостей/уведомлений (сейчас `take: 50–100`).
- **Уведомления о новых сообщениях поддержки** пользователю (сейчас бейдж только у соц‑уведомлений).

### B. Поездки/планирование
- **Даты поездки в редакторе** `/trips/[slug]/edit` (сейчас start/end задаются только при создании).
- **Расходы:** мультивалютность, экспорт отчёта, привязка расхода к дню маршрута явно.
- Реальные данные по времени переездов (Real Data Policy); недельный вид календаря.

### C. Остаток админки (Функция 4)
- Расширенная аналитика: счётчики posts/comments/friends/expenses/messages в `/admin/users`.
- Отдельная страница `/admin/trips` с фильтрами (search/status/visibility) и инлайн‑сменой статуса.
- Настройки платформы: модель `PlatformSetting (key/value)` + раздел.

### D. Прод‑хардненинг
- Перейти с `prisma db push` на `prisma migrate` (baseline + `migrate deploy`).
- httpOnly‑cookie для JWT вместо localStorage; rate‑limit на `/auth` (особенно `/verify-email`).
- Keep‑alive (UptimeRobot) против засыпания Render free (иначе воркер напоминаний спит).
- (Опц.) Пересоздать `RESEND_API_KEY` — старый светился в скриншотах переписки.

---

## 9. Файлы, изменённые/добавленные в последних сессиях

Свежие коммиты `origin/main` (новые → старые):
```
b0303f7 design: swaying ink-wash sakura tree on the desktop background
c9e41a1 feat: trip dates + copy public trips; mobile nav dedup; logo fix; richer sakura
b53ec15 feat: social layer — feed, news microblog, friends, notifications, profiles, mobile bottom nav
97711cf feat: support chat to super admin, weighted expense shares, cohesive cursor
97002ea design: remove flow-field strokes entirely (calm cartoon scenery only)
d1c56fc feat: expense calculator, trip pace at creation, member private trips, calmer scenery
d066a88 fix(seed): make SPb places idempotent via upsert (restore lost day distribution)
```

Ключевые файлы по областям:
- **Backend:**
  - `prisma/schema.prisma` (+ `Expense`/`shares`, `SupportMessage`, соц‑модели, `User.bio`; `database/prisma/schema.prisma` — копия).
  - `src/app.module.ts` (+ Support/Social/Network модули).
  - `src/modules/trips/` — `trips.service.ts` (pace, даты, **copyTrip**, force‑private), `trips.module.ts` (POST `/copy`, create без role‑guard), `trips.dto.ts` (pace, start/end).
  - `src/modules/planning/` — `planning.service.ts` (**expenses** + `computeSettlement` по долям), `planning.module.ts` (expense‑эндпоинты).
  - `src/modules/social/` (**новый**: feed/news/like/comment/repost), `src/modules/network/` (**новый**: users/friends/notifications/profile), `src/modules/support/` (**новый**: тред + инбокс).
  - `src/modules/auth/auth.service.ts` (`publicUser` + image/bio).
  - `prisma/seed-spb.ts` (idempotent upsert мест).
- **Frontend:**
  - `app/layout.tsx` (SiteScenery, SupportWidget, BottomNav; без GenerativeBackground).
  - `app/page.tsx`, `components/ui/SiteHeader.tsx` (соц‑ссылки, колокольчик, аватар‑меню; мобайл — только бургер), `components/ui/MyTrips.tsx` (кнопка создания), `components/ui/BottomNav.tsx` (**новый**).
  - `components/decor/SiteScenery.tsx` (сакура/облака/солнце/холмы), `components/decor/SakuraTree.tsx` (**новый**), `app/globals.css` (keyframes сакуры/облаков/дерева), `components/cursor/MagneticCursor.tsx`.
  - `components/trips/TripForm.tsx` (общая форма: pace + даты + visibility), `app/trips/new/page.tsx` (**новый**), `app/admin/page.tsx` (использует TripForm), `components/trip/CopyTripLink.tsx` (**новый**), `app/trips/[slug]/page.tsx` (кнопка копирования).
  - `app/trips/[slug]/plan/page.tsx` (вкладка «Калькулятор» с долями).
  - Соц‑страницы: `app/feed`, `app/news`, `app/network`, `app/notifications`, `app/profile`, `app/u/[id]` (**новые**); `components/social/` (Avatar/CommentThread/SocialTabs, **новые**); `components/support/SupportWidget.tsx`, `app/admin/support/page.tsx` (**новые**).
  - Клиенты `lib/social.ts`, `lib/network.ts`, `lib/support.ts` (**новые**), `lib/api.ts` (pace/даты/copyTrip), `lib/planning.ts` (expenses), `lib/auth.ts` (image/bio).
- **Удалено:** `frontend/src/components/canvas/GenerativeBackground.tsx`.

---

## 10. Переменные окружения

`.env.example` — полный список. Ключевые на **vela-api** (Render):
```
DATABASE_URL            # из Render Postgres (Blueprint подставляет)
NODE_ENV=production
JWT_SECRET              # генерится Render (generateValue)
JWT_EXPIRES=7d
APP_URL=https://velatrips.ru          # ссылки в письмах
SUPERADMIN_EMAIL        # логин супер-админа (локально admin@vela.local)
SUPERADMIN_PASSWORD     # пароль супер-админа
RESEND_API_KEY          # ЗАДАН на проде — реальная отправка писем
EMAIL_FROM=Vela <no-reply@velatrips.ru>   # домен velatrips.ru верифицирован в Resend
# Хранилище (Supabase Storage, подключено):
S3_ENDPOINT / S3_REGION / S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY / S3_PUBLIC_URL
```
На **vela-web** (Render): только `BACKEND_URL=https://vela-api-8rta.onrender.com` (runtime).
Карта работает без ключей (OSM/Leaflet). Интеграции (`BOOKING_API_KEY` и пр.) — опциональны.
Локально (`.env`, Docker): `POSTGRES_USER/PASSWORD/DB=vela/change_me_in_production/vela`,
`DATABASE_URL=postgresql://vela:change_me_in_production@db:5432/vela?schema=public`.

---

## 11. Как запускать / проверять

**Прод‑деплой:** `git push origin main` → Render auto‑deploy (Blueprint `render.yaml`).

**Локально через Docker:**
```bash
cd /Users/marat/Desktop/Repository
cp .env.example .env      # заполнить JWT_SECRET, SUPERADMIN_*, S3_* при желании
docker compose up --build # db:5432, api:4000, web:3000
```
> backend на старте: `prisma db push` → seed (best-effort) → старт.
> **После правок бэка/схемы:** `docker compose up -d --build backend` (образ пересоберётся, prisma generate внутри).
> Локально обычно подняты `repository-db-1` и `repository-backend-1`.
> Подключение к локальной БД из хоста: порт проброшен на `localhost:5432`
> (`docker exec repository-db-1 psql -U vela -d vela -c "..."`).

**Быстрые UI‑итерации (Next dev + Preview MCP), Node нужен локально:**
```bash
brew install node
cd frontend && npm install
docker compose stop web   # освободить порт 3000 (db+api оставить)
```
`.claude/launch.json` настроен (`BACKEND_URL=http://localhost:4000 npm run dev -- --port 3000`).
Preview MCP: `preview_start("web")` → `preview_screenshot`/`preview_resize`(mobile/desktop)/`preview_eval`.
**Важно:** не запускать `npm run build` (prod), пока работает `next dev` — это перетирает `.next` и ломает
dev‑сервер; перед `preview_start` после прод‑сборки делать `rm -rf frontend/.next`. Если dev «поломался»
после удаления `.next` на ходу — `preview_stop` + `preview_start` заново.

**Бэкенд:** `cd backend && npm install && npx prisma generate && npm run build` (typecheck/сборка);
`npm run build:seed` → `node dist-seed/prisma/seed.js` (сид; идемпотентен). Тесты: `npm test` (jest).

**Проверка API локально (пример):**
```bash
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@vela.local","password":"<SUPERADMIN_PASSWORD>"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
curl -s http://localhost:4000/api/feed -H "Authorization: Bearer $TOKEN"
```
> При тестах создавай временных пользователей и **подчищай данные** после (каскады по `User`/`Trip`
> удаляют связанные посты/лайки/друзей/уведомления/расходы). Учитывай: в zsh `$UID` зарезервирован.

---

## 12. Текущий статус

- **В проде, работает:** Фазы 0–3 + редактирование + приватные поездки + email‑верификация (Resend) +
  смена ролей + **калькулятор расходов (с долями)** + **создание поездок участниками (темп+даты)** +
  **копирование публичных поездок** + **соцсеть (лента/новости/друзья/уведомления/профили)** +
  **чат поддержки** + пастельный шань‑шуй дизайн с **качающейся сакурой** + мобильная нижняя навигация +
  кастомный домен **velatrips.ru** (SSL).
- **Незакоммичено:** ничего по фичам (untracked артефакты `dist-seed/`, `package-lock.json` — игнорировать).
- **Готовность:** функционально высокая. Не закрыто: личные чаты (1:1), модерация соц‑контента и
  расширенная аналитика в админке, даты в редакторе поездки, прод‑хардненинг (миграции, httpOnly cookie,
  rate‑limit, keep‑alive).

---

## 13. Рекомендованный порядок дальнейшей работы

1. **Соцсеть (Задача A):** личные чаты 1:1 (наибольшая ценность), затем модерация контента и пагинация.
2. **Поездки (Задача B):** даты в редакторе, доработки калькулятора (валюты/экспорт).
3. **Админка (Задача C):** расширенная аналитика (быстро и ценно), затем настройки платформы.
4. **Хардненинг (Задача D):** переход на `prisma migrate`, httpOnly cookie, rate‑limit, keep‑alive.

После каждого изменения: `npm run build` (фронт) / `docker compose up -d --build backend` (бэк) для проверки,
затем смоук‑тест API (curl) и UI через Preview MCP (mobile + desktop, светлая + тёмная), потом
`git commit` + `git push` (Render задеплоит). Соблюдать **Real Data Policy** (не выдумывать цифры) и
пастельный шань‑шуй стиль (низкоконтрастный, не отвлекающий). Схему править в `backend/prisma/schema.prisma`
и **синхронизировать копию** `database/prisma/schema.prisma`; применять через `prisma db push`.

— Конец хендоффа —
