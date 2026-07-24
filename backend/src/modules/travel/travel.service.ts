import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DESTINATIONS, ORIGINS, type Destination } from './destinations';

// Реальные цены на авиабилеты — Aviasales Data API (Travelpayouts).
// Real Data Policy: цены не выдумываются. Если токена нет или API не ответил —
// возвращаем configured:false / пустой список, фронт показывает честный фолбэк.
// Цены из кэша Aviasales помечаются VERIFIED с источником и временем получения.

export interface FlightOffer {
  price: number; // руб., туда-обратно на человека
  airline: string;
  flightNumber: string;
  departureAt: string;
  returnAt: string | null;
  transfers: number;
  returnTransfers: number;
  durationMin: number; // суммарно в полёте
  originAirport: string;
  destinationAirport: string;
  link: string; // абсолютная ссылка на выдачу Aviasales
}

export interface TravelPlan {
  configured: boolean;
  origin: { iata: string; city: string };
  destination: { iata: string; city: string } | null;
  depart: string;
  return: string;
  nights: number;
  flights: FlightOffer[];
  hotelLinks: { city: string; booking: string; yandex: string; ostrovok: string }[];
  source: 'aviasales';
  dataStatus: 'VERIFIED';
  fetchedAt: string;
}

const API = 'https://api.travelpayouts.com/aviasales/v3/prices_for_dates';
const CACHE_TTL_MS = 10 * 60 * 1000; // кэш котировок 10 минут — бережём rate-limit
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface Accessor { id: string; role: string }

@Injectable()
export class TravelService {
  private readonly cache = new Map<string, { at: number; data: FlightOffer[] }>();

  constructor(private readonly prisma: PrismaService) {}

  get configured(): boolean {
    return Boolean(process.env.TRAVELPAYOUTS_TOKEN);
  }

  status() {
    return { configured: this.configured, origins: ORIGINS };
  }

  /** Котировки Aviasales по направлению и датам (round trip, RUB, на человека). */
  private async fetchFlights(
    origin: string,
    destination: string,
    depart: string,
    ret: string,
  ): Promise<FlightOffer[]> {
    const token = process.env.TRAVELPAYOUTS_TOKEN;
    if (!token) return [];
    const key = `${origin}-${destination}-${depart}-${ret}`;
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

    const url =
      `${API}?origin=${origin}&destination=${destination}` +
      `&departure_at=${depart}&return_at=${ret}` +
      `&currency=rub&sorting=price&limit=12&one_way=false&token=${token}`;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return [];
      const body: any = await res.json();
      const offers: FlightOffer[] = (body?.data ?? []).map((f: any) => ({
        price: f.price,
        airline: f.airline ?? '',
        flightNumber: f.flight_number ?? '',
        departureAt: f.departure_at,
        returnAt: f.return_at ?? null,
        transfers: f.transfers ?? 0,
        returnTransfers: f.return_transfers ?? 0,
        durationMin: f.duration ?? 0,
        originAirport: f.origin_airport ?? origin,
        destinationAirport: f.destination_airport ?? destination,
        link: `https://www.aviasales.ru${f.link}`,
      }));
      this.cache.set(key, { at: Date.now(), data: offers });
      // Не даём кэшу расти бесконечно.
      if (this.cache.size > 300) {
        const oldest = [...this.cache.entries()].sort((a, b) => a[1].at - b[1].at)[0];
        if (oldest) this.cache.delete(oldest[0]);
      }
      return offers;
    } catch {
      return [];
    }
  }

  /**
   * План «перелёт + отели» для поездки: реальные цены билетов под выбранные
   * даты + прямые ссылки на поиск отелей с этими датами по городам маршрута.
   * (Hotellook API закрыт — цены отелей не выдумываем, даём живые дип-линки.)
   */
  async plan(
    slug: string,
    originIata: string,
    depart: string,
    ret: string,
    accessor?: Accessor | null,
  ): Promise<TravelPlan> {
    if (!DATE_RE.test(depart) || !DATE_RE.test(ret)) {
      throw new BadRequestException('Даты должны быть в формате YYYY-MM-DD');
    }
    const departDate = new Date(`${depart}T00:00:00Z`);
    const retDate = new Date(`${ret}T00:00:00Z`);
    if (Number.isNaN(departDate.getTime()) || Number.isNaN(retDate.getTime()) || retDate <= departDate) {
      throw new BadRequestException('Дата возвращения должна быть позже даты вылета');
    }
    const origin = ORIGINS[originIata] ? originIata : 'MOW';

    const trip = await this.prisma.trip.findUnique({
      where: { slug },
      select: {
        id: true,
        visibility: true,
        country: { select: { slug: true, name: true } },
        variants: {
          take: 1,
          select: {
            days: { orderBy: { dayNumber: 'asc' }, select: { baseCity: true } },
          },
        },
      },
    });
    if (!trip) throw new NotFoundException(`Путешествие "${slug}" не найдено`);
    if (trip.visibility === 'PRIVATE') {
      const isAdmin = accessor?.role === 'ADMIN' || accessor?.role === 'SUPER_ADMIN';
      let isMember = false;
      if (accessor && !isAdmin) {
        const m = await this.prisma.tripMember.findUnique({
          where: { tripId_userId: { tripId: trip.id, userId: accessor.id } },
        });
        isMember = Boolean(m);
      }
      if (!isAdmin && !isMember) throw new ForbiddenException('Это приватная поездка — нужен доступ');
    }

    const dest: Destination | undefined = DESTINATIONS[trip.country.slug];

    let flights: FlightOffer[] = [];
    let destination: { iata: string; city: string } | null = null;
    if (dest && this.configured) {
      flights = await this.fetchFlights(origin, dest.iata, depart, ret);
      destination = { iata: dest.iata, city: dest.city };
      // Если по основному аэропорту кэш пуст — пробуем запасной.
      if (flights.length === 0 && dest.fallback) {
        const fb = await this.fetchFlights(origin, dest.fallback.iata, depart, ret);
        if (fb.length > 0) {
          flights = fb;
          destination = { iata: dest.fallback.iata, city: dest.fallback.city };
        }
      }
    } else if (dest) {
      destination = { iata: dest.iata, city: dest.city };
    }

    // Города маршрута — для ссылок на отели с выбранными датами.
    const cities: string[] = [];
    for (const d of trip.variants[0]?.days ?? []) {
      const c = d.baseCity?.trim();
      if (c && !cities.includes(c)) cities.push(c);
    }
    if (cities.length === 0 && dest) cities.push(dest.city);

    const nights = Math.round((retDate.getTime() - departDate.getTime()) / 86400000);
    const dd = (iso: string) => {
      const [y, m, d] = iso.split('-');
      return `${d}.${m}.${y}`;
    };
    const hotelLinks = cities.slice(0, 8).map((city) => ({
      city,
      booking:
        `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(city)}` +
        `&checkin=${depart}&checkout=${ret}`,
      yandex:
        `https://travel.yandex.ru/hotels/?text=${encodeURIComponent(city)}` +
        `&checkinDate=${depart}&checkoutDate=${ret}`,
      ostrovok:
        `https://ostrovok.ru/hotel/search/?q=${encodeURIComponent(city)}` +
        `&dates=${dd(depart)}-${dd(ret)}`,
    }));

    return {
      configured: this.configured,
      origin: { iata: origin, city: ORIGINS[origin] },
      destination,
      depart,
      return: ret,
      nights,
      flights,
      hotelLinks,
      source: 'aviasales',
      dataStatus: 'VERIFIED',
      fetchedAt: new Date().toISOString(),
    };
  }
}
