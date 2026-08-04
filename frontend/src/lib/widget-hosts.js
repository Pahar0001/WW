/**
 * Хосты, с которых разрешено встраивать виджет заказа трансфера.
 *
 * ⚠️ Зачем СТАТИЧЕСКИЙ список, а не хост из `KIWITAXI_WL_URL`.
 *
 * Next вмораживает заголовки из `next.config.js` в `.next/routes-manifest.json`
 * на СБОРКЕ, а не читает их при старте. Проверено: собери без переменной —
 * и `frame-src` навсегда останется `'self'`, сколько ни задавай её потом в
 * панели Render. Виджет при этом отрисуется (страница-то читает переменную в
 * рантайме) и будет молча заблокирован собственной политикой: пустой
 * прямоугольник, ни запроса в сеть, ни ошибки на странице — та же ловушка, что
 * дважды ловила нас с картами и картинками (§12.15).
 *
 * Поэтому политика не зависит от переменной вовсе: разрешаем заранее известные
 * домены партнёров по трансферам. Список короткий, лежит в коде, виден в ревью
 * — политика остаётся строгой.
 *
 * Тем же списком страница проверяет значение `KIWITAXI_WL_URL`: адрес с чужого
 * хоста фрейм не получит. Иначе опечатка в переменной снова дала бы пустой
 * прямоугольник вместо честного «виджет не настроен».
 *
 * Новый партнёр — добавить его домен ЗДЕСЬ и пересобрать фронтенд.
 */

/** Домены для CSP. Поддомены разрешены: у виджетов они бывают разными. */
const WIDGET_FRAME_HOSTS = [
  'https://*.kiwitaxi.com',
  'https://*.kiwitaxi.ru',
  'https://*.travelpayouts.com',
  'https://tp.media',
  'https://*.tp.media',
];

/**
 * Разрешён ли конкретный адрес. Правило то же, что у CSP: точное совпадение
 * хоста либо его поддомен.
 */
function isAllowedWidgetUrl(raw) {
  if (!raw) return false;
  let url;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;

  return WIDGET_FRAME_HOSTS.some((pattern) => {
    const host = pattern.replace(/^https:\/\//, '');
    if (host.startsWith('*.')) {
      const base = host.slice(2);
      return url.hostname === base || url.hostname.endsWith(`.${base}`);
    }
    return url.hostname === host;
  });
}

module.exports = { WIDGET_FRAME_HOSTS, isAllowedWidgetUrl };
