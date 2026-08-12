#!/bin/sh
# Второй шаг переезда: домен уже приведён на этот сервер — включаем Caddy,
# он выпускает сертификат, сайт начинает работать по своему адресу.
#
#   cd /opt/vela && ./deploy/go-live.sh
#
# Перед запуском должно быть сделано:
#   · deploy/bootstrap-vdsina.sh отработал, сайт виден по IP:8080;
#   · данные перенесены (deploy/migrate-from-render.sh);
#   · A-записи домена и www переключены на этот сервер и разошлись.
#
# Скрипт сам проверяет, что домен показывает на эту машину, и отказывается
# работать, если нет: Let's Encrypt считает неудачные попытки и после пяти
# за час перестаёт отвечать этому домену на несколько часов.
set -eu

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FORCE=0
[ "${1:-}" = "--force" ] && FORCE=1

die() { echo "  ✗ $1" >&2; exit 1; }

[ -f .env ] || die "нет .env — сначала deploy/bootstrap-vdsina.sh"
DOMAIN="$(grep -E '^DOMAIN=' .env | cut -d= -f2- | tr -d ' ')"
[ -n "$DOMAIN" ] || die "в .env не задан DOMAIN"

echo "== 1/5 куда смотрит $DOMAIN"
IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')"
[ -n "${IP:-}" ] || IP="$(curl -fsS -m 10 https://api.ipify.org 2>/dev/null || true)"
# Спрашиваем публичный резолвер, а не системный кэш: кэш может ещё держать
# старый адрес и показать картину прошлого дня.
RESOLVED="$(curl -fsS -m 15 -H 'accept: application/dns-json' \
  "https://cloudflare-dns.com/dns-query?name=$DOMAIN&type=A" 2>/dev/null \
  | tr ',' '\n' | grep -oE '"data":"[0-9.]+"' | cut -d'"' -f4 | tr '\n' ' ' || true)"

echo "   этот сервер: ${IP:-неизвестен}"
echo "   домен ведёт: ${RESOLVED:-не отвечает}"

if [ "$FORCE" = 0 ]; then
  echo "${RESOLVED:-}" | tr ' ' '\n' | grep -qx "${IP:-нет}" \
    || die "домен ещё не приведён сюда. Поправьте A-записи и подождите; проверять — этим же скриптом. Обойти проверку: ./deploy/go-live.sh --force"
fi

echo "== 2/5 поднимаем полный стек с Caddy"
# Без надстройки docker-compose.check.yml: порт 8080 закрывается,
# наружу остаётся только Caddy.
COMPOSE="docker compose -f docker-compose.prod.yml"
BUILD_ID="$(date +%F-%H%M)" $COMPOSE up -d --build

echo "== 3/5 ждём сертификат (до двух минут)"
OK=0
i=0
while [ "$i" -lt 24 ]; do
  CODE="$(curl -s -o /dev/null -m 10 -w '%{http_code}' "https://$DOMAIN/" || true)"
  if [ "$CODE" = "200" ]; then OK=1; break; fi
  i=$((i + 1)); sleep 5
done
[ "$OK" = 1 ] || {
  echo "   сертификат пока не выпущен. Что говорит Caddy:"
  $COMPOSE logs --tail=30 caddy
  die "остановились здесь — стек работает, HTTPS ещё нет"
}
echo "   выпущен"

echo "== 4/5 проверки"
for U in "https://$DOMAIN/" "https://$DOMAIN/api/health"; do
  printf '   %-42s %s\n' "$U" "$(curl -s -o /dev/null -m 15 -w '%{http_code} · %{time_total}s' "$U" || echo 'нет ответа')"
done
printf '   %-42s %s\n' "www → без www" \
  "$(curl -s -o /dev/null -m 15 -w '%{http_code} → %{redirect_url}' "https://www.$DOMAIN/" || echo 'нет ответа')"
echo "   адрес в robots.txt: $(curl -s -m 15 "https://$DOMAIN/robots.txt" | grep -i '^sitemap' || echo 'строки Sitemap нет')"

echo "== 5/5 порт проверки закрываем"
ufw delete allow 8080/tcp >/dev/null 2>&1 || true
echo "   8080 закрыт"

cat <<EOF

Готово. Осталось руками:
  · ночные копии:  crontab -e  →  0 4 * * * $ROOT/deploy/backup.sh >> $ROOT/backups/backup.log 2>&1
  · войти своим аккаунтом и убедиться, что данные на месте;
  · снять домены со старой площадки на Render, сам сервис не удалять неделю —
    пусть постоит запасным вариантом.
EOF
