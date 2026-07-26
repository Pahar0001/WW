# Vela — PROJECT HANDOFF

> Документ для продолжения работы в новом чате Claude Code **без доступа к истории переписки**.
> Прочитай целиком, затем продолжай с раздела **«Открытые задачи»**.
> Последнее обновление: **2026-07-26** (вечер: знакомство `/welcome`, `/assistant`, PDF, SEO,
> аналитика, PWA — §9). Ветка `main`; перед этим коммитом всё запушено
> (HEAD на момент написания = `cac12d9` + текущий коммит с этим документом).

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

**Деплой:** `git push origin main` → Render авто-деплоит по Blueprint (`render.yaml`): db + api + web.
**Пуш = прод-деплой.** Перед пушем всегда прогоняй прод-сборки (`next build` фронт, `nest build` +
`build:seed` бэк). Коммиты заканчивай `Co-Authored-By`-строкой текущей модели.
**Секреты не коммитить.** `.env` в `.gitignore`. На проде — Render Dashboard → Environment.
**Владелец коммитит/пушит сам, если явно не попросил** — но в текущей сессии просил пушить
после каждого блока работ; уточняй при сомнении.

---

## 1. Что это за проект

**Vela** — премиальная платформа планирования путешествий (RU-интерфейс) с социальным слоем.
Готовые маршруты с планом по дням, конструктор, карты, **реальные цены авиабилетов (Aviasales)**,
расчёт трат, отели, заявки «под ключ» с ИИ-брифом, соцсеть, сообщество по странам (визы/въезд/
посольства), оценки маршрутов, ИИ-консьерж (Groq), чат поддержки, авторизация + RBAC + админка
с живыми метриками.

**Real Data Policy (священна):** не выдумывать цены/расстояния/время. Реальные данные →
`VERIFIED` + source/sourceUrl; расчёты → `ESTIMATED`; неизвестное → `PENDING`.

**Монетизация (решение владельца):** партнёрка Travelpayouts (marker в ссылках Aviasales) +
платная услуга «маршрут под ключ» (админ назначает priceRub в заявке). Подписка — отложена.

**Дизайн:** кинематографический тёмный иммерсив. Главная открывается **видео-полётом,
управляемым скроллом** (Кхао Сок, Таиланд), с «главами»-повествованием и золотой «нитью
маршрута». Палитра: крем `ink` / уголь `paper` / антикварное золото `aurora`; Inter + Fraunces.
Тёмная/светлая темы. Auth-страницы — то же видео фоном (единый кино-язык).

---

## 2. Стек технологий

| Слой | Технологии |
|------|-----------|
| Frontend | Next.js 14.2 (App Router, TS), Tailwind (HSL-токены), Framer Motion, Three.js + @react-three/fiber@8 + drei@9 (глобус), Leaflet + CARTO (карты) |
| Backend | NestJS 10, Prisma 5.22, REST, zod |
| БД | PostgreSQL 16 |
| Auth | JWT (`jsonwebtoken`) + bcryptjs, guards/decorators, без passport |
| Файлы | В БД (модель `Upload`, `GET /api/uploads/:id`); опц. S3 |
| Email | Resend (`EmailService`), без ключа — ссылка в лог |
| ИИ | Groq (OpenAI-совместимый), `llama-3.3-70b-versatile`: консьерж + бриф заявок |
| Цены | Travelpayouts: Aviasales Data API `prices_for_dates` (реальные котировки). ⚠️ Hotellook ЗАКРЫТ (весь engine.hotellook.com — 404) — цены отелей недоступны, только дип-линки |
| Деплой | Render Blueprint; Docker; домен velatrips.ru |

⚠️ `@react-three/fiber@9` несовместим с React 18 — держать `three@0.160 + fiber@8.17 + drei@9.114`.
⚠️ Хиро-видео кодировать с частыми keyframes: `-g 10..12 -sc_threshold 0` (плавный скраб назад).

---

## 3. Архитектура

**Runtime-прокси:** браузер зовёт свой origin (`/api/*`, `/uploads/*`), Next-сервер форвардит на
`BACKEND_URL` (файлы: `frontend/src/app/api/[...path]/route.ts`, `uploads/[...path]/route.ts`,
`lib/proxy.ts`). SSR приватных поездок читает cookie `vela_token`.

```
Браузер → Next.js (web) —proxy→ NestJS (api) → PostgreSQL (+Upload bytes)
                                   ├→ Resend (email)
                                   ├→ Groq (консьерж, ИИ-бриф заявок)
                                   └→ Travelpayouts/Aviasales (цены билетов)
```

**Кино-hero (frontend/src/components/hero/):** секция 420vh + sticky 100svh; скролл = таймлайн
видео. Модули: `ScrollController` (rAF+lerp+IO/RO), `VideoScrubber` (сик-очередь + вотчдог +
fastSeek-только-в-буфере), `MotionController` (чистые функции таймингов: титул/главы/нить/выход),
`ColorGrading` (SVG-фильтр), `PaperNoise` (живое зерно), `HalftoneOverlay` (растр — сейчас
ВЫКЛЮЧЕН по решению владельца, компонент в базе), `HeroVideo` (дирижёр; прямые записи в style
из rAF — ноль setState на скролле). Видео: `public/hero/thailand.mp4` (47с, 1080p, 16МБ) +
постер. Конфиг: `lib/hero-media.ts` (env `NEXT_PUBLIC_HERO_MEDIA_URL`, 'none' → фолбэк-глобус).

**Глобус (`components/ui/Hero3D.tsx`):** магнитное наведение (снап к ближайшей видимой стране
в 56px; видимость по расстоянию до камеры — НЕ по нормали, это был баг), драг-вращение
(порог 10px по смещению), пауза rAF вне вьюпорта, onSelect-коллбек. Используется в
`GlobeSection` (секция «Планета Vela» перед коллекцией: 1 маршрут → переход, несколько →
панель списка) и как фолбэк-hero (`HeroImmersive`).

---

## 4. Структура БД (Prisma)

Каноничная схема: `backend/prisma/schema.prisma`; копия `database/prisma/schema.prisma`
(синхронизировать `cp` после правок!).

**Модели:** `AssistantThread → AssistantMessage` (история диалогов консьержа),
`TripView` (просмотры маршрутов — аналитика);
`Country → Region → City → Place` (+provenance), `SeasonInsight`;
`Trip → RouteVariant(CALM/BALANCED/ACTIVE) → Day → DayPlace/TransportLeg`;
`BudgetBreakdown→BudgetLine`; `TripScore`; `TripOpinion`; `Hotel`; `Ticket`, `TripDocument`,
`CalendarEvent→Reminder`, `ChatMessage`, `Expense`; `Album→Photo`, `Memory`; `SupportMessage`;
`CommunityMessage`; `Post`,`Like`,`Comment`,`Repost`,`Friendship`,`Notification`;
`User`, `TripMember`, `AuditLog`, `SavedTrip`; `TripRating`; `Upload`;
**`TripOrder`** (заявка «под ключ»: wish, brief (ИИ), status NEW/IN_PROGRESS/DONE/DECLINED,
adminNote, **priceRub** — цена услуги).

**Новое в User:** `lastSeenAt DateTime?` — активность (touch в JwtAuthGuard раз в 5 мин,
fire-and-forget); «онлайн» = моложе 5 минут.

**Seed:** флагман «China — Floating Mountains» (3 варианта), приватный Питер, **28 интро-
маршрутов по странам с настоящим планом по дням**: 210 дней, 189 мест с фото/координатами/
описаниями из ru.wikipedia (VERIFIED + sourceUrl; данные в `seed-countries.ts`, массив `plan`).
Идемпотентно: дни строятся только если у поездки нет RouteVariant (правки редактора не
затираются); hero-картинки не перекачиваются. Первый сид на пустой БД ~2-3 мин (Википедия).

## 5. Миграции

**Формальных миграций НЕТ** — `prisma db push` на старте контейнера (Dockerfile CMD).
Добавлено db push'ем за последние сессии: `TripRating`, `Upload`, `TripOrder` (+`priceRub`),
`User.lastSeenAt`, **`AssistantThread`, `AssistantMessage`, `TripView`**. Локально:
`DATABASE_URL='postgresql://vela:change_me_in_production@localhost:5432/vela?schema=public' npx prisma db push --skip-generate && npx prisma generate`
➡️ При стабилизации перейти на `prisma migrate` (baseline + deploy).

## 6. RBAC

Роли `SUPER_ADMIN > ADMIN > ORGANIZER > MEMBER`. `JwtAuthGuard` (Bearer; BLOCKED режется;
touch lastSeenAt), `RolesGuard` (SUPER_ADMIN проходит всё), `@Public`, `@CurrentUser`, `@Roles`.
Токен: localStorage `vela_token` + cookie (SSR). Публично: маршруты (PUBLIC), сообщество,
travel/plan, health. Первый супер-админ из `SUPERADMIN_EMAIL/PASSWORD`.

## 7. Backend: модули и ключевые эндпоинты

`backend/src/modules/`: auth, admin, planning, trips, social, network, community, assistant,
support, uploads, email, audit, prisma, health, analytics, integrations, recommendations,
routes, **travel**, **orders**.

| Метод | Маршрут | Что |
|------|---------|-----|
| GET | `/api/travel/status` | configured + города вылета |
| GET | `/api/travel/plan/:slug?origin&depart&return` | реальные цены билетов (кэш 10 мин, fallback-аэропорт, партнёрский marker в ссылках) + отельные дип-линки с датами; опц. Bearer для приватных |
| POST | `/api/orders/refine` | Groq: пожелание → структурированный бриф (ничего не выдумывает) |
| POST/GET | `/api/orders`, `/orders/mine` | создать заявку / мои |
| GET/PATCH | `/api/orders`, `/orders/:id` (ADMIN) | все заявки / статус+adminNote+priceRub |
| GET | `/api/orders/new-count` (ADMIN) | бейдж новых |
| GET | `/api/admin/stats` | дашборд: users{total,online,activeDay,newWeek}, trips{...}, orders{...}, social{...}, uploads, series (5 рядов по 30 дней через date_trunc), system{uptime,mem,node,integrations} , recentUsers(+lastSeenAt) |
| POST | `/api/trips/:slug/rate` | оценка 1-5 |
| GET | `/api/trips/:slug/estimate?travelers&comfort&flightRub` | траты: БАЗА «эконом» × индекс (STANDARD 1.8 / COMFORT 3.2), FLIGHTS — только реальная котировка (VERIFIED), иначе PENDING (`common/estimate.ts`) |
| GET | `/api/uploads/:id` | файл из БД |
| GET/POST | `/api/assistant/threads` | список диалогов / создать (авторизация) |
| GET/PATCH/DELETE | `/api/assistant/threads/:id` | диалог с историей / переименовать / удалить (только свой) |
| POST | `/api/assistant/threads/:id/messages` | реплика → ответ Groq; обе сохраняются, заголовок = первый вопрос |
| POST | `/api/trips/:slug/view` | маячок просмотра (публичный, опц. Bearer; дедуп 30 мин по visitorId) |
| GET | `/api/admin/analytics?days=` | просмотры: totals, ряд за 30 дней, топ маршрутов/стран, источники |

Карта направлений перелётов: `travel/destinations.ts` (страна → IATA + fallback).

## 8. Frontend: страницы и ключевые компоненты

**Страницы:** `/` (кино-hero + HomeMenu + GlobeSection + коллекция + данные), `/order`
(заказ под ключ: пожелание → ИИ-бриф → отправка; «Мои заявки» со статусами/ценой), `/login`,
`/register` (видео-фон, плавающие лейблы, глаз пароля, шкала надёжности, живая валидация,
занавес-переход AuthCurtain), `/trips/[slug]` (+`/edit`,`/plan`,`/print`,`/new`), `/admin`
(+`/users`,`/support`,`/orders`,`/analytics`), **`/assistant`** (чат с историей),
**`/offline`** (заглушка PWA), соц-страницы, `/community(/[country])`, `/data` и пр.

**Ключевые компоненты:**
- `hero/*` — кино-hero (см. §3): титул+CTA → главы 01/02/03 в РАЗНЫХ точках экрана (desktop),
  связанных золотой «нитью маршрута» (SVG path, pathLength=1, прорисовка dashoffset по
  прогрессу; узлы-точки вспыхивают; координаты CHAIN_PATH/NODE_POS/CH_CLASS в HeroVideo).
  Дымка Mist (masked backdrop-blur) под всеми текстами. Мобайл: главы снизу, нить скрыта.
- `ui/GlobeSection.tsx` — «Планета Vela»; `ui/Hero3D.tsx` — магнитный глобус.
- `assistant/AssistantWidget.tsx` — ИИ-консьерж: стекло+золото, искра-аватар, печать по
  буквам, типинг-точки, md-lite (**bold**, списки), полноэкранный режим, контекстные
  подсказки по pathname.
- `admin/AdminDashboard.tsx` — метрики с трендами (7дн vs пред.), сглаженные area-графики
  (Catmull-Rom→Bezier, золотой градиент), последние заявки, новые юзеры с онлайн-точками,
  интеграции-чипы, система. Автообновление 60с.
- `auth/AuthShell.tsx` (+`fields.tsx`) — видео-фон, тёмная стеклянная карточка (класс `dark`
  переключает токены), AuthCurtain.
- `social/SocialTabs.tsx` — glass-пилюля соц-навигации. `ui/FloatingNav.tsx` — нижняя пилюля;
  скрыта пока идёт кино-hero (`[data-hero-cinema]`), скролл ссылок внутри (не клипует меню).
- `trip/TravelPlanner.tsx` + `TripCosts.tsx` + `SpendEstimator.tsx` — перелёт по датам →
  реальная цена → в «Примерные траты».
- `assistant/parts.tsx` — общие Spark/renderRich/Typewriter/suggestionsFor (виджет + раздел).
- `app/welcome/page.tsx` — знакомство для новых пользователей: **отдельный экран** (не подсказки
  поверх интерфейса), 4 шага, клавиши ←/→/Esc, в конце занавес → главная. Флаг `vela_welcomed`.
  Попасть можно только из verify-email после первого подтверждения почты. На `/welcome`
  обвязка сайта скрыта (FloatingNav/BottomNav/Support/Assistant проверяют путь).
- `pwa/PwaProvider.tsx` — регистрация SW (только прод), предложение установки
  (beforeinstallprompt, флаг `vela_install_dismissed`), плашка «нет соединения».
- `trip/SaveOfflineButton.tsx` (кнопка «Офлайн» → SW кэширует страницу+PDF+фото),
  `trip/TripViewBeacon.tsx` (маячок аналитики), `trip/PrintControls.tsx` (печать + `data-print`).
- `lib/og.tsx` — шаблон OG-картинок (next/og). Шрифт Inter читается из `public/fonts`
  (⚠️ встроенный в next/og шрифт — без кириллицы; satori не понимает `inset`, только стороны).
- `lib/`: api.ts (типы+клиент), country-coords.ts, embassies.ts (**все ссылки проверены,
  русскоязычные приоритетно, пометки [ru]/[visa]/[bot]**), hero-media.ts, plural.ts и пр.

## 9. Реализованные функции (сводно)

Все из прошлых хендоффов (auth+RBAC+верификация, планирование, приватные поездки, расходы,
соцсеть, сообщество+гиды+въезд+посольства, оценки, загрузки в БД, профиль, поддержка,
админка) ПЛЮС за последние сессии:
- Кино-hero с видео (скролл=таймлайн, главы+нить, дымка, зерно, грейдинг, устойчивый скраб).
- Магнитный глобус + секция «Планета Vela» (клик по стране → маршрут(ы)).
- Реальные цены билетов (Aviasales) + полный расчёт трат (эконом-база×индекс + реальный перелёт).
- Заявки «под ключ» с ИИ-брифом + админ-обработка + цена услуги.
- Монетизация: TRAVELPAYOUTS_MARKER в ссылках выдачи.
- Дни маршрутов из Википедии для всех 28 интро-поездок.
- Премиум ИИ-консьерж; auth на видео с занавесом; админ-дашборд v2 (тренды/area-графики/
  онлайн/мониторинг); glass соц-навигация; посольства → русскоязычные.

**Сессия 26.07.2026 (шесть блоков — всё проверено локально):**
1. **Знакомство `/welcome`** — отдельная страница на 4 шага для новых пользователей
   (регистрация → подтверждение почты → знакомство → главная), один раз на устройство.
2. **Раздел `/assistant`** — чат с сохранением истории в БД: список диалогов, переименование,
   удаление, автозаголовок из первого вопроса; виджет остаётся stateless, в его шапке — «История».
3. **PDF-экспорт** `/trips/[slug]/print`: обложка, факты, план по дням (места, «как добраться»,
   советы, переезды), отели, бюджет, чек-листы, поле для заметок. PDF = системная печать
   (вектор, без библиотек). `data-print` на body прячет всю обвязку и форсирует светлые токены.
4. **SEO-пакет:** `generateMetadata` для маршрутов (canonical, OG, twitter; PRIVATE → noindex),
   динамические OG-картинки (`opengraph-image.tsx` для маршрута и главной), `sitemap.ts`
   (64 URL: разделы + маршруты + страны), `robots.ts`, metadata для клиентских разделов.
5. **Аналитика посещений** `/admin/analytics`: сводка, ряд за 30 дней, топ маршрутов и стран,
   источники переходов; окна 7/30/90 дней.
6. **PWA:** manifest + иконки (сгенерированы, `public/icons`), service worker (`public/sw.js`),
   установка на телефон, кнопка «Офлайн» на маршруте (страница + PDF + фото в кэш),
   заглушка `/offline` (через редирект — иначе Next падает при гидрации чужого URL).

## 10. Переменные окружения

Полный список — `.env.example`; прод-декларации — `render.yaml`. Ключевые на `vela-api`:
```
DATABASE_URL, NODE_ENV, JWT_SECRET, JWT_EXPIRES=7d, APP_URL=https://velatrips.ru
SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD
RESEND_API_KEY (задан на проде), EMAIL_FROM
GROQ_API_KEY   ⚠️ на проде НЕ задан → консьерж/бриф отвечают заглушкой
GROQ_MODEL=llama-3.3-70b-versatile
TRAVELPAYOUTS_TOKEN   ⚠️ есть локально в .env, на Render ВПИСАТЬ вручную (sync:false)
TRAVELPAYOUTS_MARKER  ⚠️ партнёрский marker — владелец ещё не дал значение
S3_* (опц.)
```
`vela-web`: `BACKEND_URL`. Опц. фронта: `NEXT_PUBLIC_HERO_MEDIA_URL` ('none' → глобус-hero),
`NEXT_PUBLIC_HERO_MEDIA_POSTER`.

## 11. Как запускать / проверять

Docker: `repository-db-1` (5432), `-backend-1` (4000), `-web-1` (3000). Для UI-итераций:
`docker compose stop web`, затем preview-MCP «web» (launch.json) = Next dev на 3000 с
`BACKEND_URL=http://localhost:4000`. После правок бэка/схемы:
`docker compose up -d --build backend` (старт делает db push + seed).

**Перед пушем:** `npx tsc --noEmit` фронт и бэк; `BACKEND_URL=... npm run build` (фронт;
⚠️ прод-сборка в той же папке ломает running dev — останавливай dev до `next build`);
`npm run build && npm run build:seed` (бэк).
Особенности Preview-MCP: скриншоты иногда чёрные/сжатые после resize (артефакт панели —
проверяй DOM/JS-замерами); скролл может сбрасываться МЕЖДУ вызовами javascript_exec (внутри
одного вызова стабилен); после HMR-правок делай полный reload перед замерами.
Логиниться/вводить пароли ассистент не может — админку/соцстраницы проверяет владелец.

## 12. Изменённые файлы за последние сессии (главное)

- **Новые:** `backend/src/modules/travel/*` (module/service/destinations),
  `backend/src/modules/orders/*`, `frontend/src/components/hero/*` (7 модулей),
  `frontend/src/components/ui/GlobeSection.tsx`, `frontend/src/components/admin/AdminDashboard.tsx`,
  `frontend/src/components/auth/fields.tsx`, `frontend/src/components/trip/{TravelPlanner,TripCosts}.tsx`,
  `frontend/src/lib/{country-coords,hero-media}.ts`, `frontend/src/app/order/page.tsx`,
  `frontend/src/app/admin/orders/page.tsx`, `frontend/public/hero/{thailand.mp4,thailand-poster.jpg}`.
- **Переписаны:** `AssistantWidget`, `AuthShell`, `SocialTabs`, `Hero3D`, `Marquee`,
  `SpendEstimator`, `seed-countries.ts` (+plan по дням), `common/estimate.ts` (эконом-база×индекс),
  `admin.module.ts` (stats v2), `auth.guards.ts` (lastSeenAt), `embassies.ts` (ру-аудит),
  `login/register` страницы, `FloatingNav` (скрытие в кино + фикс overflow-клипа меню).

## 13. Текущий статус

- ✅ Прод живой (velatrips.ru), все сборки чистые, схема применена локально
  (на проде применится db push'ем при деплое).
- ⚠️ Render free спит 15 мин → холодный старт ~30с (keep-alive или платный план).
- ⚠️ GROQ_API_KEY, TRAVELPAYOUTS_TOKEN, TRAVELPAYOUTS_MARKER — вписать в Render.
- ⚠️ Git identity владельца не настроен (`git config --global user.name/email`).
- Известное: скраб-видео 16МБ грузится прогрессивно — на медленной сети первые секунды
  скролла могут ждать буфер (вотчдог в VideoScrubber переживает это без зависаний).

## 14. Открытые задачи

1. **Ключи в Render**: GROQ_API_KEY, TRAVELPAYOUTS_TOKEN, TRAVELPAYOUTS_MARKER (у владельца).
2. **Тёмный иммерсив внутренних страниц** (Design C rollout) — главная уже тёмная кино-сцена,
   внутренние страницы остаются крем-светлыми.
3. **Соцслой:** личные чаты 1:1 (network-задел), уведомления сообщества/поддержки, пагинация
   лент, поиск по маршрутам/сообществу, лучший ответ в сообществе.
4. **Прод-хардненинг:** prisma migrate, httpOnly-cookie для JWT, rate-limit auth/assistant,
   keep-alive хостинга.
5. **Hotellook замена:** если появится рабочий отельный API (Ostrovok B2B и т.п.) — вернуть
   живые цены отелей; модель Hotel готова.
6. **Higgsfield:** задел `lib/hero-media.ts` — когда владелец даст API, генеративные
   фоны подставятся конфигом.
7. ~~Знакомство новых пользователей, `/assistant`, PDF-экспорт, SEO, аналитика, PWA~~ — **сделано 26.07.2026**
   (см. §9). Из предложенного остаётся **мультиязычность** (i18n интерфейса).
8. **Хвосты новых функций:**
   - консьерж на проде отвечает заглушкой, пока не задан `GROQ_API_KEY` (история диалогов
     при этом уже пишется в БД);
   - `TripView` растёт без ограничения — при заметном трафике добавить чистку старше N месяцев;
   - офлайн-кэш маршрута: клиентские переходы (RSC) без сети не работают, страница открывается
     из кэша при полной перезагрузке — при желании прикрутить кэш RSC-запросов;
   - OG-картинка маршрута с фото весит ~1.3 МБ (PNG от next/og) — если станет узким местом,
     уменьшать входное фото.

## 15. Правила работы (важно)

- **Real Data Policy** — не выдумывать цифры. VERIFIED только с source/sourceUrl.
- Схему править в `backend/prisma/schema.prisma` + `cp` в `database/prisma/`.
- Не коммитить: `backend/dist-seed/`, `backend/package-lock.json`,
  `frontend/tsconfig.tsbuildinfo`, `.env`.
- 3D: держать fiber@8. Видео: кодировать с `-g 10..12`.
- Дизайн-токены: ink/paper/aurora; на фото/видео — явные white/dark + дымка Mist, не токены.
- Проверяй визуально light+dark, desktop+mobile; после правок hero — все фазы скролла.
- Service worker проверять только на прод-сборке (`next build && next start`) — в dev он
  сознательно не регистрируется. Реальный офлайн проверяется остановкой сервера.
- Правишь `public/sw.js` — помни: страницы под кэшем должны отдаваться по своему URL
  (иначе Next падает при гидрации), а API и `/uploads` не кэшируются никогда.

— Конец хендоффа —
