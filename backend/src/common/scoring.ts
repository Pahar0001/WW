// Pure, testable travel-scoring logic. No data is invented here — these are
// transparent heuristics over data the caller already holds. Every output is an
// ESTIMATED/derived index, clearly distinct from sourced facts.

export interface DayLoadInput {
  placeCount: number;
  totalDwellMin: number;
  totalTransitMin: number;
}

/**
 * Day load index 0..100. Combines number of stops, time on feet, and time in
 * transit. Tuned so a relaxed day (~2 stops, short transit) lands low and a
 * packed day (5+ stops, long transit) lands high.
 */
export function dayLoadIndex(d: DayLoadInput): number {
  const stops = Math.min(d.placeCount / 6, 1) * 45; // up to 45 pts
  const dwell = Math.min(d.totalDwellMin / 480, 1) * 25; // up to 25 pts (8h)
  const transit = Math.min(d.totalTransitMin / 360, 1) * 30; // up to 30 pts (6h)
  return Math.round(stops + dwell + transit);
}

export interface VariantLoad {
  perDay: number[];
  average: number;
  peak: number;
  tiringDays: number[]; // 1-based day numbers above the comfort threshold
}

export const COMFORT_THRESHOLD = 70;

export function variantLoad(perDayLoad: number[]): VariantLoad {
  const average =
    perDayLoad.length === 0
      ? 0
      : Math.round(perDayLoad.reduce((a, b) => a + b, 0) / perDayLoad.length);
  const peak = perDayLoad.length ? Math.max(...perDayLoad) : 0;
  const tiringDays = perDayLoad
    .map((v, i) => ({ v, day: i + 1 }))
    .filter((x) => x.v > COMFORT_THRESHOLD)
    .map((x) => x.day);
  return { perDay: perDayLoad, average, peak, tiringDays };
}

export type RelaxationVerdict =
  | { kind: 'ok'; message: string }
  | { kind: 'too-heavy'; message: string; tiringDays: number[] }
  | { kind: 'too-empty'; message: string };

/** "Relaxation mode" decision: suggest calming or enriching a variant. */
export function relaxationVerdict(load: VariantLoad): RelaxationVerdict {
  if (load.tiringDays.length >= 3 || load.peak >= 90) {
    return {
      kind: 'too-heavy',
      message:
        'Несколько дней перегружены. Рекомендуем более спокойную версию: ' +
        'сократить число объектов и добавить день отдыха.',
      tiringDays: load.tiringDays,
    };
  }
  if (load.average <= 25) {
    return {
      kind: 'too-empty',
      message:
        'Маршрут довольно пустой. Можно усилить: добавить смотровые точки ' +
        'или ещё один город без потери комфорта.',
    };
  }
  return { kind: 'ok', message: 'Нагрузка сбалансирована.' };
}

export interface ScoreInputs {
  comfort: number;
  beauty: number;
  history: number;
  load: number; // higher = more tiring (penalised)
  valueRatio: number;
  uniqueness: number;
  nature: number;
}

/** Weighted overall rating 0..100. Load reduces the score. */
export function overallScore(s: ScoreInputs): number {
  const weights = {
    comfort: 0.18,
    beauty: 0.2,
    history: 0.12,
    valueRatio: 0.15,
    uniqueness: 0.15,
    nature: 0.2,
  };
  const positive =
    s.comfort * weights.comfort +
    s.beauty * weights.beauty +
    s.history * weights.history +
    s.valueRatio * weights.valueRatio +
    s.uniqueness * weights.uniqueness +
    s.nature * weights.nature;
  const loadPenalty = (s.load / 100) * 12; // up to -12
  return Math.max(0, Math.min(100, Math.round(positive - loadPenalty)));
}
