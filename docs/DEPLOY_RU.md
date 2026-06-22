# Деплой Vela — пошагово (на русском)

Цель: выложить проект на **GitHub** и развернуть так, чтобы сайт был доступен
другим людям по ссылке. Репозиторий уже на GitHub: https://github.com/Pahar0001/WW

## Архитектура
Три части — база, бэкенд (API), фронтенд:

```
  PostgreSQL  ◀──  NestJS API (vela-api)  ◀──  Next.js web (vela-web)
   (vela-db)        /api/*                      сайт, который видят люди
```

Есть **два пути**. Рекомендую первый — он проще (одна платформа).

---

# Путь A (рекомендуется): всё на Render через Blueprint

В репозитории есть `render.yaml` — Render развернёт по нему **все три** сервиса.

### Шаг 1. Аккаунт
Зарегистрируйтесь на **Render** → https://render.com (вход через GitHub).

### Шаг 2. Создать всё одним Blueprint
1. Render → **New +** → **Blueprint**.
2. Выберите репозиторий **Pahar0001/WW**.
3. Render прочитает `render.yaml` и покажет: базу `vela-db`, сервисы `vela-api`
   и `vela-web`. Нажмите **Apply**.
4. Дождитесь сборки (Docker, ~5–10 минут на первый раз).

### Шаг 3. Прописать адреса (2 переменные) и передеплоить
После первой сборки у сервисов появятся адреса, например:
`https://vela-api.onrender.com` и `https://vela-web.onrender.com`.

1. Сервис **vela-api** → вкладка **Environment** → переменная `CORS_ORIGIN`:
   впишите адрес фронтенда `https://vela-web.onrender.com` → **Save** (передеплоится).
2. Сервис **vela-web** → **Environment** → впишите **обе** переменные одинаково:
   - `NEXT_PUBLIC_API_URL` = `https://vela-api.onrender.com/api`
   - `API_INTERNAL_URL` = `https://vela-api.onrender.com/api`
3. У сервиса **vela-web** → **Manual Deploy** → **Clear build cache & deploy**
   (это важно: адрес API «зашивается» при сборке).

### Шаг 4. Готово
Откройте `https://vela-web.onrender.com` — это ваш сайт. Делитесь ссылкой.
Проверка API: `https://vela-api.onrender.com/api/health` → `{"status":"ok"}`.

> Бесплатный тариф Render «засыпает» при простое: первый запрос после паузы идёт
> ~30 секунд. Загруженные файлы-картинки на бесплатном диске не сохраняются между
> передеплоями — для постоянного хранения подключите **Render Disk** к `vela-api`
> по пути `/app/uploads`, либо добавляйте картинки по ссылке (URL).

---

# Путь B (альтернатива): бэкенд на Render, фронтенд на Netlify

### 1. База + бэкенд на Render
То же, что в Пути A, но в `render.yaml` вам нужен только блок `vela-api` и
`vela-db`. Проще: создайте Blueprint как выше — `vela-web` можно потом просто
удалить (Suspend/Delete), если фронт будет на Netlify.

### 2. Фронтенд на Netlify
1. Netlify → **Add new site** → **Import an existing project** → репозиторий `WW`.
2. Настройки: **Base directory** = `frontend`, **Build command** = `npm run build`,
   **Publish** = `.next` (часть берётся из `frontend/netlify.toml`).
3. **Environment variables** → `NEXT_PUBLIC_API_URL` = `https://vela-api.onrender.com/api`.
4. **Deploy** → получите `https://ваш-сайт.netlify.app`.

### 3. Связать (CORS)
В Render у `vela-api` задайте `CORS_ORIGIN` = адрес Netlify-сайта → пересохраните.

---

## Частые проблемы
- **«Пока нет маршрутов»** → неверный `NEXT_PUBLIC_API_URL`, или бэкенд спит/не
  поднялся. Проверьте `…/api/health` напрямую.
- **Ошибка CORS в консоли** → `CORS_ORIGIN` не совпадает с адресом фронта (схема +
  домен, без слэша на конце).
- **Поменяли переменную — ничего не изменилось** → нужен повторный деплой; для
  `NEXT_PUBLIC_*` именно **Clear build cache & deploy**.
- **Карта** работает без ключей (OpenStreetMap) — настраивать ничего не нужно.

## Как обновлять сайт
Просто пушьте в `main` — Render/Netlify пересоберут автоматически:
```bash
cd ~/Desktop/Repository
git add -A && git commit -m "что изменил" && git push
```
