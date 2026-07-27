# Vela — PROJECT HANDOFF

> Документ для продолжения работы в новом чате Claude Code **без доступа к истории переписки**.
> Прочитай целиком, затем иди в **§14 «Открытые задачи»**.
>
> Состояние: **2026-07-27**. Ветка `main`, HEAD = `f48430e`, рабочая копия чистая, всё запушено
> и живо на проде. Эндпоинты, модели, маршруты и переменные в этом документе сверены с кодом.

---

## 0. Старт: где работать и как не сломать прод

```
Рабочая папка:          /Users/marat/Desktop/Repository
GitHub (origin/main):   https://github.com/Pahar0001/WW
Прод (домен):           https://velatrips.ru            (= vela-web на Render)
Прод (фронтенд Render): https://vela-web-zr2u.onrender.com
Прод (API):             https://vela-api-8rta.onrender.com
API health:             https://vela-api-8rta.onrender.com/api/health
```

**`git push origin main` = деплой на прод.** Render авто-деплоит по Blueprint (`render.yaml`):
db + api + web. Перед пушем обязательно прогнать сборки (§11).

**Правила владельца:**
- Коммитить и пушить **только по явной просьбе**; при сомнении — спросить.
- Коммит заканчивать строкой `Co-Authored-By` текущей модели.
- Секреты не коммитить: `.env` в `.gitignore`, прод-значения — в Render Dashboard → Environment.
- Тело коммита пишет **что и почему**, особенно неочевидные решения — они экономят часы следующему.

⚠️ **Три способа положить прод, каждый уже случался — читай §12 до первого пуша.**

---

## 1. Что за проект

**Vela** — премиальная платформа планирования путешествий (RU-интерфейс) с социальным слоем.
Готовые маршруты с планом по дням, конструктор, карты, реальные цены авиабилетов, расчёт трат,
погода, курсы валют, отели, заявки «под ключ» с ИИ-брифом, соцсеть, мессенджер с голосовыми,
сообщество по странам (визы/въезд/посольства), оценки маршрутов, ИИ-консьерж с историей диалогов,
чат поддержки, авторизация + RBAC + админка с метриками и аналитикой, PWA с офлайном, PDF-экспорт,
воскресный email-дайджест и интерактивный 3D-мир `/vela`.

### Принципы, которые нельзя нарушать

1. **Real Data Policy (священна).** Не выдумывать цены, расстояния, время. Реальные данные →
   `VERIFIED` + `source`/`sourceUrl`; расчёты → `ESTIMATED`; неизвестное → `PENDING`. В UI всегда
   видно происхождение и дату значения.
2. **Мягкая деградация.** Нет ключа или внешний API упал → фича молча прячется либо показывает
   честное «нет данных». Страница не ломается никогда.
3. **Ноль `setState` в горячих циклах** (скролл, rAF, игровой кадр) — писать напрямую в `style`
   через refs. См. общий тикер в §7.
4. **Кэш на бэкенде для внешних API** — free-план Render не выдержит прямых запросов.
5. **Приватность по умолчанию:** аналитика анонимна (visitorId, из реферера только хост),
   приватные маршруты не раскрываются даже через погоду, отписка от писем подписана HMAC.

**Монетизация (решение владельца):** партнёрка Travelpayouts (marker в ссылках Aviasales) +
платная услуга «маршрут под ключ» (админ ставит `priceRub` в заявке). Подписка отложена.

**Дизайн:** кинематографический тёмный иммерсив. Палитра — крем `ink` / уголь `paper` /
антикварное золото `aurora`; Inter + Fraunces; тёмная и светлая темы.

---

## 2. Стек и жёсткие ограничения

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 14.2 (App Router, TS), Tailwind (HSL-токены), Framer Motion |
| 3D | three 0.160 + @react-three/fiber 8 + drei 9 + postprocessing 6.35.6 |
| Карты | Leaflet + CARTO |
| Backend | NestJS 10, Prisma 5.22, REST, zod |
| БД | PostgreSQL 16 |
| Auth | JWT (`jsonwebtoken`) + bcryptjs, свои guards/decorators, без passport |
| Файлы | В БД (модель `Upload`, `GET /api/uploads/:id`); опц. S3. Изображения, PDF, audio/video |
| Email | Resend (`EmailService`); без ключа письмо уходит в лог |
| ИИ | Groq (OpenAI-совместимый), `llama-3.3-70b-versatile` |
| Цены билетов | Travelpayouts: Aviasales Data API `prices_for_dates` |
| Погода | Open-Meteo (без ключа, CC-BY) |
| Курсы валют | ЦБ РФ `XML_daily.asp` (windows-1251) |
| Новости | Открытые RSS: Лента.ру «Путешествия», Perito, 34travel |
| OG-картинки | `next/og` (satori) + Inter из `public/fonts` |
| Деплой | Render Blueprint, Docker, домен velatrips.ru |

### ⚠️ Ограничения — не ломать

- **`three@0.160` + `fiber@8` + `drei@9` + React 18.** `@react-three/fiber@9` требует React 19,
  `@react-three/postprocessing@3.x` требует fiber 9. Обновлять нельзя без переписывания всего 3D.
- **Зависимость с peer на `three`/`react`/`fiber` — только ТОЧНОЙ версией, без каретки.**
  Причина и способ проверки — §12.1. Это уже роняло деплой.
- **Хиро-видео кодировать с частыми keyframes:** `-g 10..12 -sc_threshold 0`, иначе скраб назад рвётся.
- **Шрифт, встроенный в `next/og`, без кириллицы** — OG-картинки грузят Inter из `public/fonts`
  через `fs.readFile` (не `new URL(import.meta.url)`: в standalone-сборке ломается).
- **Схему править в `backend/prisma/schema.prisma` и копировать `cp` в `database/prisma/`.**

---

## 3. Архитектура

**Runtime-прокси.** Браузер всегда зовёт свой origin (`/api/*`, `/uploads/*`), Next-сервер
форвардит на `BACKEND_URL`. Файлы: `frontend/src/app/api/[...path]/route.ts`,
`app/uploads/[...path]/route.ts`, `lib/proxy.ts`. SSR приватных поездок читает cookie `vela_token`.

```
Браузер → Next.js (web) —proxy→ NestJS (api) → PostgreSQL (+ байты Upload)
                                   ├→ Resend (письма, дайджест)
                                   ├→ Groq (консьерж, ИИ-бриф заявок)
                                   ├→ Travelpayouts/Aviasales (цены билетов)
                                   ├→ Open-Meteo (погода)
                                   ├→ ЦБ РФ (курсы валют)
                                   └→ RSS-ленты (travel-новости)
```

**Кино-hero** (`frontend/src/components/hero/`): секция 420vh + sticky 100svh, скролл = таймлайн
видео. Модули: `ScrollController` (rAF + lerp + IO/RO), `VideoScrubber` (очередь сиков + вотчдог),
`MotionController` (чистые функции таймингов), `ColorGrading` (SVG-фильтр), `PaperNoise`,
`HalftoneOverlay` (выключен, компонент в базе), `HeroVideo` (дирижёр, пишет в style из rAF).
Медиа: `public/hero/thailand.mp4` (47 с, 1080p, 16 МБ) + постер; конфиг `lib/hero-media.ts`.
На `<768px` и при `prefers-reduced-motion` — статичный режим `isStatic` (одна секция с фото):
скраб 16-МБ видео тормозил и конфликтовал с тач-скроллом.

**Глобус** (`components/ui/Hero3D.tsx`): Земля с текстурой NASA Blue Marble
(`public/globe/earth.jpg`, 435 КБ) + процедурные облака + рэлеевская атмосфера. Магнитное
наведение: снап к ближайшей видимой стране в радиусе 56 px; **видимость считается по расстоянию до
камеры, а НЕ по нормали** — тест по нормали браковал приполярные страны, это был баг. Драг
двухосевой: горизонталь — долгота, вертикаль — наклон ±72°. Подпись страны — **HTML-чип внизу
обёртки**: в 3D через `Html` она обрезалась краем секции. Используется в `GlobeSection` (главная)
и `VisitedMap` (профиль). Детали физической модели — §12.4.

**Планировщик дайджеста** — внутрипроцессный (`DigestService`, `OnModuleInit` + `setInterval`
10 мин) с «догоном» через метку в `SystemState`. Внешнего крона нет, а на free-плане Render сервис
засыпает — поэтому догон обязателен.

**Игровой мир `/vela`** — изолированный слой, см. §8.

---

## 4. База данных

Каноничная схема: `backend/prisma/schema.prisma`, копия — `database/prisma/schema.prisma`
(**синхронизировать `cp` после каждой правки**).

### Модели

| Группа | Модели |
|--------|--------|
| География | `Country → Region → City → Place` (+provenance), `SeasonInsight`, `Hotel` |
| Маршрут | `Trip → RouteVariant(CALM/BALANCED/ACTIVE) → Day → DayPlace / TransportLeg` |
| Деньги | `BudgetBreakdown → BudgetLine`, `Expense` |
| Оценки | `TripScore`, `TripOpinion`, `TripRating` |
| Поездка | `Ticket`, `TripDocument`, `CalendarEvent → Reminder`, `ChatMessage`, `TripMember` |
| Память | `Album → Photo`, `Memory` |
| Соцсеть | `Post`, `Like`, `Comment`, `Repost`, `Friendship`, `Notification` |
| Сообщество | `CommunityMessage` |
| Мессенджер | `Conversation`, `ConversationMember`, `ConversationMessage` |
| Ассистент | `AssistantThread`, `AssistantMessage` |
| Пользователь | `User`, `SavedTrip`, `VisitedCountry`, `AuditLog` |
| Заявки | `TripOrder` |
| Служебное | `Upload`, `TripView`, `SystemState`, `SupportMessage` |

**Ключевые enum:** `DataStatus` (VERIFIED/ESTIMATED/PENDING), `Pace`, `TripStatus`,
`TripVisibility`, `TransportMode`, `BudgetCategory`, `UserRole`, `UserStatus`, `TripMemberRole`,
`TripOrderStatus`, `SocialTarget`, `FriendStatus`, `NotificationType`, `TicketKind`,
`CalendarEventType`, `ReminderChannel`, `ConversationMessageKind` (TEXT/VOICE/VIDEO_NOTE).

**Неочевидные поля:**
- `User.lastSeenAt` — активность, touch в `JwtAuthGuard` раз в 5 минут; «онлайн» = < 5 минут.
- `User.digestOptOut` — отказ от воскресного дайджеста.
- `Trip.inviteToken` (unique) — ссылка-приглашение `/join/<token>`.
- `TripView` — просмотр маршрута: `visitorId` для анонимов, `referrer` хранит **только хост**.
- `SystemState` — пары ключ-значение; сейчас там `digest.lastSentSlot`.

### Seed

Флагман «China — Floating Mountains» (3 варианта), приватный Питер и **28 интро-маршрутов по
странам с планом по дням**: 210 дней, 189 мест с фото, координатами и описаниями из ru.wikipedia
(`VERIFIED` + sourceUrl; данные в `seed-countries.ts`, массив `plan`). Идемпотентно: дни строятся
только если у поездки нет `RouteVariant`. Первый сид на пустой БД — 2–3 минуты (ходит в Википедию).

⚠️ **В прод-базе страна «Россия» задублирована 4 раза** (разные слаги). Учтено дедупом в
`news.service.ts`; помни об этом при любой работе с географией.

---

## 5. Миграции

**Формальных миграций НЕТ.** Каталога `backend/prisma/migrations/` не существует; схема
накатывается `prisma db push` на старте контейнера:

```
CMD npx prisma db push --skip-generate --accept-data-loss && (npm run seed || …) && node dist/main.js
```

⚠️ **`--accept-data-loss` обязателен.** `db push` останавливается на ЛЮБОМ предупреждении —
включая безопасное «добавляется unique-индекс на новой пустой колонке» — и выходит с кодом 1.
Именно это положило четыре деплоя подряд (§12.2). **Любая будущая схема с unique/NOT NULL требует
этого флага — или, что правильнее, перехода на `prisma migrate`.**

**Применено `db push`'ем за всё время:** `TripRating`, `Upload`, `TripOrder` (+`priceRub`),
`User.lastSeenAt`, `User.digestOptOut`, `AssistantThread`, `AssistantMessage`, `TripView`,
`Conversation`, `ConversationMember`, `ConversationMessage`, `VisitedCountry`, `SystemState`,
`Trip.inviteToken`.

Локально накатить схему:

```bash
cd backend
DATABASE_URL='postgresql://vela:change_me_in_production@localhost:5432/vela?schema=public' \
  npx prisma db push --skip-generate --accept-data-loss && npx prisma generate
```

➡️ **Переход на `prisma migrate` (baseline + `migrate deploy` в CMD) — задача №1 в §14.**

---

## 6. Бэкенд: модули и эндпоинты

`backend/src/modules/`: `admin`, `analytics`, `assistant`, `audit`, `auth`, `chats`, `community`,
`currency`, `digest`, `email`, `health`, `integrations`, `network`, `news`, `orders`, `planning`,
`prisma`, `recommendations`, `routes`, `social`, `support`, `travel`, `trips`, `uploads`, `weather`.

### RBAC

Роли `SUPER_ADMIN > ADMIN > ORGANIZER > MEMBER`. `JwtAuthGuard` (Bearer; `BLOCKED` режется;
touch `lastSeenAt`), `RolesGuard` (SUPER_ADMIN проходит всё), декораторы `@Public`, `@CurrentUser`,
`@Roles`. Токен: localStorage `vela_token` + cookie (для SSR). Первый супер-админ поднимается из
`SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`.

**Публично:** публичные маршруты, сообщество, `travel/*`, `health`, `news/travel`,
`currency/rates`, `weather/trip/:slug`, `digest/unsubscribe`, `trips/invite/:token`.

### Эндпоинты (префикс `/api`, сверено с контроллерами)

| Модуль | Маршруты |
|--------|----------|
| `auth` | `POST register, login, verify-email, resend-verification, accept-terms, forgot-password, reset-password` · `GET me` |
| `trips` | `GET mine, :slug, :slug/estimate, invite/:token` · `POST :slug/copy, :slug/invite, :slug/view, :slug/rate, invite/:token/accept` · `PATCH :slug` · `DELETE :slug` |
| `planning` | `GET trips/:slug/{planning,chat,members,expenses,memories,timeline}` · `POST` для tickets/documents/events/hotels/chat/members/expenses/albums/photos/memories · `DELETE` по id · `PATCH trips/:slug/members/:userId/role` |
| `travel` | `GET status, plan/:slug?origin&depart&return` — реальные цены билетов (кэш 10 мин, партнёрский marker) + дип-линки отелей |
| `orders` | `POST refine` (Groq: пожелание → бриф), `POST /`, `GET mine`, `GET /` (ADMIN), `GET new-count`, `PATCH :id` (статус + adminNote + priceRub) |
| `assistant` | `GET status, threads, threads/:id` · `POST chat, threads, threads/:id/messages` · `PATCH/DELETE threads/:id` |
| `chats` | `GET /, unread-count, :id, :id/messages` · `POST direct, group, :id/messages, :id/members` · `PATCH :id/read, :id` · `DELETE :id/members/me` |
| `social` | `GET feed, news, comments` · `POST news, like, comments, reposts/:tripId` · `DELETE posts/:id, comments/:id` |
| `network` | `GET users, users/:id, friends, notifications, profile, profile/visited, users/:id/visited` · `POST friends/:userId(/accept), notifications/read` · `PATCH profile` · `PUT profile/visited` · `DELETE friends/:userId` |
| `community` | `GET rooms, :country` · `POST :country` · `DELETE messages/:id` |
| `admin` | `GET stats, analytics, trips, users, users/:id, audit` · `PATCH users/:id/role` · `POST users/:id/{block,unblock,verify,reset-password}` · `DELETE users/:id` |
| `support` | `GET thread, threads, threads/:userId` · `POST thread, threads/:userId` |
| `digest` | `GET unsubscribe` (HMAC, публично, HTML-ответ), `GET/POST settings`, `POST test` (ADMIN) |
| `news` | `GET travel` — RSS-агрегатор, кэш 15 мин, ручной XML-парс без зависимостей |
| `weather` | `GET trip/:slug` — Open-Meteo по базовым городам, до 6, кэш 30 мин, приватные → 404 |
| `currency` | `GET rates` — ЦБ РФ, 53 валюты, кэш 6 ч, RUB за единицу |
| `analytics` | `POST event`, `GET summary` |
| `uploads` | `GET :id` — файл из БД |
| `integrations`, `recommendations`, `routes`, `health` | `GET status`, `GET hotels`, `POST plan`, `GET variant/:id/analysis`, `GET health` |

---

## 7. Фронтенд: маршруты и ключевые компоненты

### Маршруты (App Router)

`/` · `/admin` · `/admin/analytics` · `/admin/orders` · `/admin/support` · `/admin/users` ·
`/assistant` · `/community` · `/community/[country]` · `/data` · `/feed` · `/forgot-password` ·
`/join/[token]` · `/login` · `/messages` · `/network` · `/news` · `/notifications` · `/offline` ·
`/order` · `/profile` · `/register` · `/reset-password` · `/terms` · `/trips/[slug]` ·
`/trips/[slug]/edit` · `/trips/[slug]/plan` · `/trips/[slug]/print` · `/trips/new` · `/u/[id]` ·
`/vela` · `/verify-email` · `/welcome`

### Моушн-фундамент — `lib/motion.ts`

**Один общий rAF-тикер на всё приложение.** Параллакс, магнитные кнопки, наклон карточек,
индикатор прокрутки, компас и карта игры подписываются на него и пишут результат прямо в
`style`/canvas. Тикер спит, когда нет подписчиков или вкладка скрыта.

Там же: кривые (`EASE`, `EASE_EXPO`), `damp()` — **сглаживание, не зависящее от частоты кадров**
(обычный `v += (target−v)*0.1` на 144 Гц бежит вдвое быстрее, чем на 60), `detectTier()` — класс
устройства low/mid/high, `useViewportProgress()` — прогресс элемента по вьюпорту с кешированной
геометрией (без `getBoundingClientRect` на каждом кадре).

⚠️ **Не добавлять GSAP / Lenis / Locomotive.** Плавный скролл с перехватом `wheel` ломает
кино-hero, который привязан к нативному `scrollY`.

### Компоненты

| Файл | Назначение |
|------|-----------|
| `ui/Motion.tsx` | `SplitText` (буквы/слова/строки, mask-reveal), `MaskReveal`, `Parallax`, `ScrollDepth`, `VelocitySkew`; старый API `TextReveal`/`FadeIn`/`Stagger` сохранён |
| `ui/Tilt.tsx` | `useTilt()` — 3D-наклон, следящий блик, «дыхание». **Хук, а не обёртка:** лишний div вокруг карточки ломает растяжение в grid |
| `ui/Card.tsx`, `ui/Button.tsx` | Наклон и магнит вшиты сюда — все страницы получают физику без правок |
| `fx/Ambience.tsx` | Фоновый canvas: световые массы, пылинки, дымка. Рисуется в 0.42–0.75 разрешения |
| `fx/Atmosphere.tsx` | Плёночное зерно, индикатор прокрутки, магнит `[data-magnetic]` (пружина, не CSS-transition) |
| `fx/CinematicPost.tsx` | Общий пост-пресет: DOF → bloom → дисперсия → грейд → виньетка → зерно, по тирам |
| `fx/particles.ts` | `makeGlowTexture()` — обязателен для любого `pointsMaterial`: без карты он рисует **квадраты** |
| `ui/Hero3D.tsx` | Глобус (§3, §12.4) |
| `ui/GlobeSection.tsx` | Секция «Планета Vela» |
| `ui/ScrollRail.tsx` | «Нить путешествия»: золотая линия слева, узлы у секций с `data-rail`. Всё пишется в style напрямую; **cleanup обязан удалять созданные DOM-узлы** — иначе в dev StrictMode дубли |
| `ui/FloatingNav.tsx` | Нижняя «пилюля» (desktop): стекло, сжатие по скроллу, переезжающая подсветка активного раздела. Скрыта в кино-hero и на страницах из `HIDDEN_PREFIXES` |
| `ui/BottomNav.tsx` | Мобильная бургер-шторка с общим бейджем; «Помощь» открывает консьержа/поддержку событиями `vela:open-assistant` / `vela:open-support` |
| `ui/SiteHeader.tsx` | Мобильная шапка |
| `assistant/AssistantWidget.tsx` + `assistant/parts.tsx` | Виджет консьержа (stateless) + общие Spark/renderRich/Typewriter |
| `app/messages/page.tsx` | Мессенджер: 2 панели ⇄ мобильный стек, поллинг активного чата 4 с (`?after=`), списка 12 с |
| `chat/VoiceRecorder.tsx` | Голосовые: MediaRecorder, таймер, отмена, лимит 2 мин → `/api/uploads` → `uploadId` |
| `trip/*` | `TripWeather`, `CurrencyCard`, `PrintControls`, `TripViewBeacon`, `SaveOfflineButton`, `InviteTripLink` |
| `profile/VisitedMap.tsx`, `profile/DigestToggle.tsx` | «Где я был» (мини-глобус) и тумблер дайджеста |
| `pwa/PwaProvider.tsx` | Регистрация SW (только prod), предложение установки, индикатор офлайна |
| `admin/AdminDashboard.tsx` | Метрики с трендами; `AreaChart` экспортирован и переиспользуется в `/admin/analytics` |

**`lib/`:** `api.ts`, `chat.ts`, `assistant.ts`, `news.ts`, `og.tsx`, `motion.ts`,
`world-countries.ts` (~90 стран), `country-currency.ts` (ключи — слаги каталога, у них формат
ISO-2), `country-coords.ts`, `plural.ts`, `embassies.ts`.
**`data/globe-geo.json`** — границы стран для глобуса (137 КБ, Natural Earth 110m, предвычислено).

**Логотип Vela в навигации ведёт на `/vela`, а не на главную** — так просил владелец. Чтобы путь
домой не потерялся, «Главная» есть отдельным пунктом в `FloatingNav`, в мобильном меню
`SiteHeader` и в бургере `BottomNav`.

**CSS-утилиты (`globals.css`):** `.card-lux`, `.glass`, `.glass-nav`, `.tilt-3d`, `.spotlight`
(⚠️ `::before` обязан быть `z-index: -1`, иначе перекрывает текст), `.edge-light`, `.shadow-depth`,
`.pop-menu`, `.pop-down`, печатные стили `body[data-print]` + `@page`.

---

## 8. Vela Island — игровой мир `/vela`

`app/vela/page.tsx` → `dynamic(ssr: false)`. **Бандл игры (267 кБ / 397 кБ First Load) полностью
изолирован маршрутом — общий чанк сайта остался 87.3 кБ.** На `/vela` обвязка сайта скрыта
(`FloatingNav`, `BottomNav`, поддержка, консьерж).

**Мир — материк 840 × 840 м (было 330 × 330, площадь выросла в 6.5 раза), десять зон.**

```
components/game/
  VelaIsland.tsx          оркестратор: тиры, поэтапная сборка мира, Canvas, свет
  state.ts                стор: дискретное состояние в React + `live` (позиция, курс, FPS) ВНЕ React
  regions.ts              10 регионов + 3 секрета + 10 артефактов, каждый со ссылкой в раздел Vela
  world/terrain.ts        шум, ЗОНЫ, поле высот, реки, каньон, тропы, площадки, грейдер сети троп
  world/TerrainMesh.tsx   чанки с двумя LOD; материалы и AO запечены в цвета вершин
  world/Water.tsx         океан, 4 озера, лава, реки, водопады (один шейдер)
  world/Sky.tsx           купол неба, палитра ATMO, FOG_DENSITY, облака
  world/Scatter.tsx       лес/камни/цветы по зонам (инстансинг) + бегущий за игроком газон
  world/Landmarks.tsx     руины, статуи, грот, мосты, смотровые, маяки, артефакты
  world/colliders.ts      цилиндрические коллайдеры рукотворных объектов
  world/Wildlife.tsx      птицы, бабочки (инстансинг + шейдер), олени
  player/controller.ts    ввод, физика, состояния анимации
  player/Traveler.tsx     персонаж: процедурный риг + позы
  camera/FollowCamera.tsx пружинная камера с коллизией + облёт для брифинга
  hud/Hud.tsx             компас, карта, карточка региона, тосты, брифинг
```

**Зоны** (`ZONES` в `terrain.ts`) — не декорация, а набор параметров рельефа (базовая высота,
скалистость, частота холмов, материал, палитра). Высота в точке — взвешенная смесь зон, поверх
которой ложатся хребты (`SPINES`), кальдеры (`BASINS`), дюны, каньон, реки, тропы и площадки:

| зона | где | что |
|---|---|---|
| `cove` | юг | пляжи, спавн, Бухта Зари |
| `meadow` | центр | связующая долина, луга |
| `jungle` | юго-запад | густой лес, лагуна |
| `canyon` | запад | плато Красных Стен, разлом до моря |
| `glacier` | северо-запад | лёд, снег, тарн, водопад Ледяные Слёзы |
| `ridge` | север | главный хребет, высшая точка 146 м |
| `volcano` | северо-восток | жерло с лавой, пепел |
| `desert` | восток | барханы, оазис |
| `ruins` | юго-восток | плато, древний город, обрыв |
| `crater` | центр-север | кратерное озеро, исток главной реки |

Отдельно — **Остров Забвения** за проливом (376, 300): пешком недостижим намеренно, это будущая
награда за лодку. Проверяется тестом связности (см. ниже) и помечен `secret`.

**Всё процедурное: ни одной внешней модели, текстуры или HDRI.** Mixamo требует входа в аккаунт
Adobe, сторонние GLB приходят без внятной лицензии, `drei <Environment preset>` тянет мегабайты с
CDN на каждой загрузке. Мир собирается за ~1 секунду и не зависит от сети.

### Решения, которые нельзя откатывать не разобравшись

1. **Рельеф считается один раз в `Float32Array`.** Меш, физика героя, камера, расстановка деревьев
   и мини-карта читают ОДНО поле высот с билинейной интерполяцией. Если семплировать шум напрямую,
   между вершинами сетки (там меш плоский) герой то проваливается, то парит.
2. **Берег НЕ моделируется геометрией.** Поле высот уходит во float-текстуру, водная плоскость
   делает `discard` там, где земля выше уровня воды. Отсюда бесплатно: точная кромка в любой бухте,
   цвет по глубине, пена ровно на отмели.
3. **Водопады, каньон и перевалы в валы кальдер ВЫРЕЗАНЫ в рельефе намеренно** (`RIVERS`, `CANYON`,
   `TRAILS`, `FLATS`). Ждать нужную вертикальную стену от шума бессмысленно. Профиль русла задан
   руками и монотонно убывает — глаз мгновенно ловит «реку, текущую в гору».
4. **Тропы выравниваются СЕТЬЮ, а не по одной** (`gradeTrails`). Развилки записаны в разных трассах
   одной парой координат и считаются ОДНИМ узлом. Пока каждая трасса грейдилась отдельно, в общей
   точке они приходили к разным высотам (133 против 108) и на стыке вставала ступень в 25 м.
5. **Полотна троп смешиваются по весам, а не накладываются по очереди** (`heightAt`). У развилки
   коридоры перекрываются; при последовательном наложении побеждала трасса, стоящая в массиве
   позже, и давала провал с последующей стенкой в 61°.
6. **Вал кальдеры — гарантированный минимум высоты, а не прибавка** (`Basin.rimUp`). Прибавка
   работает на равнине, но чаша на склоне всё равно вытекает под гору: у тарна вал был на 8 м НИЖЕ
   собственного зеркала.
7. **Ни один узел тропы не лежит внутри чаши из `BASINS`.** Тропа прорезает рельеф, но НЕ убирает
   воду — герой шёл бы по дну озера. Четыре трассы из восьми проходили через зеркало, включая
   финал вулканической — в центр жерла, то есть в лаву.
8. **Площадки (`FLATS`) не накрывают центры чаш**: они применяются ПОСЛЕ вырезания кальдер и просто
   засыпают их. Три озера из пяти превращались в ровное плато.
9. **Рельеф нарезан на 100 чанков с двумя LOD** (`TerrainMesh.tsx`). Единым мешем это 630 000
   треугольников, которые рисуются целиком даже когда 90 % за спиной. Отдельные меши отсекаются по
   пирамиде видимости бесплатно, дальние рисуются вчетверо более редкой сеткой. Стыки закрыты
   «юбкой» — кольцом вершин, опущенным на 2 м.
10. **AO запечён в цвета вершин**, SSAO-прохода нет: ноль кадрового времени вместо 2–4 мс.
11. **Рябь воды считается НА ПИКСЕЛЬ** (`waveNormal`), в геометрии осталась только длинная зыбь.
    Сетка воды растянута на весь мир (3.7 м между вершинами у океана), и рябь с длиной волны 7 м
    попадала на неё тремя точками на период — вместо воды шли ровные полосы шириной с дом. Рябь
    гаснет с расстоянием: иначе её период становится меньше пикселя и даёт муар.
12. **`FOG_DENSITY` объявлена ОДИН раз** в `Sky.tsx`. Собственные шейдеры воды не получают туман
    сцены автоматически и считают его сами; пока константа была записана дважды, горы растворялись
    в дымке, а океан у горизонта оставался синим.
13. **Тень солнца — 62 м вокруг героя** и едет с ним. Накрыть материк (840 м) картой 2048 значило бы
    41 см на пиксель: тени превратились бы в лестницы.
14. **Газон живёт в диске 26 м вокруг героя** и пересаживается, когда тот отходит на 3 м. Засеять
    весь материк — либо не видно под ногами, либо миллионы полигонов за кадром.
15. **Сборка мира уступает управление браузеру порциями по времени** (12 мс на видимой вкладке).
    На СКРЫТОЙ вкладке `requestAnimationFrame` не вызывается вовсе, и сборка замирала до
    возвращения пользователя — там уступаем через `MessageChannel`, который в фоне не придушен.
16. **Прогресс игрока** — в `localStorage['vela_island_progress']` (открытые регионы + артефакты).

### Проверка мира — `frontend/scripts/check-world.ts`

```bash
cd frontend && node --no-warnings scripts/check-world.ts
```

Гоняйте ПОСЛЕ ЛЮБОЙ правки рельефа, троп, рек или координат регионов. Скрипт собирает поле высот
вне браузера и печатает:

* время сборки и память по тирам, стоимость `heightAt`;
* экстремумы высот и долю суши (сейчас 146 м и 64 %);
* **чаши** — дно, зеркало и минимум вала ПО КРУГУ: где вал ниже зеркала, озеро вытечет
  (лучи, идущие по руслу, пропускаются — сток это законный проран);
* **реки** — монотонность профиля и узлы, лежащие на гребне вместо русла;
* **тропы** — максимальный уклон вдоль трассы (предел ходьбы 0.50) и участки под водой;
* **связность** — заливка от спавна: сколько процентов проходимых клеток достижимо и достижим ли
  КАЖДЫЙ регион и КАЖДЫЙ артефакт;
* ASCII-карту материка.

Восемь настоящих багов этой правки найдены именно им, а не глазами: суша на 97 % карты без океана,
вершина 266 м при заявленных 152, четыре тропы с уклоном до 88 % (в том числе по дну озера и в
центр лавы), три пересыхающих озера, тропа, засыпавшая оазис, и река, текущая в гору на последних
ста метрах. На глаз в мире 840 × 840 м не видно ничего из этого.

**Отладка (только dev):** `window.__vela = { char, hf, input, live, to(x, z) }`.
Например `__vela.to(74, 44)` — телепорт к руинам, `__vela.input.lookX = -30` — поворот камеры.
Тот же приём есть в `Hero3D` (`window.__aim`).

---

## 9. Реализованные функции

**Ядро.** Auth + RBAC + верификация email; планирование маршрутов и приватные поездки; расходы;
соцсеть (лента, новости, друзья, уведомления); сообщество по странам + гиды + правила въезда +
посольства; оценки маршрутов; загрузки в БД; профиль; чат поддержки; админка; кино-hero; магнитный
глобус; реальные цены билетов и расчёт трат; заявки «под ключ» с ИИ-брифом; дни маршрутов из
Википедии; ИИ-консьерж.

**Дальше по времени добавления:**

1. **Онбординг `/welcome`** — 4 шага, клавиши ←/→/Esc, занавес на главную. Единственный вход —
   из `verify-email` после первого подтверждения почты; пройденное метится `vela_welcomed`.
2. **`/assistant`** — консьерж с историей диалогов в БД: список слева (переименование, удаление),
   лента справа, титул = первый вопрос, оптимистичная отправка.
3. **PDF-экспорт** `/trips/[slug]/print` — обложка, факты, план по дням, отели, бюджет, чек-листы,
   заметки, подвал с источниками. PDF системной печатью: вектор, живые ссылки, работает офлайн.
4. **SEO** — `generateMetadata` маршрутов (canonical/OG/twitter, PRIVATE → noindex), динамические
   OG-картинки, `sitemap.ts`, `robots.ts`, metadata клиентских разделов через `layout.tsx`.
5. **Аналитика посещений** — `TripView` + маячок + `/admin/analytics`: сводка, ряд за 30 дней,
   топ маршрутов и стран, источники. Дедуп 30 мин, анонимный visitorId, из реферера только хост.
6. **PWA** — manifest, иконки, service worker (навигации network-first с откатом в кэш, статика
   cache-first, API и uploads не кэшируются), кнопка «Офлайн» на маршруте, `/offline`.
7. **Мобильный UX** — статичный hero, бургер-шторка вместо нижнего бара с шестью иконками.
8. **Мессенджер** — личные и групповые чаты, поллинг, непрочитанные, участники, выход,
   **голосовые сообщения**. Кружки (`VIDEO_NOTE`): модель и бэкенд готовы, UI нет.
9. **Travel-новости** — агрегатор открытых RSS, подсветка стран каталога по стемам, вкладка
   «Мир туризма» в `/news`.
10. **Погода** (Open-Meteo) и **курсы валют** (ЦБ РФ) на странице маршрута.
11. **«Где я был»** — отметки посещённых стран, мини-глобус в профиле, витрина в чужом профиле.
12. **Инвайты в поездку** — `/join/<token>`, кнопка «Пригласить» на приватных маршрутах.
13. **Email-дайджест** — воскресенье 15:00 МСК, догон после сна, новые маршруты + топ недели,
    HMAC-отписка, тумблер в профиле, `POST /digest/test` для проверки вёрстки.
14. **Премиальный моушн-слой** — общий rAF-тикер, split-text, параллакс, 3D-наклон карточек,
    фоновая атмосфера, кинематографический пост-процесс (§7).
15. **Vela Island `/vela`** — интерактивный 3D-мир, вход по логотипу (§8).
16. **Физическая модель глобуса** — процедурные облака, блик солнца по океану, рэлеевская
    атмосфера (§12.4).

---

## 10. Переменные окружения

Полный список — `.env.example`, прод-декларации — `render.yaml`.

### `vela-api`

```
DATABASE_URL, NODE_ENV, JWT_SECRET, JWT_EXPIRES=7d, APP_URL=https://velatrips.ru
SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD
RESEND_API_KEY (задан на проде), EMAIL_FROM      ← нужен для дайджеста и верификации
GROQ_API_KEY   ⚠️ НЕ ЗАДАН → консьерж и бриф отвечают заглушкой
GROQ_MODEL=llama-3.3-70b-versatile
TRAVELPAYOUTS_TOKEN   ⚠️ есть локально в .env, на Render вписать вручную (sync:false)
TRAVELPAYOUTS_MARKER  ⚠️ партнёрский marker — владелец ещё не дал значение
NEWS_FEEDS (опц.)     формат: "Название|https://url, Название2|https://url2"
S3_* (опц.)           S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID,
                      S3_SECRET_ACCESS_KEY, S3_PUBLIC_URL
```

### `vela-web`

```
BACKEND_URL
NEXT_PUBLIC_HERO_MEDIA_URL     (опц.; 'none' → глобус вместо видео-hero)
NEXT_PUBLIC_HERO_MEDIA_POSTER  (опц.)
```

**Ключи без значения деградируют мягко:** нет GROQ → заглушка ассистента; нет RESEND → письмо в
лог; нет TRAVELPAYOUTS → блок цен показывает «не настроено». Погода, курсы, новости, глобус,
мессенджер, PWA и игра работают **без единого ключа**.

В `.env.example` есть ещё `BOOKING_API_KEY`, `AGODA_API_KEY`, `SKYSCANNER_API_KEY` и подобные —
**это задел, код их не читает.** Не путать с рабочими.

---

## 11. Как запускать и проверять

**Docker:** `repository-db-1` (5432), `repository-backend-1` (4000), `repository-web-1` (3000).

Для UI-итераций:

```bash
docker compose stop web          # освободить порт 3000
# затем preview-MCP «web» (.claude/launch.json) = Next dev на 3000 с BACKEND_URL=localhost:4000
```

⚠️ **`.claude/` в `.gitignore`, поэтому в свежем клоне конфига preview-сервера НЕТ.**
Если его нет — создать `.claude/launch.json`:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "web",
      "runtimeExecutable": "sh",
      "runtimeArgs": ["-c", "cd frontend && BACKEND_URL=http://localhost:4000 npm run dev -- --port 3000"],
      "port": 3000
    }
  ]
}
```

После правок бэка или схемы: `docker compose up -d --build backend` (старт делает db push + seed).
Вернуть прод-режим: `docker compose up -d --build web`.

**Перед пушем — обязательно:**

```bash
cd frontend && npx tsc --noEmit && BACKEND_URL=http://localhost:4000 npx next build
cd ../backend && npx tsc --noEmit && npm run build && npm run build:seed
```

И проверка разрешения зависимостей ровно так, как это делает Render (§12.1):

```bash
mkdir -p /tmp/npmcheck && cp frontend/package.json /tmp/npmcheck/
cd /tmp/npmcheck && npm install --no-audit --no-fund   # должно завершиться кодом 0
```

---

## 12. Грабли — читать до работы

### 12.1. Деплой падает на `npm install` (стоило красного деплоя)

`frontend/Dockerfile` копирует **только `package.json`** и делает `npm install` — то есть
**`package-lock.json` при сборке образа игнорируется**, зависимости разрешаются заново. Из-за этого
`"postprocessing": "^6.35.6"` на Render превращался в `6.39.x`, который требует `three >= 0.168`,
а проект жёстко держит `three@0.160`. Конфликт пиров → `npm install` выходит с кодом 1 → красный
`vela-web`, лог обрывается на `Dockerfile:11`. Локально не воспроизводится: там лок-файл есть.

**Правило: любая зависимость с peer на `three`, `react` или `@react-three/fiber` пишется точной
версией, без каретки.** Проверять командой из §11.

### 12.2. `prisma db push` без флага (четыре красных деплоя подряд)

На старте контейнера push останавливался на предупреждении «unique constraint on `Trip.inviteToken`
… this will fail» и выходил с кодом 1. Лечение — `--accept-data-loss` в `CMD` (колонка новая и
пустая, NULL в Postgres-unique не конфликтуют). См. §5.

### 12.3. Кэш докер-слоя (стоило ~3 часов)

Деплои `vela-api` шли «зелёными» за ~1 м 25 с, но образ собирался из закэшированного слоя
`COPY src` со старым кодом: chats и news работали, weather и currency отдавали 404. Лечение:
`ENV BUILD_REV=…` перед `COPY src` в Dockerfile — бампнуть значение = принудительная инвалидация.
Альтернатива в панели: Manual Deploy → «Clear build cache & deploy».

⚠️ **Диагностика:** в списке деплоев Render смотри **именно `vela-api`** — у `vela-web` деплои
могут быть зелёными, пока API падает. Симптом «код запушен, на сайте нет фичи» = красный деплой api.

### 12.4. Битый ассет вместо настройки (глобус)

`public/globe/clouds.jpg` оказался **пустым файлом: 1600×800 сплошного белого**, ни одного пикселя
темнее 255. Аддитивный слой из него намазывал ровную белую пелену на весь диск — это и читалось как
«туманность». Файл удалён; облака теперь считаются процедурно (`makeCloudAlphaMap` в `Hero3D.tsx`).

Мораль: **если картинка выглядит «не так», сначала проверь сам ассет попиксельно**, а не крути
настройки материала.

Заодно в глобусе: облака работают маской прозрачности на белом **освещённом** слое (настоящие
облака ничего не излучают и гаснут на терминаторе); маска воды строится в шейдере по разнице
каналов Blue Marble, и внутри неё шероховатость падает до 0.11 — отсюда блик солнца по океану;
атмосфера — френель-ободок, гаснущий на ночной стороне; тумана, гало, лучей и пыли нет — в вакууме
рассеивать нечего.

### 12.5. Dev-сервер и `next build` в одной папке

**`next build` во `frontend/`, пока там же работает `next dev`, ломает dev-сервер** — страница
отдаёт пустой белый экран с нетронутым 300×150 canvas. Останавливай dev до сборки.

### 12.6. Service worker кэширует чанки на localhost:3000

После переключения docker-web → next dev страница падает с
`Cannot read properties of undefined (reading 'call')`. Лечение — в консоли снять регистрации SW и
почистить `caches`, затем reload. Прода не касается.

### 12.7. Прочее

- **dev StrictMode дублирует imperative-DOM эффекты** (`ScrollRail`) — cleanup обязан удалять
  созданные узлы.
- **`pointsMaterial` без карты рисует КВАДРАТЫ** — самый заметный признак дешёвой графики.
  Всем частицам давать `makeGlowTexture()` из `fx/particles.ts`.
- **`overflow: hidden` для mask-reveal при `line-height < 1`** (наш `.display-1` = 0.98) **срезает
  выносные элементы кириллицы** — «у», «р», «д», «ц», «щ». В маске строки стоит
  `padding-bottom: 0.2em` + компенсирующий отрицательный margin.
- **`.spotlight::before` должен быть `z-index: -1`.** При `z-index: 0` позиционированный `::before`
  рисуется поверх контента и приглушает текст.
- **Tone mapping (ACES) живёт на рендерере, а не в композере** — иначе на low-тире (композера нет)
  картинка отличается от mid/high.
- **Замеры FPS в неактивной панели браузера врут.** Там душится всё: и `requestAnimationFrame`, и
  `setTimeout` (проверено: 2 срабатывания в секунду при `hasFocus: false`). Мерить только на
  активной вкладке; при настоящем падении FPS таймеры идут нормально.
- **Preview-MCP:** скриншоты иногда чёрные или сжатые после resize — проверяй DOM/JS-замерами;
  скролл может сбрасываться МЕЖДУ вызовами `javascript_exec` (внутри одного вызова стабилен).
- **Логиниться ассистент не может** — админку и соцстраницы проверяет владелец.

---

## 13. Текущий статус

✅ **Прод живой и актуален.** HEAD `f48430e`, рабочая копия чистая.

Проверено в последней сессии:
- Все **40 маршрутов** отдают 200 и рендерятся на клиенте без ошибок и без error-оверлея;
  приватные корректно показывают гейт.
- `tsc --noEmit` чисто (фронт и бэк), `next build` чисто (33 страницы), `nest build` +
  `build:seed` чисто.
- На проде: ключевые маршруты 200, `api/health` → `{"status":"ok","db":"up"}`.
- Главная, глобус и игровой мир — 60 FPS на активной вкладке, ошибок в консоли нет.

⚠️ **Не проверено:** страницы под логином (админка, лента, мессенджер, профиль) — только факт
загрузки и гейт; содержимое за авторизацией смотрит владелец. Игровой мир на реальном телефоне
(там тир `low`: без теней и пост-обработки, тач-джойстик по первому касанию). Секретные места игры
(грот, «Балкон Ветров») и озеро в кальдере — проверены численно по полю высот, но не глазами.

⚠️ **Render free спит 15 минут** → холодный старт ~30 с (нужен keep-alive или платный план).
⚠️ `GROQ_API_KEY`, `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER` — вписать в Render.
⚠️ Git identity владельца не настроен глобально (берётся из системы, коммиты идут корректно).

---

## 14. Открытые задачи (по приоритету)

1. **Ключи в Render:** `GROQ_API_KEY`, `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER` — у владельца.
2. **Прод-хардненинг:**
   - **`prisma migrate`** (baseline от текущей схемы + `migrate deploy` в CMD) — снимет костыль
     `--accept-data-loss` и риск потери данных;
   - httpOnly-cookie для JWT (сейчас localStorage + cookie);
   - rate-limit на `auth` / `assistant` / `chats` (сейчас нет);
   - keep-alive для free-плана.
3. **Кружки (`VIDEO_NOTE`) в мессенджере** — модель, бэкенд и uploads готовы; нужен UI записи
   (тот же `VoiceRecorder`, но `getUserMedia({video:true})` + круглый превью-плеер).
4. **Совместное планирование в чате** — привязать поездку к групповому чату: голосование по дням,
   общий чек-лист, сплит расходов (модель `Expense` уже есть).
5. **Telegram-бот** — уведомления о заявках админу + ответы консьержа. **Заблокировано:** нужен
   `TELEGRAM_BOT_TOKEN` от владельца (@BotFather).
6. **Тёмный иммерсив внутренних страниц** — главная тёмная, внутренние крем-светлые.
7. **Соцслой:** уведомления сообщества и поддержки, пагинация лент, поиск по маршрутам и
   сообществу, «лучший ответ» в сообществе.
8. **Замена Hotellook** (API закрыт) — если появится рабочий отельный API (Ostrovok B2B и т. п.),
   вернуть живые цены; модель `Hotel` готова.
9. **Higgsfield:** задел в `lib/hero-media.ts` — когда владелец даст API, генеративные фоны
   подставятся конфигом.
10. **По игре:** LOD для дальнего леса (сейчас одна геометрия на вид), звук (нет вообще),
    сохранение позиции героя между заходами.
11. **Мелочи:** дубли страны «Россия» в прод-БД (4 записи); мобильный наклон глобуса возможен
    только диагональю (вертикальный свайп отдан скроллу — осознанно); `eslint` не установлен,
    `next build` ругается предупреждением.

---

## 15. Рекомендации по дальнейшей разработке

**Порядок работы, который себя оправдал:**

1. Начинай с этого файла и `git log --oneline -15`.
2. Крупную задачу веди так: схема БД → `db push` → бэкенд-модуль → typecheck → клиент → UI.
3. `npx tsc --noEmit` после каждого блока; прод-сборки — перед пушем.
4. **Проверяй вживую** (curl эндпоинтов + preview-MCP для UI), а не «по коду».
5. **Численно проверяй то, что генерируется.** Рельеф острова, профили троп и расположение
   регионов отлаживались скриптами на Node с прямым импортом `.ts` (`node probe.ts` — Node 26
   стирает типы сам). Это на порядок быстрее, чем крутить сцену глазами.
6. Коммит на каждый законченный блок; в теле — что и **почему**.

**Что я делал бы следующим:** сначала `prisma migrate` — это единственный долг, который с ростом
схемы дорожает нелинейно и уже дважды ронял прод. Затем кружки в мессенджере (дёшево,
инфраструктура готова, заметно пользователю) и совместное планирование в чате — именно оно
превращает Vela из каталога в инструмент группы.

**Чего не делать:**
- не обновлять `three`/`fiber`/`drei`/`postprocessing` (§2);
- не добавлять библиотеки плавного скролла (§7);
- не тащить внешние 3D-модели и HDRI (§8);
- не коммитить `backend/dist-seed/`, `backend/package-lock.json`,
  `frontend/tsconfig.tsbuildinfo`, `.env` — они уже в `.gitignore`.

---

## 16. Файлы, изменённые в последней сессии

Диапазон `5bccb97..f48430e` — 38 файлов, +8037 / −234.
Полный список: `git diff --name-status 5bccb97..HEAD`.

**Новые — моушн-слой и эффекты:**

```
frontend/src/lib/motion.ts                    общий rAF-тикер, damp, detectTier, useViewportProgress
frontend/src/components/ui/Tilt.tsx           useTilt: 3D-наклон, блик, «дыхание»
frontend/src/components/fx/Ambience.tsx       фоновый canvas: свет, пылинки, дымка
frontend/src/components/fx/CinematicPost.tsx  единый пост-пресет по тирам
frontend/src/components/fx/particles.ts       makeGlowTexture для всех pointsMaterial
```

**Новые — игровой мир (`frontend/src/`):**

```
app/vela/page.tsx
components/game/VelaIsland.tsx        components/game/state.ts
components/game/regions.ts            components/game/hud/Hud.tsx
components/game/player/controller.ts  components/game/player/Traveler.tsx
components/game/camera/FollowCamera.tsx
components/game/world/terrain.ts      components/game/world/TerrainMesh.tsx
components/game/world/Water.tsx       components/game/world/Sky.tsx
components/game/world/Scatter.tsx     components/game/world/Landmarks.tsx
components/game/world/Wildlife.tsx    components/game/world/colliders.ts
```

**Изменённые:**

```
.gitignore                                  артефакты сборки (правило было только в документации)
frontend/package.json, package-lock.json    + postprocessing 6.35.6, @react-three/postprocessing 2.16.3
frontend/src/app/globals.css                tilt/spotlight/glass-nav/тени глубины
frontend/src/app/layout.tsx                 + <Ambience />
frontend/src/components/ui/Motion.tsx       SplitText, MaskReveal, Parallax, ScrollDepth, VelocitySkew
frontend/src/components/ui/Card.tsx         наклон и блик вшиты в компонент
frontend/src/components/ui/Button.tsx       магнит по умолчанию, глубина, отклик на нажатие
frontend/src/components/ui/Hero3D.tsx       физическая модель глобуса (§12.4)
frontend/src/components/fx/Atmosphere.tsx   магнит переписан с CSS-transition на пружину
frontend/src/components/ui/FloatingNav.tsx  стекло, сжатие по скроллу, подсветка, логотип → /vela
frontend/src/components/ui/SiteHeader.tsx   логотип → /vela, «Главная» в мобильном меню
frontend/src/components/ui/BottomNav.tsx    «Главная» и «Vela Island» в бургере
frontend/src/components/assistant/AssistantWidget.tsx  скрыт на /vela
frontend/src/components/support/SupportWidget.tsx      скрыт на /vela
docs/PROJECT_HANDOFF.md                     этот документ
```

**Удалённые:**

```
frontend/public/globe/clouds.jpg              пустой белый файл — источник «туманности» (§12.4)
frontend/src/components/fx/Volumetric.tsx     остался без потребителей → сжат до fx/particles.ts
```

**Отдельно:** кастомный курсор был сделан и затем **полностью удалён по просьбе владельца** —
курсор системный, `data-cursor`-атрибуты в старых файлах инертны. Не возвращать без явной просьбы.

— Конец хендоффа —
