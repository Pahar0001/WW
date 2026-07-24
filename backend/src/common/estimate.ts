// Transparent TRIP SPEND ESTIMATOR (per-trip "примерные траты").
//
// Goal: give every trip an automatic, ballpark cost estimate from the *minimum*
// possible input — the trip's duration, how many cities it visits, the number
// of travellers, a comfort tier and (optionally) a REAL flight quote from the
// travel module. Inventing prices is forbidden by the Real Data Policy, so:
//   · базовые ставки заданы для уровня ЭКОНОМ и документированы ниже;
//   · «Стандарт» и «Комфорт» — это ИНДЕКСАЦИЯ базы (×1.8 / ×3.2), а не
//     отдельные выдуманные цифры;
//   · перелёт добавляется ТОЛЬКО если передана реальная котировка (Aviasales,
//     блок «Перелёт и даты»); без неё строка FLIGHTS остаётся PENDING.
//
// ── Алгоритм ───────────────────────────────────────────────────────────────
//   INPUT  : durationDays, cities, travelers, comfort, flightRub?
//   DERIVED: nights    = max(0, durationDays - 1)
//            days      = max(1, durationDays)
//            transfers = max(0, cities - 1)        // переезды между городами
//   БАЗА (ЭКОНОМ), НА ЧЕЛОВЕКА (RUB):
//            HOTELS      = lodging        × nights        // отель (эконом)
//            FOOD        = subsistence    × days          // «прожиточный минимум» поездки
//            TRANSPORT   = localTransport × days + intercity × transfers
//            ACTIVITIES  = activities     × days
//   ИНДЕКС : все категории выше × COMFORT_INDEX[comfort]
//   FLIGHTS = реальная котировка (если передана), НЕ индексируется
//   RESERVE = 10 % от суммы наземных категорий
//   OUTPUT : категории, итог на человека ±диапазон, итог на группу
//
// All amounts are rounded to the nearest 100 ₽ — these are estimates, not quotes.

import { BudgetCategory, DataStatus } from '@prisma/client';

export type Comfort = 'BUDGET' | 'STANDARD' | 'COMFORT';

// Базовые ставки уровня ЭКОНОМ, на человека (RUB). Документированные плановые
// допущения (не «сорсированные» цены) — держим в одном месте для ревизии.
//  · lodging        — ночь в эконом-отеле/хостеле (двухместное размещение, на человека)
//  · subsistence    — «прожиточный минимум» дня поездки: еда + базовые мелочи
//  · localTransport — городской транспорт в день
//  · activities     — входные билеты/развлечения в день
//  · intercity      — один переезд между городами маршрута (автобус/поезд эконом)
const BASE_RATES = {
  lodging: 2000,
  subsistence: 1200,
  localTransport: 400,
  activities: 700,
  intercity: 2000,
};

// Индексация базы «эконом»: стандарт и комфорт — множители, не отдельные цифры.
export const COMFORT_INDEX: Record<Comfort, number> = {
  BUDGET: 1,
  STANDARD: 1.8,
  COMFORT: 3.2,
};

const RESERVE_RATE = 0.1;   // 10 % contingency buffer
const BAND = 0.18;          // ±18 % uncertainty band around the point estimate

const round100 = (n: number) => Math.round(n / 100) * 100;

export interface EstimateInput {
  durationDays: number;
  cities: number;
  travelers: number;
  comfort: Comfort;
  /** Реальная цена билетов туда-обратно на человека (Aviasales) — опционально. */
  flightRub?: number | null;
}

export interface SpendEstimate {
  currency: 'RUB';
  comfort: Comfort;
  comfortIndex: number;
  travelers: number;
  durationDays: number;
  nights: number;
  cities: number;
  transfers: number;
  /** Реальный перелёт, если котировка была передана (VERIFIED), иначе null. */
  flight: { perPerson: number; source: 'aviasales'; dataStatus: DataStatus } | null;
  perPerson: {
    categories: { category: BudgetCategory; amount: number | null; dataStatus: DataStatus }[];
    total: number;
    low: number;
    high: number;
  };
  group: { total: number; low: number; high: number };
  dataStatus: DataStatus; // итог всегда помечен ESTIMATED (наземная часть — оценка)
  assumptions: {
    note: string;
    baseRatesEconomy: typeof BASE_RATES;
    comfortIndex: number;
    reserveRate: number;
    band: number;
  };
}

/** Compute a ballpark spend estimate from minimal trip inputs. Pure function. */
export function estimateTripSpend(input: EstimateInput): SpendEstimate {
  const comfort: Comfort = (['BUDGET', 'STANDARD', 'COMFORT'] as Comfort[]).includes(input.comfort)
    ? input.comfort
    : 'STANDARD';
  const travelers = Math.min(20, Math.max(1, Math.round(input.travelers || 1)));
  const durationDays = Math.max(1, Math.round(input.durationDays || 1));
  const cities = Math.max(1, Math.round(input.cities || 1));
  const flightRub =
    input.flightRub != null && Number.isFinite(input.flightRub) && input.flightRub > 0
      ? Math.round(input.flightRub)
      : null;

  const nights = Math.max(0, durationDays - 1);
  const days = durationDays;
  const transfers = Math.max(0, cities - 1);
  const k = COMFORT_INDEX[comfort];

  // Наземные категории: база «эконом» × индекс комфорта.
  const hotels = BASE_RATES.lodging * nights * k;
  const food = BASE_RATES.subsistence * days * k;
  const transport = (BASE_RATES.localTransport * days + BASE_RATES.intercity * transfers) * k;
  const activities = BASE_RATES.activities * days * k;
  const groundSubtotal = hotels + food + transport + activities;
  const reserve = groundSubtotal * RESERVE_RATE;

  const categories: SpendEstimate['perPerson']['categories'] = [
    // Перелёт: только реальная котировка; без неё честный PENDING (не выдумываем).
    { category: 'FLIGHTS', amount: flightRub, dataStatus: flightRub != null ? 'VERIFIED' : 'PENDING' },
    { category: 'HOTELS', amount: round100(hotels), dataStatus: 'ESTIMATED' },
    { category: 'FOOD', amount: round100(food), dataStatus: 'ESTIMATED' },
    { category: 'TRANSPORT', amount: round100(transport), dataStatus: 'ESTIMATED' },
    { category: 'ACTIVITIES', amount: round100(activities), dataStatus: 'ESTIMATED' },
    { category: 'RESERVE', amount: round100(reserve), dataStatus: 'ESTIMATED' },
  ];

  // Диапазон неопределённости применяем только к оценочной (наземной) части —
  // реальная цена билетов не «плавает» в расчёте.
  const groundTotal = groundSubtotal + reserve;
  const perPersonTotal = round100(groundTotal + (flightRub ?? 0));
  const perPersonLow = round100(groundTotal * (1 - BAND) + (flightRub ?? 0));
  const perPersonHigh = round100(groundTotal * (1 + BAND) + (flightRub ?? 0));

  return {
    currency: 'RUB',
    comfort,
    comfortIndex: k,
    travelers,
    durationDays,
    nights,
    cities,
    transfers,
    flight: flightRub != null ? { perPerson: flightRub, source: 'aviasales', dataStatus: 'VERIFIED' } : null,
    perPerson: {
      categories,
      total: perPersonTotal,
      low: perPersonLow,
      high: perPersonHigh,
    },
    group: {
      total: perPersonTotal * travelers,
      low: perPersonLow * travelers,
      high: perPersonHigh * travelers,
    },
    dataStatus: 'ESTIMATED',
    assumptions: {
      note:
        'База — уровень «Эконом» (отель + прожиточный минимум дня + транспорт + развлечения); ' +
        '«Стандарт» и «Комфорт» — индексация базы. Перелёт — только реальная котировка Aviasales.',
      baseRatesEconomy: BASE_RATES,
      comfortIndex: k,
      reserveRate: RESERVE_RATE,
      band: BAND,
    },
  };
}
