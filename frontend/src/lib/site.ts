/**
 * Публичный адрес сайта — одно место на весь фронтенд.
 *
 * Раньше `https://velatrips.ru` был вписан буквами в robots.ts, sitemap.ts и
 * metadataBase. При переезде на другой домен такие места легко пропустить,
 * а ошибка тихая: сайт открывается, но в карте сайта и в OG-тегах стоит
 * старый адрес.
 *
 * Значение приходит из NEXT_PUBLIC_SITE_URL — она задаётся на сборке
 * (docker-compose.prod.yml передаёт её как build-arg). Если переменной нет,
 * остаётся текущий адрес: локальная разработка и старые сборки не ломаются.
 */
const FALLBACK = 'https://velatrips.ru';

const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();

/** Без косой черты на конце: адреса везде склеиваются как `${SITE}/path`. */
export const SITE = (raw && /^https?:\/\//.test(raw) ? raw : FALLBACK).replace(/\/+$/, '');

/** Домен без схемы — для подписей вида «velatrips.ru» в интерфейсе. */
export const SITE_HOST = SITE.replace(/^https?:\/\//, '');
