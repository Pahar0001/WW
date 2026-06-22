// Transparent budget ESTIMATOR.
//
// It does NOT fetch market prices (that needs a paid provider API — and inventing
// prices is forbidden by the Real Data Policy). Instead it distributes a stated
// budget envelope across categories using documented, adjustable percentages.
// Every produced line is flagged dataStatus = ESTIMATED with source
// "estimate-from-envelope" so the UI shows it as an estimate, never a quote.

import { BudgetCategory, DataStatus, Pace } from '@prisma/client';

// Base allocation of the total budget (sums to 1.0). These are editable defaults,
// not sourced facts.
const BASE_ALLOCATION: Record<BudgetCategory, number> = {
  FLIGHTS: 0.3,
  HOTELS: 0.27,
  TRANSPORT: 0.13,
  FOOD: 0.13,
  ACTIVITIES: 0.1,
  RESERVE: 0.07,
};

// Pace tilts the mix slightly: a calmer trip spends a bit more on comfort/hotels,
// an active trip more on transport/activities.
const PACE_TILT: Record<Pace, Partial<Record<BudgetCategory, number>>> = {
  CALM: { HOTELS: +0.03, ACTIVITIES: -0.02, TRANSPORT: -0.01 },
  BALANCED: {},
  ACTIVE: { ACTIVITIES: +0.03, TRANSPORT: +0.02, HOTELS: -0.05 },
};

export interface EstimatedLine {
  category: BudgetCategory;
  amount: number;
  dataStatus: DataStatus;
  source: string;
}

/**
 * Estimate a per-category breakdown from a [min,max] envelope.
 * Uses the midpoint as the planning total. Rounds to the nearest 500 ₽.
 */
export function estimateBudget(
  minRub: number | null | undefined,
  maxRub: number | null | undefined,
  pace: Pace,
): EstimatedLine[] | null {
  if (minRub == null && maxRub == null) return null;
  const lo = minRub ?? maxRub!;
  const hi = maxRub ?? minRub!;
  const total = Math.round((lo + hi) / 2);

  const tilt = PACE_TILT[pace] ?? {};
  const cats = Object.keys(BASE_ALLOCATION) as BudgetCategory[];

  // Apply tilt then renormalise so the shares still sum to 1.
  const raw = cats.map((c) => Math.max(0, BASE_ALLOCATION[c] + (tilt[c] ?? 0)));
  const sum = raw.reduce((a, b) => a + b, 0);

  return cats.map((c, i) => ({
    category: c,
    amount: Math.round((total * (raw[i] / sum)) / 500) * 500,
    dataStatus: 'ESTIMATED' as DataStatus,
    source: 'estimate-from-envelope',
  }));
}
