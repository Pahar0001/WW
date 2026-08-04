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
import { mapPointUrl, mapSearchUrl } from '../../common/place-links';
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
  /** 'official' — сайт отеля, 'map' — карточка точки, 'source' — объект в OSM. */
  kind: 'official' | 'map' | 'source';
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

/**
 * Ссылки на конкретный отель — только проверенные в браузере форматы.
 *
 * ⚠️ Ссылок «забронировать на Ostrovok / Яндекс Путешествиях / Booking» здесь
 * больше НЕТ, и это не упущение. Ни один из трёх не принимает поиск по названию
 * ссылкой: Ostrovok отдаёт 404, Яндекс Путешествия открывают пустую форму,
 * Booking сбрасывает запрос на главную. Проверено вручную, разбор — в
 * `common/place-links.ts`. Лучше две работающие ссылки, чем четыре, из которых
 * две ведут в никуда: неработающая ссылка хуже её отсутствия, потому что
 * человек уходит с сайта и не возвращается.
 *
 * Что осталось и почему работает:
 *  · сайт самого отеля — там точно он и никого больше (есть примерно у трети);
 *  · карточка точки на Яндекс Картах по КООРДИНАТАМ — координата указывает на
 *    здание однозначно, её не надо искать в чужой базе. На карточке отеля
 *    Яндекс сам показывает цены и кнопку бронирования;
 *  · объект в OpenStreetMap — источник, по нему проверяется любой наш факт.
 */
function hotelLinks(hotel: AirportHotel): HotelLink[] {
  const links: HotelLink[] = [];

  if (hotel.website) {
    links.push({ label: 'Сайт отеля', href: hotel.website, kind: 'official' });
  }

  links.push({
    label: 'Цены и отзывы на карте',
    href: mapPointUrl(hotel.lat, hotel.lng),
    kind: 'map',
  });

  links.push({ label: 'Источник', href: hotel.osm, kind: 'source' });

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
export function hotelsNearAirport(iata: string, opts: { limit?: number } = {}): NearbyHotel[] {
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
      links: hotelLinks(h),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Есть ли вообще выгрузка по этому аэропорту — чтобы не рисовать пустой блок. */
export const hasHotels = (iata: string) => (AIRPORT_HOTELS[iata]?.length ?? 0) > 0;
