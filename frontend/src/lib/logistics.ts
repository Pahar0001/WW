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

export interface Airport {
  iata: string;
  name: string;
  city: string;
  distanceKm?: number;
  toCity?: string;
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

export interface StayOption {
  title: string;
  reason: string;
  links: { label: string; href: string }[];
}

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
