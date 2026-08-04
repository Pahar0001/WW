'use client';

import { authHeaders } from '@/lib/auth';
import type { FlightOffer } from '@/lib/api';

/**
 * Логистика поездки — «как я туда реально доберусь».
 *
 * Формы данных повторяют `backend/src/modules/logistics/logistics.service.ts`.
 * Ключевое: `dataStatus` есть у каждого блока, и `PENDING` здесь — нормальное
 * рабочее состояние, а не ошибка. Оно означает «у нас нет источника», и
 * интерфейс обязан говорить это прямо, а не подставлять правдоподобное число.
 */

export type TransportKind =
  | 'HIGH_SPEED_RAIL'
  | 'TRAIN'
  | 'BUS'
  | 'FLIGHT'
  | 'CAR'
  | 'TAXI'
  | 'TRANSFER'
  | 'FERRY';

export type Comfort = 'HIGH' | 'MEDIUM' | 'BASIC';

export interface AirportParking {
  title: string;
  url: string;
  note: string;
}

export interface Airport {
  iata: string;
  lat: number;
  lng: number;
  name: string;
  city: string;
  distanceKm?: number;
  toCity?: string;
  parking?: AirportParking[];
  /** Чем уехать из аэропорта поздней ночью, когда вернулись домой. */
  lateNight?: string;
}

export interface LogisticsMapPoint {
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

export interface TransportOption {
  kind: TransportKind;
  title: string;
  operator?: string;
  url?: string;
  comfort: Comfort;
  notes: string;
  priceNote?: string;
  durationNote?: string;
  dataStatus: 'VERIFIED' | 'ESTIMATED' | 'PENDING';
  source?: string;
  sourceUrl?: string;
}

/** Ссылка у карточки отеля: свой сайт, сервис бронирования или карта. */
export interface HotelLink {
  label: string;
  href: string;
  kind: 'official' | 'booking' | 'map';
}

/** Настоящий отель у аэропорта (OpenStreetMap), а не критерий выбора. */
export interface NearbyHotel {
  name: string;
  /** Километры до точки аэропорта по прямой. */
  distanceKm: number;
  kind: 'hotel' | 'hostel' | 'guest_house' | 'apartment' | 'motel';
  stars?: number;
  phone?: string;
  links: HotelLink[];
}

export interface StayOption {
  title: string;
  reason: string;
  links: { label: string; href: string }[];
  hotels: NearbyHotel[];
  /** Даты именно этой ночи — они не совпадают с датами поездки. */
  nights?: { checkIn: string; checkOut: string };
}

/**
 * Трансфер: партнёрские ссылки с подставленными параметрами.
 *
 * Адреса виджета здесь НЕТ намеренно — он приходит со страницы (переменная
 * веб-сервиса), потому что тем же значением задаётся `frame-src` в CSP.
 */
export interface TransferBlock {
  links: { provider: string; label: string; href: string; note: string }[];
  markerConfigured: boolean;
}

export const HOTEL_KIND_RU: Record<NearbyHotel['kind'], string> = {
  hotel: 'отель',
  hostel: 'хостел',
  guest_house: 'гостевой дом',
  apartment: 'апартаменты',
  motel: 'мотель',
};

export interface TimelineStep {
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
    cheapest: { departureAt: string; price: number; transfers: number }[];
    searchUrl: string;
    dataStatus: 'VERIFIED' | 'PENDING';
    fetchedAt: string | null;
  };
  ground: TransportOption[];
  stays: { beforeFlight: StayOption[]; firstNight: StayOption[] };
  timeline: TimelineStep[];
  map: LogisticsMapPoint[];
  parking: ParkingBlock[];
  returnHome: { airports: Airport[]; stays: StayOption[] };
  transfer: TransferBlock;
  /** Откуда взяты отели у аэропортов и на какую дату выгружены (ODbL). */
  hotelsProvenance: { source: string; sourceUrl: string; fetchedAt: string };
  /** Самый ранний вылет среди найденных, если он до 08:00. Иначе null. */
  earlyDeparture: { time: string; hour: number } | null;
}

// ── Заявки на трансфер и парковку ────────────────────────────────────────────

export type ServiceRequestKind =
  | 'TRANSFER_TO_AIRPORT'
  | 'TRANSFER_FROM_AIRPORT'
  | 'PARKING';

export interface CreateServiceRequest {
  kind: ServiceRequestKind;
  tripSlug?: string;
  airportIata: string;
  serviceDate: string;
  serviceTime?: string;
  pax?: number;
  pickup?: string;
  phone?: string;
  comment?: string;
}

/**
 * Отправка заявки. Возвращает текст ошибки строкой, а не бросает: форма должна
 * показать причину («дата уже прошла»), а не молча мигнуть.
 */
export async function createServiceRequest(
  input: CreateServiceRequest,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/service-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(input),
    });
    if (res.ok) return { ok: true };
    if (res.status === 401) {
      return { ok: false, error: 'Чтобы оставить заявку, войдите в аккаунт — ответ придёт на вашу почту.' };
    }
    if (res.status === 429) {
      return { ok: false, error: 'Слишком много заявок подряд. Попробуйте через час.' };
    }
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.message ?? 'Не удалось отправить заявку. Попробуйте позже.' };
  } catch {
    return { ok: false, error: 'Нет связи с сервером. Проверьте соединение.' };
  }
}

export async function getLogistics(
  slug: string,
  params: { origin: string; depart?: string; ret?: string },
): Promise<LogisticsPlan | null> {
  const qs = new URLSearchParams({ origin: params.origin });
  if (params.depart) qs.set('depart', params.depart);
  if (params.ret) qs.set('return', params.ret);
  try {
    const res = await fetch(`/api/logistics/trips/${slug}?${qs}`, {
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as LogisticsPlan;
  } catch {
    // Мягкая деградация: раздел просто не покажет данных, страница цела.
    return null;
  }
}

export const TRANSPORT_LABEL: Record<TransportKind, { icon: string; name: string }> = {
  HIGH_SPEED_RAIL: { icon: '🚄', name: 'Скоростной поезд' },
  TRAIN: { icon: '🚂', name: 'Поезд' },
  BUS: { icon: '🚌', name: 'Автобус' },
  FLIGHT: { icon: '✈', name: 'Самолёт' },
  CAR: { icon: '🚗', name: 'Автомобиль' },
  TAXI: { icon: '🚕', name: 'Такси' },
  TRANSFER: { icon: '🚐', name: 'Трансфер' },
  FERRY: { icon: '⛴', name: 'Паром' },
};

export const COMFORT_LABEL: Record<Comfort, string> = {
  HIGH: 'высокий комфорт',
  MEDIUM: 'средний комфорт',
  BASIC: 'без изысков',
};
