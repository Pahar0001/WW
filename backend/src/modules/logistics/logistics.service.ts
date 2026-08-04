import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TravelService, type FlightOffer } from '../travel/travel.service';
import { ORIGINS } from '../travel/destinations';
import {
  arrivalAirports,
  departureAirports,
  type Airport,
  type AirportParking,
} from './airports';
import { groundTransport, type TransportOption } from './ground-transport';
import {
  hotelsNearAirport,
  HOTELS_PROVENANCE,
  type NearbyHotel,
} from './airport-hotels';
import { transferBlock, type TransferBlock } from './transfer';

/**
 * Логистика поездки: «как я туда реально доберусь».
 *
 * Собирает в одном ответе то, что раньше было разбросано или отсутствовало:
 * аэропорты вылета и прилёта, реальные цены билетов (через `TravelService` —
 * второго запроса к Aviasales не делаем, у него свой кэш), транспорт внутри
 * страны, где ночевать до вылета и в первую ночь, и таймлайн от «дня −1».
 *
 * ⚠️ REAL DATA POLICY. Цены билетов — единственные настоящие числа здесь, они
 * приходят из Aviasales и помечены VERIFIED. Всё остальное — либо справочные
 * сведения с официальными ссылками (`ground-transport.ts`), либо ссылки на
 * поиск. Ни одна цена отеля, ни одно время в пути не выдумывается: где данных
 * нет, интерфейс показывает «нет данных» и ссылку, где посмотреть.
 */

export interface StayOption {
  /** Зачем здесь ночевать. */
  title: string;
  reason: string;
  /** Поисковые ссылки — цен и рейтингов у нас нет, показываем живой поиск. */
  links: { label: string; href: string }[];
  /**
   * Настоящие отели в этой зоне (OpenStreetMap) — с расстоянием до терминала и
   * ссылкой на КАЖДЫЙ конкретный отель, а не общим поиском. Пусто там, где
   * выгрузки по аэропорту нет: тогда остаются поисковые ссылки выше.
   */
  hotels: NearbyHotel[];
  /**
   * Даты именно этой ночёвки. Они НЕ совпадают с датами поездки: ночь перед
   * вылетом — это ночь накануне, а ночь по возвращении — ночь после посадки.
   * Подставляются в ссылки бронирования, чтобы человек не вводил их заново.
   */
  nights?: { checkIn: string; checkOut: string };
}

export interface TimelineStep {
  /** −1 = день до вылета, 1..N — дни маршрута. */
  day: number;
  label: string;
  items: { icon: string; text: string }[];
}

export interface MapPoint {
  label: string;
  sub?: string;
  lat: number;
  lng: number;
  kind: 'origin' | 'destination';
}

export interface ParkingBlock {
  airport: string;
  iata: string;
  options: AirportParking[];
}

/** Возвращение домой: то, что начинается после посадки в родном аэропорту. */
export interface ReturnHome {
  airports: Airport[];
  stays: StayOption[];
}

export interface LogisticsPlan {
  trip: { slug: string; title: string; durationDays: number };
  country: { slug: string; name: string };
  origin: { iata: string; city: string; airports: Airport[] };
  arrival: { airports: Airport[] };
  flights: {
    configured: boolean;
    offers: FlightOffer[];
    /** Самые дешёвые даты СРЕДИ НАЙДЕННЫХ — вывод из реальной выдачи, не прогноз. */
    cheapest: { departureAt: string; price: number; transfers: number }[];
    searchUrl: string;
    dataStatus: 'VERIFIED' | 'PENDING';
    fetchedAt: string | null;
  };
  ground: TransportOption[];
  stays: { beforeFlight: StayOption[]; firstNight: StayOption[] };
  timeline: TimelineStep[];
  /** Точки для карты: откуда летим и куда прилетаем. */
  map: MapPoint[];
  /** Парковки у аэропортов вылета — для тех, кто едет на своей машине. */
  parking: ParkingBlock[];
  /** Возвращение домой: ночёвка и выезд из аэропорта после позднего прилёта. */
  returnHome: ReturnHome;
  /** Трансфер до аэропорта: виджет, партнёрские ссылки, заявка на сайте. */
  transfer: TransferBlock;
  /** Откуда взяты отели у аэропортов и на какую дату выгружены. */
  hotelsProvenance: typeof HOTELS_PROVENANCE;
  /**
   * Самый ранний вылет среди найденных предложений, если он до 08:00.
   * Считается по РЕАЛЬНОМУ времени из выдачи, а не предполагается: именно
   * ранний рейс превращает «где ночевать перед вылетом» из общего совета в
   * необходимость. `null` — значит все рейсы дневные и пугать нечем.
   */
  earlyDeparture: { time: string; hour: number } | null;
}

interface Accessor {
  id: string;
  role: string;
}

@Injectable()
export class LogisticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly travel: TravelService,
  ) {}

  async plan(
    slug: string,
    originIata: string,
    depart: string | undefined,
    ret: string | undefined,
    accessor?: Accessor | null,
  ): Promise<LogisticsPlan> {
    const trip = await this.prisma.trip.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        durationDays: true,
        visibility: true,
        country: { select: { slug: true, name: true } },
        variants: {
          take: 1,
          select: {
            days: {
              orderBy: { dayNumber: 'asc' },
              select: { dayNumber: true, title: true, baseCity: true },
            },
          },
        },
      },
    });
    if (!trip) throw new NotFoundException(`Путешествие "${slug}" не найдено`);
    await this.assertAccess(trip.id, trip.visibility, accessor);

    const origin = ORIGINS[originIata] ? originIata : 'MOW';
    const arrival = arrivalAirports(trip.country.slug);

    // Билеты берём только если заданы даты: без них у Aviasales нечего спросить,
    // а придумывать «типичную» цену нельзя.
    let offers: FlightOffer[] = [];
    let fetchedAt: string | null = null;
    let configured = false;
    if (depart && ret) {
      try {
        const plan = await this.travel.plan(slug, origin, depart, ret, accessor);
        offers = plan.flights;
        fetchedAt = plan.fetchedAt;
        configured = plan.configured;
      } catch {
        // Логистика не должна падать из-за внешнего API: §1, мягкая деградация.
        offers = [];
      }
    } else {
      configured = this.travel.configured;
    }

    const days = trip.variants[0]?.days ?? [];
    const firstCity = days[0]?.baseCity?.trim() || arrival[0]?.city || trip.country.name;
    const from = departureAirports(origin);
    const early = earliestDeparture(offers);

    return {
      trip: { slug: trip.slug, title: trip.title, durationDays: trip.durationDays },
      country: trip.country,
      origin: { iata: origin, city: ORIGINS[origin], airports: departureAirports(origin) },
      arrival: { airports: arrival },
      flights: {
        configured,
        offers,
        cheapest: cheapestDates(offers),
        searchUrl: searchUrl(origin, arrival[0]?.iata, depart, ret),
        dataStatus: offers.length > 0 ? 'VERIFIED' : 'PENDING',
        fetchedAt,
      },
      ground: groundTransport(trip.country.slug),
      stays: {
        beforeFlight: beforeFlightStays(from, depart),
        firstNight: firstNightStays(firstCity, arrival, depart, ret),
      },
      timeline: buildTimeline(days, arrival[0], firstCity, offers[0], early),
      map: buildMap(from, arrival),
      parking: from
        .filter((a) => a.parking?.length)
        .map((a) => ({ airport: a.name, iata: a.iata, options: a.parking! })),
      returnHome: { airports: from, stays: returnHomeStays(from, ret) },
      transfer: transferBlock({
        airportName: from[0]?.name ?? ORIGINS[origin],
        airportIata: from[0]?.iata ?? origin,
        city: ORIGINS[origin],
        date: depart,
      }),
      hotelsProvenance: HOTELS_PROVENANCE,
      earlyDeparture: early,
    };
  }

  /** Приватную поездку смотрит только участник или админ — как в TravelService. */
  private async assertAccess(tripId: string, visibility: string, accessor?: Accessor | null) {
    if (visibility !== 'PRIVATE') return;
    const isAdmin = accessor?.role === 'ADMIN' || accessor?.role === 'SUPER_ADMIN';
    if (isAdmin) return;
    if (accessor) {
      const member = await this.prisma.tripMember.findUnique({
        where: { tripId_userId: { tripId, userId: accessor.id } },
      });
      if (member) return;
    }
    throw new ForbiddenException('Это приватная поездка — нужен доступ');
  }
}

/**
 * Самые дешёвые даты среди НАЙДЕННЫХ предложений.
 *
 * Это вывод из реальной выдачи, а не прогноз сезонности: мы не утверждаем, что
 * в эти дни дешевле всего вообще — только что среди того, что Aviasales отдал
 * на запрошенные даты, дешевле оказались эти.
 */
function cheapestDates(offers: FlightOffer[]) {
  const byDay = new Map<string, FlightOffer>();
  for (const o of offers) {
    const day = (o.departureAt || '').slice(0, 10);
    if (!day) continue;
    const best = byDay.get(day);
    if (!best || o.price < best.price) byDay.set(day, o);
  }
  return [...byDay.values()]
    .sort((a, b) => a.price - b.price)
    .slice(0, 3)
    .map((o) => ({ departureAt: o.departureAt, price: o.price, transfers: o.transfers }));
}

function searchUrl(origin: string, destination: string | undefined, depart?: string, ret?: string) {
  if (!destination || !depart || !ret) return 'https://www.aviasales.ru';
  const dd = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}`;
  return `https://www.aviasales.ru/search/${origin}${dd(depart)}${destination}${dd(ret)}1`;
}

/**
 * Поисковые ссылки по зоне — запасной путь, когда выгрузки отелей по аэропорту
 * нет и показать конкретные объекты нечем.
 *
 * ⚠️ Адрес поиска Ostrovok — `/hotels/?q=`. Прежний `/hotel/search/?q=` отдаёт
 * 404: до этой правки каждая ссылка на Ostrovok из логистики вела на страницу
 * ошибки. Проверено запросом.
 */
const hotelSearch = (query: string, checkIn?: string, checkOut?: string) => {
  const q = encodeURIComponent(query);
  const ru = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
  const dates = checkIn && checkOut;
  return [
    {
      label: 'Ostrovok',
      href: dates
        ? `https://ostrovok.ru/hotels/?q=${q}&dates=${ru(checkIn!)}-${ru(checkOut!)}`
        : `https://ostrovok.ru/hotels/?q=${q}`,
    },
    {
      label: 'Яндекс Путешествия',
      href: dates
        ? `https://travel.yandex.ru/hotels/?text=${q}&checkinDate=${checkIn}&checkoutDate=${checkOut}`
        : `https://travel.yandex.ru/hotels/?text=${q}`,
    },
  ];
};

/** Сдвиг ISO-даты на дни. Считаем в UTC: тут важен календарь, а не часы. */
function shiftDate(iso: string | undefined, days: number): string | undefined {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return undefined;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Где ночевать перед вылетом. Смысл блока — ранние рейсы: на вылет в 06:00
 * общественный транспорт не успевает, а такси через весь город ночью стоит
 * дороже номера у терминала.
 *
 * ⚠️ Даты этой ночёвки — НЕ даты поездки. Нужна ровно одна ночь: заезд накануне
 * вылета, выезд в день вылета. Раньше сюда уходил поиск вообще без дат, и
 * человек вводил их заново — притом что мы их знаем.
 */
function beforeFlightStays(airports: Airport[], depart?: string): StayOption[] {
  const checkIn = shiftDate(depart, -1);
  const checkOut = depart;
  const nights = checkIn && checkOut ? { checkIn, checkOut } : undefined;

  return airports.slice(0, 3).map((a) => ({
    title: `Рядом с аэропортом ${a.name}`,
    reason:
      a.distanceKm !== undefined
        ? `${a.distanceKm} км от центра — на ранний рейс безопаснее ночевать у терминала, чем ехать через город.`
        : 'Ночёвка у терминала избавляет от гонки на ранний рейс.',
    links: hotelSearch(`аэропорт ${a.name}`, checkIn, checkOut),
    hotels: hotelsNearAirport(a.iata, { limit: 4, checkIn, checkOut }),
    ...(nights ? { nights } : {}),
  }));
}

/**
 * Самый ранний вылет среди найденных предложений, если он до 08:00.
 *
 * ⚠️ Час берём ИЗ СТРОКИ, а не через `new Date()`. Время в выдаче — местное
 * время вылета, ровно то, что напечатано на билете. Разобрав его датой, мы
 * пересчитали бы его в часовой пояс сервера и получили бы «вылет в 3 часа»
 * там, где на билете стоит 6:00.
 */
function earliestDeparture(offers: FlightOffer[]): { time: string; hour: number } | null {
  let best: { time: string; hour: number } | null = null;
  for (const o of offers) {
    const m = /T(\d{2}):(\d{2})/.exec(o.departureAt || '');
    if (!m) continue;
    const hour = Number(m[1]);
    if (hour >= 8) continue;
    if (!best || hour < best.hour) best = { time: `${m[1]}:${m[2]}`, hour };
  }
  return best;
}

/** Точки для карты: аэропорты вылета и прилёта. Линию рисует клиент. */
function buildMap(from: Airport[], to: Airport[]): MapPoint[] {
  const points: MapPoint[] = [];
  const main = from[0];
  if (main) {
    points.push({
      label: main.city,
      sub: `${main.name} · ${main.iata}`,
      lat: main.lat,
      lng: main.lng,
      kind: 'origin',
    });
  }
  for (const a of to) {
    points.push({
      label: a.city,
      sub: `${a.name} · ${a.iata}`,
      lat: a.lat,
      lng: a.lng,
      kind: 'destination',
    });
  }
  return points;
}

/**
 * Возвращение домой. Зеркало «ночи перед вылетом», которого не хватало:
 * прилёт в час ночи означает, что аэроэкспресс уже не ходит, метро закрыто, а
 * ночное такси через весь город стоит как номер у терминала.
 *
 * ⚠️ Времени прилёта домой мы НЕ ЗНАЕМ и не считаем. В выдаче есть время
 * вылета обратно и суммарная продолжительность за оба плеча, но нет ни времени
 * по плечам, ни часовых поясов, — посчитать из этого час посадки нельзя, вышла
 * бы выдумка. Поэтому блок показывается всегда и сформулирован условием: «если
 * прилетаете ночью».
 */
function returnHomeStays(from: Airport[], ret?: string): StayOption[] {
  // Ночь ПОСЛЕ посадки: заезд в день возвращения, выезд наутро.
  const checkIn = ret;
  const checkOut = shiftDate(ret, 1);
  const nights = checkIn && checkOut ? { checkIn, checkOut } : undefined;

  return from.slice(0, 3).map((a) => ({
    title: `Ночь рядом с ${a.name}`,
    reason:
      a.lateNight ??
      'Если рейс домой приземляется ночью, номер у терминала часто дешевле ночного такси через весь город.',
    links: hotelSearch(`аэропорт ${a.name}`, checkIn, checkOut),
    hotels: hotelsNearAirport(a.iata, { limit: 4, checkIn, checkOut }),
    ...(nights ? { nights } : {}),
  }));
}

/**
 * Где остановиться в первую ночь.
 *
 * Два разных ответа на разные ситуации. Прилетели днём — вопрос в том, в каком
 * районе города жить, и здесь честнее давать КРИТЕРИИ (центр, метро, вокзал), а
 * не список отелей: чем город больше, тем сильнее выбор зависит от плана дней.
 * Прилетели ночью — вопрос другой и совершенно конкретный: до города ехать не
 * на чем, и нужен отель у ТЕРМИНАЛА. Вот на него отвечаем настоящими объектами.
 */
function firstNightStays(
  city: string,
  arrival: Airport[],
  depart?: string,
  ret?: string,
): StayOption[] {
  const options: StayOption[] = [
    {
      title: `${city}: рядом с центром`,
      reason: 'Всё в пешей доступности — разумно, если на город всего один-два дня.',
      links: hotelSearch(`${city} центр`, depart, ret),
      hotels: [],
    },
    {
      title: `${city}: рядом с метро или вокзалом`,
      reason: 'Дешевле центра, но вы быстро попадаете куда угодно. Хорошо для длинной поездки.',
      links: hotelSearch(`${city} метро`, depart, ret),
      hotels: [],
    },
    {
      title: `${city}: рядом с транспортным узлом`,
      reason: 'Если наутро едете дальше — не придётся пересекать город с чемоданами.',
      links: hotelSearch(`${city} вокзал`, depart, ret),
      hotels: [],
    },
  ];

  // Ночь прилёта — одна, со следующим утром: дальше человек едет по маршруту.
  const airport = arrival[0];
  const nearby = airport ? hotelsNearAirport(airport.iata, {
    limit: 4,
    checkIn: depart,
    checkOut: shiftDate(depart, 1),
  }) : [];

  if (airport && nearby.length > 0) {
    const checkOut = shiftDate(depart, 1);
    options.unshift({
      title: `У терминала ${airport.name}`,
      reason:
        'Если рейс садится поздно, до города вы уже не уедете обычным транспортом — ночь у аэропорта решает вопрос.',
      links: hotelSearch(`аэропорт ${airport.name}`, depart, checkOut),
      hotels: nearby,
      ...(depart && checkOut ? { nights: { checkIn: depart, checkOut } } : {}),
    });
  }

  return options;
}

/**
 * Таймлайн поездки. Начинается с «дня −1» — того самого дня, которого не было
 * в маршруте: доехать до аэропорта, переночевать, пройти регистрацию.
 */
function buildTimeline(
  days: { dayNumber: number; title: string | null; baseCity: string | null }[],
  arrival: Airport | undefined,
  firstCity: string,
  firstOffer: FlightOffer | undefined,
  early: { time: string; hour: number } | null,
): TimelineStep[] {
  const steps: TimelineStep[] = [];

  steps.push({
    day: -1,
    label: 'Накануне',
    items: [
      { icon: '🎒', text: 'Сборы, онлайн-регистрация, проверка документов и виз' },
      {
        icon: '🏨',
        // Не общий совет, а вывод из настоящего времени вылета: на рейс в 05:40
        // общественный транспорт просто не успевает.
        text: early
          ? `Вылет в ${early.time} — общественный транспорт в это время ещё не ходит, ночь у терминала снимает вопрос`
          : 'Если рейс ранний — ночь рядом с аэропортом',
      },
      { icon: '🚗', text: 'Едете на машине — забронируйте долгосрочную парковку заранее' },
      { icon: '🚕', text: 'Заранее заказанный трансфер дешевле ночного такси' },
    ],
  });

  const arrivalItems: { icon: string; text: string }[] = [
    {
      icon: '✈',
      text: firstOffer
        ? `Перелёт ${firstOffer.originAirport} → ${firstOffer.destinationAirport}` +
          (firstOffer.transfers > 0 ? `, пересадок: ${firstOffer.transfers}` : ', прямой')
        : 'Перелёт до страны',
    },
  ];
  if (arrival) {
    arrivalItems.push({
      icon: '🛬',
      text: `Прилёт в ${arrival.name}${arrival.toCity ? ` — ${arrival.toCity}` : ''}`,
    });
  }
  arrivalItems.push({ icon: '🏨', text: `Заселение в ${firstCity}` });
  steps.push({ day: 0, label: 'День прилёта', items: arrivalItems });

  for (const d of days) {
    const items: { icon: string; text: string }[] = [];
    if (d.baseCity) items.push({ icon: '📍', text: d.baseCity });
    if (d.title) items.push({ icon: '🗺', text: d.title });
    if (items.length === 0) items.push({ icon: '🗺', text: 'По плану маршрута' });
    steps.push({ day: d.dayNumber, label: `День ${d.dayNumber}`, items });
  }

  return steps;
}
