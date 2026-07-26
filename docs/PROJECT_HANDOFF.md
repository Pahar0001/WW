# Vela — PROJECT HANDOFF

> Документ для продолжения работы в новом чате Claude Code **без доступа к истории переписки**.
> Прочитай целиком, затем работай с раздела **«§14 Открытые задачи»**.
> Последнее обновление: **2026-07-26, 15:00 МСК**. Ветка `main`, HEAD = `8c7a575` (всё запушено).

---

## 0. Где работать (начни отсюда)

```
Рабочая папка:          /Users/marat/Desktop/Repository
GitHub (origin/main):   https://github.com/Pahar0001/WW
Прод (сайт, домен):     https://velatrips.ru        (= vela-web на Render)
Прод (фронтенд Render): https://vela-web-zr2u.onrender.com
Прод (API):             https://vela-api-8rta.onrender.com
API health:             https://vela-api-8rta.onrender.com/api/health
```

**Деплой:** `git push origin main` → Render авто-деплоит по Blueprint (`render.yaml`): db + api + web.
**Пуш = прод-деплой.** Перед пушем всегда прогоняй прод-сборки (`next build` фронт, `nest build` +
`build:seed` бэк). Коммиты заканчивай `Co-Authored-By`-строкой текущей модели.
**Секреты не коммитить.** `.env` в `.gitignore`. На проде — Render Dashboard → Environment.
**Владелец просил коммитить и пушить после каждого блока работ** (в текущей сессии — явно;
при сомнении уточняй).

⚠️ **Диагностика деплоя (важно, стоило 3 часов):** в списке деплоев Render смотри **именно
`vela-api`** — у `vela-web` деплои могут быть зелёными, пока API падает. Симптом «код запушен,
на сайте нет фичи» = красный деплой api. Подробности и лечение — §13.

---

## 1. Что это за проект

**Vela** — премиальная платформа планирования путешествий (RU-интерфейс) с социальным слоем.
Готовые маршруты с планом по дням, конструктор, карты, **реальные цены авиабилетов (Aviasales)**,
расчёт трат, **погода (Open-Meteo)**, **курсы валют (ЦБ РФ)**, отели, заявки «под ключ» с ИИ-брифом,
соцсеть, **мессенджер с голосовыми**, сообщество по странам (визы/въезд/посольства), оценки
маршрутов, ИИ-консьерж (Groq) с историей диалогов, чат поддержки, авторизация + RBAC + админка
с живыми метриками и аналитикой посещений, PWA с офлайном, PDF-экспорт маршрута,
**воскресный email-дайджест**.

**Real Data Policy (священна):** не выдумывать цены/расстояния/время. Реальные данные →
`VERIFIED` + source/sourceUrl; расчёты → `ESTIMATED`; неизвестное → `PENDING`. Погода, курсы валют,
цены билетов — реальные источники с указанием происхождения прямо в UI.

**Монетизация (решение владельца):** партнёрка Travelpayouts (marker в ссылках Aviasales) +
платная услуга «маршрут под ключ» (админ назначает priceRub в заявке). Подписка — отложена.

**Дизайн:** кинематографический тёмный иммерсив. Главная (desktop) открывается **видео-полётом,
управляемым скроллом** (Кхао Сок, Таиланд), с «главами»-повествованием и золотой «нитью маршрута».
На мобильных hero статичный (фото-постер) — см. §3. Палитра: крем `ink` / уголь `paper` /
антикварное золото `aurora`; Inter + Fraunces. Тёмная/светлая темы.

---

## 2. Стек технологий

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 14.2 (App Router, TS), Tailwind (HSL-токены), Framer Motion, Three.js + @react-three/fiber@8 + drei@9 (глобус), Leaflet + CARTO (карты) |
| Backend | NestJS 10, Prisma 5.22, REST, zod |
| БД | PostgreSQL 16 |
| Auth | JWT (`jsonwebtoken`) + bcryptjs, guards/decorators, без passport |
| Файлы | В БД (модель `Upload`, `GET /api/uploads/:id`); опц. S3. Принимает изображения, PDF, **audio/video** (голосовые) |
| Email | Resend (`EmailService`), без ключа — письмо в лог |
| ИИ | Groq (OpenAI-совместимый), `llama-3.3-70b-versatile`: консьерж + бриф заявок |
| Цены | Travelpayouts: Aviasales Data API `prices_for_dates`. ⚠️ Hotellook ЗАКРЫТ — только дип-линки |
| Погода | Open-Meteo (без ключа, CC-BY) |
| Курсы валют | ЦБ РФ `XML_daily.asp` (windows-1251) |
| Новости | Открытые RSS: Лента.ру «Путешествия», Perito, 34travel |
| OG-картинки | `next/og` (satori) + Inter из `public/fonts` |
| Деплой | Render Blueprint; Docker; домен velatrips.ru |

**Жёсткие ограничения (не ломать):**
- ⚠️ `@react-three/fiber@9` несовместим с React 18 — держать `three@0.160 + fiber@8.17 + drei@9.114`.
- ⚠️ Хиро-видео кодировать с частыми keyframes: `-g 10..12 -sc_threshold 0` (плавный скраб назад).
- ⚠️ Встроенный в `next/og` шрифт **без кириллицы** — OG-картинки грузят Inter из `public/fonts`
  через `fs.readFile` (не `new URL(import.meta.url)` — в standalone-сборке ломается).

---

## 3. Архитектура

**Runtime-прокси:** браузер зовёт свой origin (`/api/*`, `/uploads/*`), Next-сервер форвардит на
`BACKEND_URL` (файлы: `frontend/src/app/api/[...path]/route.ts`, `uploads/[...path]/route.ts`,
`lib/proxy.ts`). SSR приватных поездок читает cookie `vela_token`.

```
Браузер → Next.js (web) —proxy→ NestJS (api) → PostgreSQL (+Upload bytes)
                                   ├→ Resend (email, дайджест)
                                   ├→ Groq (консьерж, ИИ-бриф заявок)
                                   ├→ Travelpayouts/Aviasales (цены билетов)
                                   ├→ Open-Meteo (погода)
                                   ├→ ЦБ РФ (курсы валют)
                                   └→ RSS-ленты (travel-новости)
```

**Кино-hero (`frontend/src/components/hero/`):** секция 420vh + sticky 100svh; скролл = таймлайн
видео. Модули: `ScrollController` (rAF+lerp+IO/RO), `VideoScrubber` (сик-очередь + вотчдог),
`MotionController` (чистые функции таймингов), `ColorGrading` (SVG-фильтр), `PaperNoise`,
`HalftoneOverlay` (ВЫКЛЮЧЕН, компонент в базе), `HeroVideo` (дирижёр; прямые записи в style из rAF).
Видео: `public/hero/thailand.mp4` (47с, 1080p, 16МБ) + постер. Конфиг: `lib/hero-media.ts`.
**На мобильных (`<768px`) и при `prefers-reduced-motion` — статичный режим `isStatic`:** одна секция
100svh с фото-постером, без скраба и глав (скраб 16-МБ видео тормозил и конфликтовал с тач-скроллом).

**Глобус (`components/ui/Hero3D.tsx`):** реалистичная Земля — текстура NASA Blue Marble
(`public/globe/earth.jpg`, 435 КБ) на непрозрачной сфере + слой облаков (`clouds.jpg`, аддитивный,
собственный дрейф) + границы стран из `src/data/globe-geo.json` (Natural Earth 110m, предвычислено
Python-скриптом) + ободок атмосферы. Магнитное наведение (снап к ближайшей видимой стране в 56px;
видимость по расстоянию до камеры — НЕ по нормали, это был баг). Драг **двухосевой**: горизонталь —
долгота, вертикаль — наклон ±72°. Подпись страны — **HTML-чип внизу обёртки** (в 3D через `Html`
она обрезалась краем секции). Используется в `GlobeSection` (главная) и `VisitedMap` (профиль).

**Планировщик дайджеста** — внутрипроцессный (`DigestService`, `OnModuleInit` + `setInterval`
10 мин), с «догоном» через метку в `SystemState`. Внешнего крона нет; на free-плане Render сервис
спит, поэтому догон обязателен.

---

## 4. Структура БД (Prisma)

Каноничная схема: `backend/prisma/schema.prisma`; копия `database/prisma/schema.prisma`
(**синхронизировать `cp` после каждой правки!**).

**Базовые модели:** `Country → Region → City → Place` (+provenance), `SeasonInsight`;
`Trip → RouteVariant(CALM/BALANCED/ACTIVE) → Day → DayPlace/TransportLeg`;
`BudgetBreakdown→BudgetLine`; `TripScore`; `TripOpinion`; `Hotel`; `Ticket`, `TripDocument`,
`CalendarEvent→Reminder`, `ChatMessage` (внутри поездки), `Expense`; `Album→Photo`, `Memory`;
`SupportMessage`; `CommunityMessage`; `Post`,`Like`,`Comment`,`Repost`,`Friendship`,`Notification`;
`User`, `TripMember`, `AuditLog`, `SavedTrip`; `TripRating`; `Upload`; `TripOrder`.

**Добавлено в этой сессии:**

| Модель | Назначение | Ключевые поля |
|--------|-----------|---------------|
| `AssistantThread` | диалог с ИИ-консьержем | `userId`, `title` (первый вопрос), `updatedAt` |
| `AssistantMessage` | реплика в диалоге | `threadId`, `role` ('user'/'assistant'), `content` |
| `TripView` | просмотр маршрута (аналитика) | `tripId`, `userId?`, `visitorId?` (аноним), `referrer?` (только хост) |
| `Conversation` | чат мессенджера | `isGroup`, `title?`, `image?`, `createdBy?` |
| `ConversationMember` | участник чата | `conversationId`, `userId`, `role` (OWNER/MEMBER), `lastReadAt` |
| `ConversationMessage` | сообщение | `kind` (TEXT/VOICE/VIDEO_NOTE), `text?`, `uploadId?` |
| `VisitedCountry` | «где я был» | `userId`, `code` (ISO-2), unique(userId, code) |
| `SystemState` | служебные пары ключ-значение | `key`, `value` (сейчас: `digest.lastSentSlot`) |

**Изменения существующих моделей:**
- `User.lastSeenAt DateTime?` — активность (touch в JwtAuthGuard раз в 5 мин); «онлайн» < 5 минут.
- `User.digestOptOut Boolean @default(false)` — отказ от воскресного дайджеста.
- `Trip.inviteToken String? @unique` — токен приглашения в поездку (`/join/<token>`).
- `Trip.views TripView[]`, `User.conversations/chatMessagesSent/visitedCountries` — обратные связи.
- `enum ConversationMessageKind { TEXT VOICE VIDEO_NOTE }`.

**Seed:** флагман «China — Floating Mountains» (3 варианта), приватный Питер, **28 интро-маршрутов
по странам с планом по дням**: 210 дней, 189 мест с фото/координатами/описаниями из ru.wikipedia
(VERIFIED + sourceUrl; данные в `seed-countries.ts`, массив `plan`). Идемпотентно: дни строятся
только если у поездки нет RouteVariant. Первый сид на пустой БД ~2-3 мин (Википедия).

⚠️ В прод-базе **страна «Россия» дублируется 4 раза** (разные слаги) — учтено дедупом в
`news.service.ts`; при работе с географией помни об этом.

---

## 5. Миграции

**Формальных миграций НЕТ** — `prisma db push` на старте контейнера (Dockerfile CMD).

**Применено `db push`'ем за все сессии:** `TripRating`, `Upload`, `TripOrder` (+`priceRub`),
`User.lastSeenAt`, `AssistantThread`, `AssistantMessage`, `TripView`, `Conversation`,
`ConversationMember`, `ConversationMessage`, `VisitedCountry`, `SystemState`,
`Trip.inviteToken`, `User.digestOptOut`.

Локально применить схему:
```bash
cd backend
DATABASE_URL='postgresql://vela:change_me_in_production@localhost:5432/vela?schema=public' \
  npx prisma db push --skip-generate --accept-data-loss && npx prisma generate
```

⚠️ **`--accept-data-loss` обязателен** (см. §13): `db push` останавливается на ЛЮБОМ предупреждении,
включая безопасное «добавляется unique-индекс на новой пустой колонке», и падает с exit 1.
Флаг прописан в `CMD` Dockerfile и в `command` docker-compose.

➡️ **Переход на `prisma migrate` (baseline + deploy) — приоритетная задача**, см. §14.

---

## 6. RBAC

Роли `SUPER_ADMIN > ADMIN > ORGANIZER > MEMBER`. `JwtAuthGuard` (Bearer; BLOCKED режется;
touch lastSeenAt), `RolesGuard` (SUPER_ADMIN проходит всё), `@Public`, `@CurrentUser`, `@Roles`.
Токен: localStorage `vela_token` + cookie (SSR). Публично: маршруты (PUBLIC), сообщество,
travel/plan, health, **news/travel, currency/rates, weather/trip/:slug, digest/unsubscribe,
trips/invite/:token**. Первый супер-админ из `SUPERADMIN_EMAIL/PASSWORD`.

---

## 7. Backend: модули и эндпоинты

`backend/src/modules/`: auth, admin, planning, trips, social, network, community, assistant,
support, uploads, email, audit, prisma, health, analytics, integrations, recommendations, routes,
travel, orders, **chats, news, weather, currency, digest**.

### Существовавшие ранее (ключевое)

| Метод | Маршрут | Что |
|------|---------|-----|
| GET | `/api/travel/status`, `/api/travel/plan/:slug?origin&depart&return` | реальные цены билетов (кэш 10 мин, партнёрский marker) + отельные дип-линки |
| POST | `/api/orders/refine` | Groq: пожелание → структурированный бриф |
| POST/GET | `/api/orders`, `/orders/mine` | создать заявку / мои |
| GET/PATCH | `/api/orders`, `/orders/:id` (ADMIN) | все заявки / статус+adminNote+priceRub |
| GET | `/api/admin/stats` | дашборд: users/trips/orders/social/uploads/series/system |
| POST | `/api/trips/:slug/rate` | оценка 1-5 |
| GET | `/api/trips/:slug/estimate` | траты: эконом-база × индекс комфорта + реальный перелёт |
| GET | `/api/uploads/:id` | файл из БД |

### Добавлено в этой сессии

**Ассистент (история диалогов):**
| Метод | Маршрут |
|------|---------|
| GET/POST | `/api/assistant/threads` — список / создать |
| GET/PATCH/DELETE | `/api/assistant/threads/:id` — читать / переименовать / удалить |
| POST | `/api/assistant/threads/:id/messages` — отправить (сохраняет обе реплики, титул = первый вопрос) |

**Мессенджер (`/api/chats`, всё под JwtAuthGuard):**
| Метод | Маршрут | Что |
|------|---------|-----|
| GET | `/` | мои чаты + последнее сообщение + непрочитанные |
| GET | `/unread-count` | суммарный бейдж |
| POST | `/direct` | найти-или-создать личный чат `{userId}` |
| POST | `/group` | создать группу `{title, memberIds}` |
| GET | `/:id`, `/:id/messages?before=&after=` | шапка / история (курсор) и поллинг новых |
| POST | `/:id/messages` | отправить `{text}` или `{kind:'VOICE'\|'VIDEO_NOTE', uploadId}` |
| PATCH | `/:id/read`, `/:id` | отметить прочитанным / переименовать группу (OWNER) |
| POST/DELETE | `/:id/members`, `/:id/members/me` | добавить участника (OWNER) / выйти |

**Остальное:**
| Метод | Маршрут | Что |
|------|---------|-----|
| GET | `/api/news/travel` | travel-новости из RSS (кэш 15 мин) + подсветка стран каталога |
| GET | `/api/weather/trip/:slug` | Open-Meteo по базовым городам (до 6, кэш 30 мин, приватные → 404) |
| GET | `/api/currency/rates` | курсы ЦБ РФ (53 валюты, кэш 6 ч), RUB за 1 единицу |
| GET | `/api/admin/analytics?days=7\|30\|90` | просмотры: сводка, ряд 30 дней, топ маршрутов/стран, источники |
| POST | `/api/trips/:slug/view` | маячок просмотра (публичный, дедуп 30 мин по visitorId) |
| POST | `/api/trips/:slug/invite` | создать/получить токен приглашения (участник или админ) |
| GET/POST | `/api/trips/invite/:token`, `/api/trips/invite/:token/accept` | карточка приглашения / присоединиться |
| GET/PUT | `/api/profile/visited`, `/api/users/:id/visited` | «где я был» (свои / чужие) |
| GET | `/api/digest/unsubscribe?u&t` | отписка по HMAC-ссылке из письма (публично, HTML-ответ) |
| GET/POST | `/api/digest/settings` | тумблер дайджеста в профиле |
| POST | `/api/digest/test` (ADMIN) | прислать выпуск только себе (проверка вёрстки) |

---

## 8. Frontend: страницы и компоненты

**Страницы (App Router):** `/` `/admin` `/admin/analytics` `/admin/orders` `/admin/support`
`/admin/users` `/assistant` `/community` `/community/[country]` `/data` `/feed` `/forgot-password`
`/join/[token]` `/login` `/messages` `/network` `/news` `/notifications` `/offline` `/order`
`/profile` `/register` `/reset-password` `/terms` `/trips/[slug]` `/trips/[slug]/edit`
`/trips/[slug]/plan` `/trips/[slug]/print` `/trips/new` `/u/[id]` `/verify-email` `/welcome`.

**Ключевые компоненты:**
- `hero/*` — кино-hero (§3), `isStatic` на мобильных.
- `ui/Hero3D.tsx` — реалистичный глобус (§3); `ui/GlobeSection.tsx` — «Планета Vela».
- `ui/ScrollRail.tsx` — «нить путешествия» на главной (desktop): золотая линия слева заполняется
  скроллом, узлы у секций с `data-rail`, секции въезжают снизу. Всё пишется в style напрямую
  (ноль setState на скролле); cleanup удаляет созданные DOM-узлы (в dev StrictMode иначе дубли).
- `ui/BottomNav.tsx` — **мобильная бургер-шторка** (заменила нижний бар с 6 иконками): плавающая
  кнопка справа внизу с общим бейджем, шторка с разделами + «Помощь» (консьерж/поддержка через
  события `vela:open-assistant` / `vela:open-support`; их плавающие лончеры на мобильных скрыты).
- `ui/FloatingNav.tsx` — нижняя «пилюля» (desktop) с пунктом **«Сообщения» + бейдж**; скрыта в
  кино-hero и на страницах со своей навигацией (`HIDDEN_PREFIXES`).
- `assistant/AssistantWidget.tsx` + `assistant/parts.tsx` (общие Spark/renderRich/Typewriter/
  suggestionsFor) — виджет stateless, ссылка «История» ведёт на `/assistant`.
- `app/messages/page.tsx` (725 строк) — мессенджер: 2 панели ⇄ мобильный стек, поллинг активного
  чата 4с (`?after=`), списка 12с, группы, участники, `VoiceRecorder`.
- `chat/VoiceRecorder.tsx` — запись голосовых (MediaRecorder, таймер, отмена, лимит 2 мин →
  `/api/uploads` → `uploadId`).
- `trip/TripWeather.tsx`, `trip/CurrencyCard.tsx` — погода и курс валюты страны.
- `trip/PrintControls.tsx` + `app/trips/[slug]/print` — печатный документ (PDF системной печатью).
- `trip/TripViewBeacon.tsx` — маячок аналитики; `trip/SaveOfflineButton.tsx` — офлайн-кэш поездки;
  `trip/InviteTripLink.tsx` — ссылка-приглашение.
- `profile/VisitedMap.tsx` — «где я был» (мини-глобус + выбор стран); `profile/DigestToggle.tsx`.
- `pwa/PwaProvider.tsx` — регистрация SW (только prod), предложение установки, индикатор офлайна.
- `admin/AdminDashboard.tsx` — метрики с трендами, area-графики (`AreaChart` экспортирован и
  переиспользуется в `/admin/analytics`).
- `lib/`: `api.ts`, `chat.ts`, `assistant.ts`, `news.ts`, `og.tsx`, `world-countries.ts` (~90 стран),
  `country-currency.ts` (ключи — слаги каталога, у них формат ISO-2!), `country-coords.ts`,
  `plural.ts`, `embassies.ts`, и др.
- `src/data/globe-geo.json` — границы стран для глобуса (137 КБ).

**CSS-утилиты (globals.css):** `.pop-menu` (дропдаун из угла), `.pop-down` (раскрытие вниз),
печатные стили `body[data-print]` + `@page` (документ маршрута), `.print-page-break`,
`.print-avoid-break`.

---

## 9. Реализованные функции (полный список)

**Ядро (ранее):** auth + RBAC + верификация email, планирование маршрутов, приватные поездки,
расходы, соцсеть (лента/новости/друзья/уведомления), сообщество + гиды + въезд + посольства,
оценки, загрузки в БД, профиль, поддержка, админка, кино-hero, магнитный глобус, реальные цены
билетов + расчёт трат, заявки «под ключ» с ИИ-брифом, дни маршрутов из Википедии, ИИ-консьерж.

**Добавлено в этой сессии (в порядке коммитов):**

1. **Онбординг → `/welcome`** — отдельная страница знакомства (4 шага, клавиши ←/→/Esc, занавес →
   главная). Только для новых: единственный вход — из `verify-email` после первого подтверждения
   почты; пройденное помечается `vela_welcomed` в localStorage. Overlay-тур удалён.
2. **`/assistant`** — раздел ИИ-консьержа с историей диалогов в БД: список слева (переименование,
   удаление), лента справа, титул = первый вопрос, оптимистичная отправка.
3. **PDF-экспорт** `/trips/[slug]/print` — обложка, факты, план по дням (места, как добраться,
   советы, переезды), отели, бюджет, чек-листы (документы/сборы), заметки, подвал с источниками.
   PDF — системной печатью (вектор, живые ссылки, офлайн). `data-print` на body убирает обвязку.
4. **SEO** — `generateMetadata` маршрутов (canonical/OG/twitter, PRIVATE → noindex), динамические
   OG-картинки маршрута и главной (`next/og` + Inter), `sitemap.ts`, `robots.ts`, metadata
   клиентских разделов через `layout.tsx`, расширенные корневые метаданные и `viewport`.
5. **Аналитика посещений** — `TripView` + маячок + `/admin/analytics`: сводка, ряд за 30 дней,
   топ маршрутов и стран, источники переходов. Дедуп 30 мин, анонимный visitorId, из реферера
   только хост.
6. **PWA** — manifest, иконки (сгенерированы своим Python-растеризатором), service worker
   (навигации network-first с откатом в кэш, статика cache-first, API/uploads не кэшируются),
   кнопка «Офлайн» на маршруте (страница + печатная версия + до 40 фото), `/offline` через редирект.
7. **Мобильный UX** — статичный hero с фото вместо скраба видео; бургер-шторка вместо нижнего бара.
8. **Анимации** — `.pop-menu` / `.pop-down` для дропдаунов, меню профиля, мобильного листа, панели
   поддержки; шторка и чипы — framer-motion.
9. **Мессенджер** — личные и групповые чаты, поллинг, непрочитанные, участники, выход,
   **голосовые сообщения** (MediaRecorder → Upload → `kind=VOICE` + аудиоплеер в ленте).
   Кружки (`VIDEO_NOTE`) — модель и бэкенд готовы, UI не сделан.
10. **Travel-новости** — агрегатор открытых RSS (кэш 15 мин, ручной XML-парс без зависимостей),
    подсветка стран каталога по стемам, вкладка «Мир туризма» в `/news` с чипами стран.
11. **Нить на главной** (`ScrollRail`) — золотая линия слева с узлами по секциям.
12. **Реалистичный глобус** — текстура Земли, облака, границы, двухосевое вращение, чип подписи.
13. **Погода** (Open-Meteo) и **курсы валют** (ЦБ РФ) на странице маршрута.
14. **«Где я был»** — отметки посещённых стран, мини-глобус в профиле, витрина в чужом профиле.
15. **Инвайты в поездку** — `/join/<token>`, кнопка «Пригласить» на приватных маршрутах.
16. **Email-дайджест** — воскресенье 15:00 МСК, «догон» после сна, новые маршруты + топ недели,
    HMAC-отписка, тумблер в профиле, `POST /digest/test` для проверки вёрстки.
17. **«Сообщения» в главной навигации** — пилюля (desktop) + мобильное меню, с бейджем.

---

## 10. Изменённые и новые файлы (эта сессия)

**90 файлов** в диапазоне `cd14445..8c7a575`. Полный список: `git diff --name-status cd14445..HEAD`.

**Новые — бэкенд:**
```
backend/src/modules/chats/{chats.module.ts,chats.service.ts}
backend/src/modules/news/{news.module.ts,news.service.ts}
backend/src/modules/weather/weather.module.ts
backend/src/modules/currency/currency.module.ts
backend/src/modules/digest/{digest.module.ts,digest.service.ts}
```

**Новые — фронтенд (страницы):**
```
app/assistant/{page,layout}.tsx      app/messages/page.tsx
app/welcome/{page,layout}.tsx        app/join/[token]/page.tsx
app/admin/analytics/page.tsx         app/trips/[slug]/print/page.tsx
app/offline/page.tsx                 app/order/layout.tsx  app/community/layout.tsx
app/robots.ts  app/sitemap.ts  app/opengraph-image.tsx  app/trips/[slug]/opengraph-image.tsx
```

**Новые — фронтенд (компоненты и библиотеки):**
```
components/assistant/parts.tsx       components/chat/VoiceRecorder.tsx
components/profile/{VisitedMap,DigestToggle}.tsx
components/pwa/PwaProvider.tsx       components/ui/ScrollRail.tsx
components/trip/{TripWeather,CurrencyCard,InviteTripLink,PrintControls,SaveOfflineButton,TripViewBeacon}.tsx
lib/{chat,news,country-currency,world-countries}.ts   lib/og.tsx   data/globe-geo.json
```

**Новые — публичные ассеты:**
```
public/manifest.webmanifest  public/sw.js
public/icons/{icon-192,icon-512,apple-touch-icon,maskable-512}.png
public/fonts/{Inter-Regular.ttf,Inter-SemiBold.ttf,README.txt}   # OFL, для OG-картинок
public/globe/{earth.jpg,clouds.jpg}                              # NASA Blue Marble, public domain
```

**Существенно изменённые:** `backend/prisma/schema.prisma` (+ копия в `database/`),
`backend/Dockerfile` (BUILD_REV + `--accept-data-loss`), `docker-compose.yml`, `app.module.ts`,
`modules/{admin,assistant,network,trips,uploads}/*`, `frontend/src/app/{layout,page,globals.css}`,
`app/trips/[slug]/page.tsx`, `app/{profile,news,verify-email,u/[id]}/page.tsx`, админ-страницы,
`components/{hero/HeroVideo,ui/Hero3D,ui/BottomNav,ui/FloatingNav,ui/SiteHeader,social/SocialTabs,
assistant/AssistantWidget,support/SupportWidget,admin/AdminDashboard,trip/TripCosts}.tsx`,
`lib/{api,assistant}.ts`.

---

## 11. Переменные окружения

Полный список — `.env.example`; прод-декларации — `render.yaml`.

**`vela-api` (Render):**
```
DATABASE_URL, NODE_ENV, JWT_SECRET, JWT_EXPIRES=7d, APP_URL=https://velatrips.ru
SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD
RESEND_API_KEY (задан на проде), EMAIL_FROM      ← нужен для дайджеста и верификации
GROQ_API_KEY   ⚠️ НЕ ЗАДАН → консьерж/бриф отвечают заглушкой
GROQ_MODEL=llama-3.3-70b-versatile
TRAVELPAYOUTS_TOKEN   ⚠️ есть локально в .env, на Render ВПИСАТЬ вручную (sync:false)
TRAVELPAYOUTS_MARKER  ⚠️ партнёрский marker — владелец ещё не дал значение
NEWS_FEEDS (опц.)     формат: "Название|https://url, Название2|https://url2"
S3_* (опц.)
```
**`vela-web`:** `BACKEND_URL`. Опц.: `NEXT_PUBLIC_HERO_MEDIA_URL` ('none' → глобус-hero),
`NEXT_PUBLIC_HERO_MEDIA_POSTER`.

**Ключи без значения деградируют мягко:** нет GROQ → заглушка ассистента; нет RESEND → письмо в
лог; нет TRAVELPAYOUTS → блок цен показывает «не настроено». Погода, курсы, новости, глобус,
мессенджер, PWA работают **без единого ключа**.

---

## 12. Как запускать / проверять

**Docker:** `repository-db-1` (5432), `-backend-1` (4000), `-web-1` (3000).

Для UI-итераций:
```bash
docker compose stop web          # освободить 3000
# затем preview-MCP «web» (.claude/launch.json) = Next dev на 3000 с BACKEND_URL=localhost:4000
```
После правок бэка/схемы: `docker compose up -d --build backend` (старт делает db push + seed).
Вернуть прод-режим: `docker compose up -d --build web`.

**Перед пушем:**
```bash
cd frontend && npx tsc --noEmit && BACKEND_URL=http://localhost:4000 npx next build
cd ../backend && npx tsc --noEmit && npm run build && npm run build:seed
```
⚠️ Прод-сборка фронта в той же папке ломает работающий dev — останавливай dev до `next build`.

**Грабли проверки (проверено болью):**
- **Service worker кэширует чанки на localhost:3000.** После переключения docker-web → next dev
  страница падает с `Cannot read properties of undefined (reading 'call')`. Лечение — в консоли:
  снять регистрации SW и почистить `caches`, затем reload. Прода не касается.
- **dev StrictMode дублирует imperative-DOM эффекты** (ScrollRail) — cleanup обязан удалять
  созданные узлы.
- Preview-MCP: скриншоты иногда чёрные/сжатые после resize — проверяй DOM/JS-замерами;
  скролл может сбрасываться МЕЖДУ вызовами `javascript_exec` (внутри одного вызова стабилен).
- Логиниться/вводить пароли ассистент не может — админку/соцстраницы проверяет владелец.

---

## 13. Текущий статус

✅ **Прод живой и полностью актуален** (HEAD `8c7a575`), все сборки чистые, схема применена.
Проверено вживую на проде: `weather` 200 (Будапешт/Балатонфюред), `currency` 200 (53 валюты),
`digest` поднят, `chats` 401 без токена, глобус и текстуры отдаются.

⚠️ **Render free спит 15 мин** → холодный старт ~30с (keep-alive или платный план).
⚠️ `GROQ_API_KEY`, `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER` — вписать в Render.
⚠️ Git identity владельца не настроен глобально (берётся из системы — коммиты идут корректно).

### История двух проблем деплоя (чтобы не повторять)

**1. Кэш докер-слоя.** Деплои `vela-api` шли «зелёными» за ~1м25с, но образ собирался из
закэшированного слоя `COPY src` со старым кодом: chats/news работали, weather/currency — 404.
Лечение: `ENV BUILD_REV=…` перед `COPY src` в Dockerfile (bump значения = принудительная
инвалидация). Альтернатива в панели: Manual Deploy → «Clear build cache & deploy».

**2. `prisma db push` без флага.** Четыре деплоя подряд падали за 17–42с: на старте контейнера
push останавливался на предупреждении «unique constraint on `Trip.inviteToken` … this will fail»
и выходил с кодом 1. Лечение: `--accept-data-loss` в CMD (колонка новая и пустая, NULL в
Postgres-unique не конфликтуют). **Любая будущая схема с unique/NOT NULL требует этого флага —
или, что правильнее, перехода на `prisma migrate`.**

---

## 14. Открытые задачи (приоритет сверху вниз)

1. **Ключи в Render:** `GROQ_API_KEY`, `TRAVELPAYOUTS_TOKEN`, `TRAVELPAYOUTS_MARKER` (у владельца).
2. **Прод-хардненинг:**
   - **`prisma migrate`** (baseline от текущей схемы + `migrate deploy` в CMD) — снимет костыль
     `--accept-data-loss` и риск потери данных;
   - httpOnly-cookie для JWT (сейчас localStorage + cookie);
   - rate-limit на auth / assistant / chats (сейчас нет);
   - keep-alive для free-плана.
3. **Кружки (VIDEO_NOTE) в мессенджере** — модель, бэкенд и uploads готовы; нужен UI записи видео
   (тот же `VoiceRecorder`, но `getUserMedia({video:true})` + круглый превью-плеер).
4. **Совместное планирование в чате** — привязать поездку к групповому чату: голосование по дням,
   общий чек-лист, сплит расходов (модель `Expense` уже есть).
5. **Telegram-бот** — уведомления о заявках админу + ответы консьержа (Groq). **Заблокировано:**
   нужен `TELEGRAM_BOT_TOKEN` от владельца (@BotFather).
6. **Тёмный иммерсив внутренних страниц** (Design C rollout) — главная тёмная, внутренние крем-светлые.
7. **Соцслой:** уведомления сообщества/поддержки, пагинация лент, поиск по маршрутам/сообществу,
   лучший ответ в сообществе.
8. **Hotellook замена:** если появится рабочий отельный API (Ostrovok B2B и т.п.) — вернуть живые
   цены отелей; модель `Hotel` готова.
9. **Higgsfield:** задел `lib/hero-media.ts` — когда владелец даст API, генеративные фоны подставятся
   конфигом.
10. **Мелочи:** дубли страны «Россия» в прод-БД (4 записи); мобильный наклон глобуса возможен только
    диагональю (вертикальный свайп отдан скроллу — осознанно); `eslint` не установлен, `next build`
    ругается предупреждением.

---

## 15. Рекомендации по дальнейшей разработке

**Порядок работы, который себя оправдал:**
1. Начинай с `docs/PROJECT_HANDOFF.md` (этот файл) и `git log --oneline -15`.
2. Крупную задачу — сначала схема БД → `db push` → бэкенд-модуль → typecheck → клиент → UI.
3. `npx tsc --noEmit` после каждого блока; прод-сборки — перед пушем.
4. Проверяй вживую (curl эндпоинтов + preview-MCP для UI), а не «по коду».
5. Коммит на каждый законченный блок, тело коммита — что и **почему** (особенно неочевидные
   решения: они экономят часы следующему).

**Архитектурные принципы проекта (соблюдать):**
- **Real Data Policy** — не выдумывать цифры; VERIFIED только с source/sourceUrl; в UI всегда видно
  происхождение и дату данных.
- **Мягкая деградация** — нет ключа/API упал → фича молча прячется или показывает честное «нет
  данных», но страница не ломается.
- **Ноль setState в горячих циклах** (скролл, rAF) — писать напрямую в style через refs.
- **Кэш на бэкенде для внешних API** (новости 15 мин, погода 30 мин, курсы 6 ч, билеты 10 мин) —
  free-план не выдержит прямых запросов.
- **Приватность по умолчанию:** аналитика анонимна (visitorId, только хост реферера), приватные
  маршруты не раскрываются даже через погоду, отписка подписана HMAC.
- Дизайн-токены `ink`/`paper`/`aurora`; на фото/видео — явные white/dark + дымка Mist, не токены.
- Схему править в `backend/prisma/schema.prisma` + **`cp` в `database/prisma/`**.
- Не коммитить: `backend/dist-seed/`, `backend/package-lock.json`, `frontend/tsconfig.tsbuildinfo`, `.env`.
- 3D: держать fiber@8. Видео: кодировать с `-g 10..12`.
- Проверяй визуально light+dark, desktop+mobile; после правок hero — все фазы скролла.

**Что бы я делал следующим (мнение):** сначала `prisma migrate` — это единственный долг, который
с ростом схемы дорожает нелинейно и уже дважды ронял прод. Затем кружки в мессенджере (дёшево,
инфраструктура готова, заметно пользователю) и совместное планирование в чате — это то, что
превращает Vela из каталога в инструмент группы.

— Конец хендоффа —
