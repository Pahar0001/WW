#!/bin/sh
# Подготовка сервера VDSina и первый запуск Vela — ещё до переключения домена.
#
# Запускать на СЕРВЕРЕ, от root:
#
#   curl -fsSL https://raw.githubusercontent.com/Pahar0001/WW/main/deploy/bootstrap-vdsina.sh \
#     | sh -s -- velatrips.ru почта@example.ru
#
# Первый аргумент — домен без https:// и косой черты. Второй (можно опустить) —
# почта для писем Let's Encrypt о продлении сертификата.
#
# Что делает: обновляет систему, добавляет подкачку, ставит Docker, закрывает
# лишние порты, забирает код, придумывает пароли и поднимает сайт БЕЗ Caddy —
# он будет виден по адресу IP:8080. Домен в этот момент ещё работает на старой
# площадке, посетители ничего не замечают.
#
# Второй шаг — deploy/go-live.sh, уже после переключения A-записей.
#
# Скрипт можно запускать повторно: настройки и .env не перезаписываются.
set -eu

DOMAIN="${1:-}"
ACME_EMAIL="${2:-}"
DIR=/opt/vela
REPO=https://github.com/Pahar0001/WW.git

die() { echo "  ✗ $1" >&2; exit 1; }

[ -n "$DOMAIN" ] || die "укажите домен: sh bootstrap-vdsina.sh ваш-домен.ru почта@example.ru"
[ "$(id -u)" = 0 ] || die "запускать от root"
echo "$DOMAIN" | grep -qE '^[a-z0-9.-]+\.[a-z]{2,}$' || die "домен нужен без https:// и без косой черты"

echo "== 1/7 система"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq git curl ca-certificates ufw >/dev/null

MEM_MB="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
echo "   память: ${MEM_MB} МБ"
[ "$MEM_MB" -ge 1800 ] || die "нужно минимум 2 ГБ памяти: сборка фронтенда не уместится. Увеличьте тариф в панели VDSina"

echo "== 2/7 подкачка"
if [ "$(swapon --show --noheadings | wc -l)" -gt 0 ]; then
  echo "   уже есть, пропускаем"
else
  # Сборка Next.js съедает больше, чем работа сайта: без подкачки на 2 ГБ
  # она падает с «JavaScript heap out of memory».
  fallocate -l 4G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "   добавлено 4 ГБ"
fi

echo "== 3/7 Docker"
if command -v docker >/dev/null 2>&1; then
  echo "   уже стоит: $(docker --version)"
else
  curl -fsSL https://get.docker.com | sh >/dev/null
  echo "   поставлен: $(docker --version)"
fi
systemctl enable --now docker >/dev/null 2>&1 || true

echo "== 4/7 порты"
# Сначала SSH, иначе включение ufw обрубит текущее подключение.
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
# 8080 — только на время проверки, go-live.sh его закроет
ufw allow 8080/tcp >/dev/null
ufw --force enable >/dev/null
echo "   открыты 22, 80, 443 и временно 8080"

echo "== 5/7 код"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" pull --ff-only
  echo "   обновлён $DIR"
else
  mkdir -p "$DIR"
  git clone --depth 1 "$REPO" "$DIR"
  echo "   склонирован в $DIR"
fi
cd "$DIR"

echo "== 6/7 настройки"
NEW_ENV=0
if [ -f .env ]; then
  echo "   .env уже есть, оставляем как есть"
else
  cp .env.prod.example .env
  chmod 600 .env
  NEW_ENV=1
fi

setenv() {
  # значения генерим base64/hex — символа | там не бывает, разделитель безопасен
  if grep -qE "^$1=" .env; then
    sed -i "s|^$1=.*|$1=$2|" .env
  else
    printf '%s=%s\n' "$1" "$2" >> .env
  fi
}

if [ "$NEW_ENV" = 1 ]; then
  ADMIN_PASS="$(openssl rand -base64 15)"
  setenv DOMAIN "$DOMAIN"
  setenv APP_URL "https://$DOMAIN"
  setenv ACME_EMAIL "$ACME_EMAIL"
  setenv POSTGRES_PASSWORD "$(openssl rand -base64 24)"
  setenv JWT_SECRET "$(openssl rand -hex 32)"
  setenv SUPERADMIN_EMAIL "${ACME_EMAIL:-admin@$DOMAIN}"
  setenv SUPERADMIN_PASSWORD "$ADMIN_PASS"
  setenv EMAIL_FROM "Vela <no-reply@$DOMAIN>"
  echo "   пароли сгенерированы"
fi

echo "== 7/7 сборка и запуск (10–20 минут, это нормально)"
COMPOSE="docker compose -f docker-compose.prod.yml -f deploy/docker-compose.check.yml"
BUILD_ID="$(date +%F-%H%M)" $COMPOSE up -d --build db backend web

echo "   ждём, пока поднимется приложение"
IP="$(ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}')"
[ -n "${IP:-}" ] || IP="$(curl -fsS -m 10 https://api.ipify.org 2>/dev/null || echo 'IP-сервера')"
OK=0
i=0
while [ "$i" -lt 60 ]; do
  CODE="$(curl -s -o /dev/null -m 5 -w '%{http_code}' http://127.0.0.1:8080/ || true)"
  case "$CODE" in 200|30*) OK=1; break;; esac
  i=$((i + 1)); sleep 5
done

echo
if [ "$OK" = 1 ]; then
  echo "Сайт поднялся. Откройте в браузере:  http://$IP:8080"
else
  echo "Сайт пока не отвечает на 127.0.0.1:8080. Посмотрите, что происходит:"
  echo "  cd $DIR && $COMPOSE logs --tail=50 backend web"
fi

if [ "$NEW_ENV" = 1 ]; then
  echo
  echo "Вход администратора (запишите, второй раз показано не будет):"
  echo "  почта:  $(grep -E '^SUPERADMIN_EMAIL=' .env | cut -d= -f2-)"
  echo "  пароль: ${ADMIN_PASS:-см. $DIR/.env}"
fi

cat <<EOF

Дальше:
  1. Секреты с прежней площадки — в $DIR/.env
     (TRAVELPAYOUTS_TOKEN, TRAVELPAYOUTS_MARKER, KIWITAXI_WL_URL, RESEND_API_KEY).
     Без первых трёх сайт работает, но перестаёт зарабатывать.
  2. Данные с Render:
       cd $DIR && ./deploy/migrate-from-render.sh "<External Database URL>"
  3. Убедиться, что на http://$IP:8080 всё на месте.
  4. Переключить A-записи домена $DOMAIN и www.$DOMAIN на $IP.
  5. Когда DNS разойдётся:
       cd $DIR && ./deploy/go-live.sh
EOF
