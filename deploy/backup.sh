#!/bin/sh
# Резервная копия Vela: база и загруженные файлы.
#
# Ставится в cron на сервере:
#   crontab -e
#   0 4 * * * /opt/vela/deploy/backup.sh >> /opt/vela/backups/backup.log 2>&1
#
# Копии складываются в ./backups рядом с проектом и хранятся две недели.
# Базу снимаем через pg_dump внутри контейнера: копировать файлы каталога
# data у работающего Postgres нельзя — получится битый снимок.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/backups"
DAY="$(date +%F)"
KEEP_DAYS=14

cd "$ROOT"
mkdir -p "$OUT"

COMPOSE="docker compose -f docker-compose.prod.yml"

# .env читаем ради имён базы и пользователя
DB_NAME="$(grep -E '^POSTGRES_DB=' .env | cut -d= -f2- || echo vela)"
DB_USER="$(grep -E '^POSTGRES_USER=' .env | cut -d= -f2- || echo vela)"
: "${DB_NAME:=vela}"
: "${DB_USER:=vela}"

echo "[$(date +%T)] снимаем базу $DB_NAME"
$COMPOSE exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
  | gzip -9 > "$OUT/vela-db-$DAY.sql.gz"

echo "[$(date +%T)] снимаем загруженные файлы"
$COMPOSE run --rm --no-deps -v "$OUT:/backup" \
  --entrypoint sh backend -c "tar czf /backup/vela-uploads-$DAY.tar.gz -C /app/uploads ." \
  >/dev/null

echo "[$(date +%T)] удаляем копии старше $KEEP_DAYS дней"
find "$OUT" -name 'vela-*' -type f -mtime "+$KEEP_DAYS" -delete

echo "[$(date +%T)] готово:"
ls -lh "$OUT" | grep "$DAY" || true
