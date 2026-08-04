import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TravelService, type FlightOffer } from '../travel/travel.service';
import { ORIGINS } from '../travel/destinations';
import { arrivalAirports, departureAirports, type Airport } from './airports';
import { groundTransport, type TransportOption } from './ground-transport';

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
}

export interface TimelineStep {
  /** −1 = день до вылета, 1..N — дни маршрута. */
  day: number;
  label: string;
  items: { icon: string; text: string }[];
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
        beforeFlight: beforeFlightStays(departureAirports(origin), depart, ret),
        firstNight: firstNightStays(firstCity, depart, ret),
      },
      timeline: buildTimeline(days, arrival[0], firstCity, offers[0]),
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

const hotelSearch = (query: string, depart?: string, ret?: string) => {
  const q = encodeURIComponent(query);
  const ru = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;
  const dates = depart && ret;
  return [
    {
      label: 'Ostrovok',
      href: dates
        ? `https://ostrovok.ru/hotel/search/?q=${q}&dates=${ru(depart!)}-${ru(ret!)}`
        : `https://ostrovok.ru/hotel/search/?q=${q}`,
    },
    {
      label: 'Яндекс Путешествия',
      href: dates
        ? `https://travel.yandex.ru/hotels/?text=${q}&checkinDate=${depart}&checkoutDate=${ret}`
        : `https://travel.yandex.ru/hotels/?text=${q}`,
    },
  ];
};

/**
 * Где ночевать перед вылетом. Смысл блока — ранние рейсы: на вылет в 06:00
 * общественный транспорт не успевает, а такси через весь город ночью стоит
 * дороже номера у терминала.
 */
function beforeFlightStays(airports: Airport[], depart?: string, ret?: string): StayOption[] {
  return airports.slice(0, 3).map((a) => ({
    title: `Рядом с аэропортом ${a.name}`,
    reason:
      a.distanceKm !== undefined
        ? `${a.distanceKm} км от центра — на ранний рейс безопаснее ночевать у терминала, чем ехать через город.`
        : 'Ночёвка у терминала избавляет от гонки на ранний рейс.',
    // Ночь перед вылетом — одна: даты поиска не совпадают с датами поездки,
    // поэтому даём поиск без дат и человек ставит свою ночь сам.
    links: hotelSearch(`аэропорт ${a.name}`),
  }));
}

/** Где остановиться в первую ночь — критерии, а не выдуманные отели. */
function firstNightStays(city: string, depart?: string, ret?: string): StayOption[] {
  return [
    {
      title: `${city}: рядом с центром`,
      reason: 'Всё в пешей доступности — разумно, если на город всего один-два дня.',
      links: hotelSearch(`${city} центр`, depart, ret),
    },
    {
      title: `${city}: рядом с метро или вокзалом`,
      reason: 'Дешевле центра, но вы быстро попадаете куда угодно. Хорошо для длинной поездки.',
      links: hotelSearch(`${city} метро`, depart, ret),
    },
    {
      title: `${city}: рядом с транспортным узлом`,
      reason: 'Если наутро едете дальше — не придётся пересекать город с чемоданами.',
      links: hotelSearch(`${city} вокзал`, depart, ret),
    },
  ];
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
): TimelineStep[] {
  const steps: TimelineStep[] = [];

  steps.push({
    day: -1,
    label: 'Накануне',
    items: [
      { icon: '🎒', text: 'Сборы, онлайн-регистрация, проверка документов и виз' },
      { icon: '🏨', text: 'Если рейс ранний — ночь рядом с аэропортом' },
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
