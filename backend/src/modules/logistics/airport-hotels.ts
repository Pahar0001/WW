/**
 * Отели у аэропорта: ссылка на КОНКРЕТНЫЙ отель вместо ссылки в поиск.
 *
 * Раньше блок «Где ночевать» отдавал строку «Рядом с аэропортом Шереметьево» и
 * ссылку на поиск — то есть перекладывал работу на человека ровно в тот момент,
 * ради которого он открыл раздел. Теперь показываем настоящие отели у
 * терминала: как называется, сколько до аэропорта, свой сайт и телефон.
 *
 * Откуда данные: OpenStreetMap (ODbL), выгрузка лежит в
 * `airport-hotels.generated.ts` и пересобирается скриптом
 * `scripts/build-airport-hotels.ts`. Каждый факт проверяем по ссылке на объект
 * OSM — она есть у каждой карточки.
 *
 * ⚠️ Чего здесь НЕТ и не будет: цен, рейтингов и «свободно 2 номера». OSM их не
 * хранит, отельного API у нас нет (Hotellook закрыт), а выдумывать запрещено
 * (§1). Поэтому карточка отвечает на вопрос «какие тут вообще есть отели и
 * далеко ли», а цену человек видит у того, кто её знает, — по ссылке с уже
 * подставленным названием и датами.
 */
import {
  AIRPORT_HOTELS,
  AIRPORT_HOTELS_FETCHED_AT,
  AIRPORT_HOTELS_SOURCE,
  AIRPORT_HOTELS_SOURCE_URL,
  type AirportHotel,
} from './airport-hotels.generated';

export interface HotelLink {
  label: string;
  href: string;
  /** 'official' — сайт самого отеля, 'booking' — где бронировать, 'map' — где это. */
  kind: 'official' | 'booking' | 'map';
}

export interface NearbyHotel {
  name: string;
  /** Километры до точки аэропорта по прямой — посчитано по координатам. */
  distanceKm: number;
  kind: AirportHotel['kind'];
  stars?: number;
  phone?: string;
  links: HotelLink[];
}

export const HOTELS_PROVENANCE = {
  source: AIRPORT_HOTELS_SOURCE,
  sourceUrl: AIRPORT_HOTELS_SOURCE_URL,
  fetchedAt: AIRPORT_HOTELS_FETCHED_AT,
};

const KIND_RU: Record<AirportHotel['kind'], string> = {
  hotel: 'отель',
  hostel: 'хостел',
  guest_house: 'гостевой дом',
  apartment: 'апартаменты',
  motel: 'мотель',
};

export const hotelKindRu = (kind: AirportHotel['kind']) => KIND_RU[kind] ?? 'ночлег';

/** Даты для Ostrovok: он принимает ДД.ММ.ГГГГ-ДД.ММ.ГГГГ. */
const ruDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

/**
 * Ссылки на конкретный отель.
 *
 * Порядок не случаен: сначала сайт самого отеля (там точно он и никого больше),
 * потом сервисы бронирования с подставленным названием, потом карта.
 *
 * ⚠️ Адрес поиска Ostrovok — `/hotels/?q=`. Прежний `/hotel/search/?q=`, который
 * стоял в коде, отдаёт 404: человек с раздела логистики попадал на страницу
 * ошибки. Проверено запросом, не на глаз.
 *
 * Для зарубежных отелей в запрос идёт латинское название, если OSM его знает:
 * русские сервисы бронирования индексируют международные названия лучше, чем
 * локальные («Ξενοδοχείο …» не найдётся никогда).
 */
function hotelLinks(hotel: AirportHotel, checkIn?: string, checkOut?: string): HotelLink[] {
  const links: HotelLink[] = [];

  if (hotel.website) {
    links.push({ label: 'Сайт отеля', href: hotel.website, kind: 'official' });
  }

  const searchName = hotel.nameEn ?? hotel.name;
  const q = encodeURIComponent(searchName);
  const dates = checkIn && checkOut;

  links.push({
    label: 'Ostrovok',
    href: dates
      ? `https://ostrovok.ru/hotels/?q=${q}&dates=${ruDate(checkIn!)}-${ruDate(checkOut!)}`
      : `https://ostrovok.ru/hotels/?q=${q}`,
    kind: 'booking',
  });

  links.push({
    label: 'Яндекс Путешествия',
    href: dates
      ? `https://travel.yandex.ru/hotels/?text=${q}&checkinDate=${checkIn}&checkoutDate=${checkOut}`
      : `https://travel.yandex.ru/hotels/?text=${q}`,
    kind: 'booking',
  });

  // Карта по координатам — единственная ссылка, которая ведёт ИМЕННО в эту
  // точку, а не в результат поиска по названию. Нужна, когда названий-двойников
  // несколько, а такое бывает часто: «Аэропорт», «Транзит», три «GettSleep».
  links.push({
    label: 'На карте',
    href: `https://www.openstreetmap.org/?mlat=${hotel.lat}&mlon=${hotel.lng}#map=17/${hotel.lat}/${hotel.lng}`,
    kind: 'map',
  });

  return links;
}

/**
 * Название, которое читается.
 *
 * В OSM имя записано на языке страны, и для Каира это «نوفوتيل», а для Пекина
 * иероглифы. Русскому человеку такая строка не говорит ничего и вдобавок не
 * ищется в русских сервисах бронирования. Если в основном имени нет ни
 * латиницы, ни кириллицы, показываем международное (`name:en` из OSM) — оно
 * есть почти всегда, потому что его пишут сами отели.
 *
 * Транслитерировать сами не пробуем: «Новотель» против «Novotel» — это уже
 * догадка о том, как отель называет себя, а не факт из источника.
 */
const READABLE = /[A-Za-zА-Яа-яЁё]/;
const displayName = (h: AirportHotel) =>
  READABLE.test(h.name) ? h.name : (h.nameEn ?? h.name);

/**
 * Отели у аэропорта, ближние первыми.
 *
 * `limit` держим маленьким: задача блока — дать выбрать за минуту, а не выдать
 * каталог. Полный список человек увидит по ссылке на сервис бронирования.
 *
 * Одинаковые названия схлопываем, оставляя ближайшее. В OSM у сетевых
 * капсульных отелей по нескольку точек в разных терминалах («GettSleep» ×3 в
 * Шереметьеве); показать их подряд — значит потратить половину короткого списка
 * на строки, неотличимые друг от друга.
 */
export function hotelsNearAirport(
  iata: string,
  opts: { limit?: number; checkIn?: string; checkOut?: string } = {},
): NearbyHotel[] {
  const raw = AIRPORT_HOTELS[iata] ?? [];
  const seen = new Set<string>();
  const out: NearbyHotel[] = [];
  const limit = opts.limit ?? 4;

  // Выгрузка уже отсортирована по расстоянию, поэтому первый встреченный
  // одноимённый — он же ближайший.
  for (const h of raw) {
    const name = displayName(h);
    const key = name.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      distanceKm: h.distanceKm,
      kind: h.kind,
      ...(h.stars ? { stars: h.stars } : {}),
      ...(h.phone ? { phone: h.phone } : {}),
      links: hotelLinks(h, opts.checkIn, opts.checkOut),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Есть ли вообще выгрузка по этому аэропорту — чтобы не рисовать пустой блок. */
export const hasHotels = (iata: string) => (AIRPORT_HOTELS[iata]?.length ?? 0) > 0;
