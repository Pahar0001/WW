# Vela на выделенном сервере

Порядок развёртывания на своей машине с российским доменом: приложение,
база и файлы — всё на одном сервере, без зарубежных сервисов.

Это не то же самое, что `docs/DEPLOY_RU.md` и `docs/DEPLOY_FREE.md`: там Vela
живёт на Render и Vercel, база — в Neon, файлы — в Supabase. Здесь всё своё.

## Зачем переезд

| Было | Стало |
|---|---|
| База в Neon (США / ЕС) | PostgreSQL на этом же сервере, том `vela_pgdata` |
| Файлы в Supabase Storage | том `vela_uploads` на этом же сервере |
| Приложение на Render | Docker на своей машине |
| Домен зашит в код | берётся из `DOMAIN` в `.env` |

Главная причина — не удобство, а данные. У сервиса российские пользователи,
и их персональные данные должны храниться в России: 152-ФЗ, статья 18, часть 5.
Пока база была в Neon, это требование не выполнялось — так и записано
в `docs/PROJECT_HANDOFF.md`, §14.B. Переезд закрывает этот пункт.

---

## Что понадобится

- сервер с Ubuntu 24.04, публичным IP и root-доступом;
- минимум **2 ГБ памяти** (Next.js собирается тяжелее, чем работает) и 20 ГБ диска;
- домен, A-записи которого ведут на этот IP;
- доступ сервера к репозиторию.

## 1. DNS

Две записи типа **A**, обе на IP сервера:

```
@     →  IP
www   →  IP
```

Проверить: `ping ваш-домен.ru` должен отвечать вашим адресом. Записи
расходятся от нескольких минут до часа. **Пока они не разошлись, дальше
идти нет смысла**: Caddy не сможет выпустить сертификат.

## 2. Подготовка сервера

```sh
ssh root@IP-сервера

apt update && apt upgrade -y

# подкачка: на 2 ГБ памяти сборка фронтенда может не уместиться
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

curl -fsSL https://get.docker.com | sh
```

## 3. Код и настройки

```sh
mkdir -p /opt/vela && cd /opt/vela
git clone <адрес-репозитория> .

cp .env.prod.example .env
nano .env
```

Заполнить обязательно:

| Переменная | Чем заполнить |
|---|---|
| `DOMAIN` | домен без `https://` и без косой черты |
| `ACME_EMAIL` | почта для уведомлений от Let's Encrypt |
| `POSTGRES_PASSWORD` | `openssl rand -base64 24` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `APP_URL` | `https://` + ваш домен |
| `SUPERADMIN_EMAIL`, `SUPERADMIN_PASSWORD` | первый администратор |

Остальное можно оставить пустым: почта, ИИ-консультант и внешнее хранилище
файлов необязательны, без них сервис работает.

## 4. Запуск

```sh
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Первая сборка занимает 10–20 минут: собираются два образа. Дальше:

1. поднимается `db` и ждёт готовности;
2. `backend` создаёт схему (`prisma db push`), наполняет справочники и стартует;
3. `web` поднимает Next.js;
4. `caddy` выпускает сертификат — на это уходит до минуты.

Смотреть, что происходит:

```sh
docker compose -f docker-compose.prod.yml logs -f caddy
docker compose -f docker-compose.prod.yml logs -f backend
```

## 5. Проверка

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://ваш-домен.ru/
curl -s -o /dev/null -w '%{http_code}\n' https://ваш-домен.ru/api/health
curl -s https://ваш-домен.ru/robots.txt | head -3
curl -s https://ваш-домен.ru/sitemap.xml | head -5
```

В `robots.txt` и `sitemap.xml` должен стоять ваш домен, а не старый:
адрес попадает туда на сборке из `NEXT_PUBLIC_SITE_URL`, которую
`docker-compose.prod.yml` передаёт из `DOMAIN`.

Дальше — руками, в браузере:

- [ ] главная открывается, замок в адресной строке на месте;
- [ ] `www.ваш-домен.ru` перебрасывает на адрес без www;
- [ ] регистрация и вход работают, письмо приходит (или ссылка видна в логе `backend`);
- [ ] вход администратором из `SUPERADMIN_EMAIL`;
- [ ] загрузка картинки в профиле сохраняется и открывается после перезагрузки;
- [ ] маршрут создаётся и остаётся после `docker compose restart`.

## 6. Резервные копии

```sh
chmod +x deploy/backup.sh
crontab -e
# добавить строку:
0 4 * * * /opt/vela/deploy/backup.sh >> /opt/vela/backups/backup.log 2>&1
```

Каждую ночь снимается дамп базы и архив загруженных файлов в `/opt/vela/backups`,
хранение — две недели. Проверить вручную: `./deploy/backup.sh`.

Восстановление базы из копии:

```sh
gunzip -c backups/vela-db-2026-08-12.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T db psql -U vela -d vela
```

## 7. Обновление

```sh
cd /opt/vela
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

Тома с базой и файлами при пересборке не трогаются.

## 8. Переезд данных с прежней площадки

Если на Render/Neon уже накопились живые данные, переносить нужно до того,
как пользователи начнут пользоваться новым адресом.

```sh
# на любой машине с доступом к Neon
pg_dump "<строка подключения Neon>" --clean --if-exists | gzip -9 > vela-neon.sql.gz
scp vela-neon.sql.gz root@IP-сервера:/opt/vela/

# на сервере
gunzip -c vela-neon.sql.gz \
  | docker compose -f docker-compose.prod.yml exec -T db psql -U vela -d vela
```

Файлы из Supabase Storage выгружаются через их консоль или `rclone`
и распаковываются в том `vela_uploads`.

После переезда:

1. переключить A-записи домена на новый сервер (если домен вёл на Render);
2. убедиться, что сайт открывается и данные на месте;
3. только потом выключать старую площадку.

## Что осталось от прежних схем

`render.yaml`, `frontend/netlify.toml`, `docs/DEPLOY_FREE.md`,
`docs/DEPLOY_NETLIFY.md` и `docs/DEPLOY_RU.md` описывают развёртывание
на облачных площадках. Они не удалены намеренно: пока боевая версия работает
на Render, это рабочая запасная схема. Удалять их стоит после того, как
выделенный сервер отработает без нареканий.
