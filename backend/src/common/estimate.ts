// Transparent TRIP SPEND ESTIMATOR (per-trip "примерные траты").
//
// Goal: give every trip an automatic, ballpark cost estimate from the *minimum*
// possible input — just the trip's duration, how many cities it visits, the
// number of travellers and a comfort tier. It does NOT fetch live market prices
// (that needs a paid provider and inventing prices is forbidden by the Real Data
// Policy). Instead it applies documented, adjustable per-day baseline rates and
// labels every figure dataStatus = ESTIMATED.
//
// ── Algorithm ──────────────────────────────────────────────────────────────
//   INPUT  : durationDays, cities, travelers, comfort
//   DERIVED: nights    = max(0, durationDays - 1)
//            days      = max(1, durationDays)
//            transfers = max(0, cities - 1)        // inter-city movements
//   PER PERSON (RUB):
//            HOTELS     = rate.lodging        × nights
//            FOOD       = rate.food           × days
//            TRANSPORT  = rate.localTransport × days + rate.intercity × transfers
//            ACTIVITIES = rate.activities     × days
//            RESERVE    = 10 % of the subtotal above (contingency buffer)
//   OUTPUT : per-category amounts, per-person total and a ±band (low/high),
//            plus the group total (× travelers). Currency RUB.
//
// All amounts are rounded to the nearest 100 ₽ — these are estimates, not quotes.

import { BudgetCategory, DataStatus } from '@prisma/client';

export type Comfort = 'BUDGET' | 'STANDARD' | 'COMFORT';

// Baseline per-person rates (RUB). Documented planning assumptions, not sourced
// facts — kept here so they are easy to review and tune in one place.
//  · lodging        — per night (assumes a shared/double room, already per person)
//  · food           — per day
//  · localTransport — per day (city transit, taxis)
//  · activities     — per day (entries, excursions)
//  · intercity      — per inter-city transfer (train/bus/flight between bases)
const RATES: Record<Comfort, {
  lodging: number;
  food: number;
  localTransport: number;
  activities: number;
  intercity: number;
}> = {
  BUDGET:   { lodging: 2000, food: 1000, localTransport: 400,  activities: 700,  intercity: 2000 },
  STANDARD: { lodging: 4500, food: 2000, localTransport: 800,  activities: 1500, intercity: 4000 },
  COMFORT:  { lodging: 9000, food: 4000, localTransport: 1600, activities: 3000, intercity: 8000 },
};

const RESERVE_RATE = 0.1;   // 10 % contingency buffer
const BAND = 0.18;          // ±18 % uncertainty band around the point estimate

const round100 = (n: number) => Math.round(n / 100) * 100;

export interface EstimateInput {
  durationDays: number;
  cities: number;
  travelers: number;
  comfort: Comfort;
}

export interface SpendEstimate {
  currency: 'RUB';
  comfort: Comfort;
  travelers: number;
  durationDays: number;
  nights: number;
  cities: number;
  transfers: number;
  perPerson: {
    categories: { category: BudgetCategory; amount: number }[];
    total: number;
    low: number;
    high: number;
  };
  group: { total: number; low: number; high: number };
  dataStatus: DataStatus; // always ESTIMATED
  assumptions: {
    note: string;
    ratesPerPerson: (typeof RATES)[Comfort];
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

  const nights = Math.max(0, durationDays - 1);
  const days = durationDays;
  const transfers = Math.max(0, cities - 1);
  const r = RATES[comfort];

  const hotels = r.lodging * nights;
  const food = r.food * days;
  const transport = r.localTransport * days + r.intercity * transfers;
  const activities = r.activities * days;
  const subtotal = hotels + food + transport + activities;
  const reserve = subtotal * RESERVE_RATE;

  const categories: { category: BudgetCategory; amount: number }[] = [
    { category: 'HOTELS', amount: round100(hotels) },
    { category: 'FOOD', amount: round100(food) },
    { category: 'TRANSPORT', amount: round100(transport) },
    { category: 'ACTIVITIES', amount: round100(activities) },
    { category: 'RESERVE', amount: round100(reserve) },
  ];

  const perPersonTotal = round100(subtotal + reserve);
  const perPersonLow = round100(perPersonTotal * (1 - BAND));
  const perPersonHigh = round100(perPersonTotal * (1 + BAND));

  return {
    currency: 'RUB',
    comfort,
    travelers,
    durationDays,
    nights,
    cities,
    transfers,
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
      note: 'Оценка по типовым дневным ставкам на человека, не котировка поставщиков.',
      ratesPerPerson: r,
      reserveRate: RESERVE_RATE,
      band: BAND,
    },
  };
}
