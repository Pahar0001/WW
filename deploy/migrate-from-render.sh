#!/bin/sh
# Перенос боевых данных с Render на этот сервер.
#
#   ./deploy/migrate-from-render.sh "postgresql://…внешняя строка Render…"
#
# Внешнюю строку подключения даёт Render: Dashboard → база vela-db →
# Connections → External Database URL. Внутренняя (internal) снаружи
# не работает — нужна именно внешняя.
#
# Что делает: снимает дамп боевой базы, кладёт копию рядом (на случай
# неудачи), заливает в локальный Postgres и пересчитывает счётчики.
# Файлы пользователей переносятся отдельно — см. docs/DEPLOY_DEDICATED.md.
#
# Скрипт можно запускать повторно: каждый прогон полностью заменяет
# содержимое локальной базы дампом с Render.
set -eu

SRC="${1:-}"
if [ -z "$SRC" ]; then
  echo "Укажите строку подключения к базе Render:"
  echo "  ./deploy/migrate-from-render.sh \"postgresql://user:pass@host/db\""
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose -f docker-compose.prod.yml"
STAMP="$(date +%F-%H%M)"
DUMP="$ROOT/backups/render-$STAMP.sql.gz"

DB_NAME="$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2- || true)"
DB_USER="$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2- || true)"
: "${DB_NAME:=vela}"
: "${DB_USER:=vela}"

mkdir -p "$ROOT/backups"

echo "[1/4] проверяем, что локальная база поднята"
$COMPOSE up -d db
$COMPOSE exec -T db sh -c "until pg_isready -U $DB_USER -d $DB_NAME >/dev/null 2>&1; do sleep 1; done"

echo "[2/4] снимаем дамп с Render → $DUMP"
# pg_dump берём из того же образа postgres:16, чтобы версии совпадали:
# системный pg_dump старше сервера — откажется работать.
$COMPOSE run --rm --no-deps --entrypoint sh db -c \
  "pg_dump '$SRC' --clean --if-exists --no-owner --no-privileges" | gzip -9 > "$DUMP"

SIZE="$(wc -c < "$DUMP")"
if [ "$SIZE" -lt 10000 ]; then
  echo "  дамп подозрительно мал ($SIZE байт) — проверьте строку подключения"
  exit 1
fi
echo "  готово: $SIZE байт"

echo "[3/4] заливаем в локальную базу $DB_NAME"
gunzip -c "$DUMP" | $COMPOSE exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=0 >/dev/null

echo "[4/4] что получилось"
$COMPOSE exec -T db psql -U "$DB_USER" -d "$DB_NAME" -c "
  SELECT relname AS таблица, n_live_tup AS строк
  FROM pg_stat_user_tables
  WHERE n_live_tup > 0
  ORDER BY n_live_tup DESC
  LIMIT 15;"

echo
echo "Дальше:"
echo "  1. Перенести файлы пользователей (docs/DEPLOY_DEDICATED.md, раздел 8)"
echo "  2. $COMPOSE up -d --build"
echo "  3. Открыть сайт и войти существующим аккаунтом — данные должны быть на месте"
echo "  Дамп с Render сохранён: $DUMP"
