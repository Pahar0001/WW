/**
 * Трансфер и парковка: как человек оформляет их, не уходя с сайта.
 *
 * Раньше в разделе логистики трансфер был СОВЕТОМ («заранее заказанный
 * трансфер дешевле ночного такси») — то есть текстом, из которого ничего
 * нельзя сделать. Здесь появляется само действие, и путей к нему три, по
 * убыванию удобства:
 *
 *  1. ВИДЖЕТ Kiwitaxi White Label — поиск и оплата прямо на нашей странице.
 *     Живёт целиком на ФРОНТЕНДЕ (`KIWITAXI_WL_URL` у веб-сервиса), и это не
 *     случайно: тем же значением задаётся `frame-src` в CSP. Разведи адрес и
 *     политику по двум сервисам — и однажды виджет молча исчезнет,
 *     заблокированный собственной же политикой, ровно как в §12.15.
 *  2. ССЫЛКА к партнёру с УЖЕ подставленными аэропортом и датой. Работает
 *     всегда, ничего не требует, монетизируется маркером — этим занят файл.
 *  3. ЗАЯВКА на сайте (`ServiceRequest`) — человек оставляет её нам, мы
 *     организуем. Единственный путь, который не зависит ни от какого партнёра.
 *
 * ⚠️ REAL DATA POLICY. Цен трансфера здесь НЕТ. Они зависят от класса машины,
 * времени суток и расстояния; настоящую цифру человек видит в виджете или у
 * партнёра — и она будет его ценой, а не нашей выдумкой. Ровно поэтому мы не
 * пишем «от 2500 ₽»: такое число живёт до первого клика.
 */

/** Партнёрский marker Travelpayouts — тот же, что и в ссылках Aviasales. */
const marker = () => process.env.TRAVELPAYOUTS_MARKER ?? '';

export interface TransferLink {
  provider: string;
  label: string;
  href: string;
  note: string;
}

export interface TransferBlock {
  links: TransferLink[];
  /** Есть ли партнёрская атрибуция: без marker переходы не монетизируются. */
  markerConfigured: boolean;
}

/**
 * Ссылки к партнёрам с подставленными параметрами поездки.
 *
 * Подставляем ровно то, что знаем точно: аэропорт (по названию и коду) и дату.
 * Время подачи не считаем сами — «за три часа до вылета» это опять выдумка,
 * а у партнёра человек выберет его сам, зная свой рейс.
 */
export function transferLinks(opts: {
  airportName: string;
  airportIata: string;
  city: string;
  date?: string;
}): TransferLink[] {
  const m = marker();
  const withMarker = (url: string) => (m ? `${url}${url.includes('?') ? '&' : '?'}marker=${m}` : url);
  const q = encodeURIComponent(`${opts.airportName} (${opts.airportIata})`);

  return [
    {
      provider: 'kiwitaxi',
      label: 'Kiwitaxi',
      // Поиск открывается на нужном аэропорте; дату и время человек уточняет там.
      href: withMarker(`https://kiwitaxi.ru/search?to=${q}${opts.date ? `&date=${opts.date}` : ''}`),
      note: 'Фиксированная цена заранее, водитель встречает с табличкой. Оплата картой или наличными.',
    },
    {
      provider: 'gettransfer',
      label: 'GetTransfer',
      href: withMarker(`https://gettransfer.com/ru/?to=${q}`),
      note: 'Перевозчики предлагают свою цену — можно выбрать из нескольких предложений.',
    },
  ];
}

export function transferBlock(opts: {
  airportName: string;
  airportIata: string;
  city: string;
  date?: string;
}): TransferBlock {
  return {
    links: transferLinks(opts),
    markerConfigured: Boolean(marker()),
  };
}
