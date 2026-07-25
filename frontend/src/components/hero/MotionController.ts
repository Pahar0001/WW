/**
 * MotionController — единственный источник правды для всех производных
 * анимаций hero. Чистые функции: прогресс 0..1 на входе → набор значений
 * на выходе. Ни DOM, ни состояния — легко тестировать и настраивать.
 *
 * Хронология таймлайна (доли прогресса — «ручки» дизайнера):
 *   0.00–0.20  заглавный блок + CTA
 *   0.24–0.86  ГЛАВЫ: по ходу полёта сменяются информационные блоки
 *              (что такое Vela) — скролл рассказывает историю, а не пустует
 *   0.88–0.985 оутро «путешествие продолжается ниже»
 *   0.93–1.00  «выход»: кадр растворяется в фон следующей секции.
 */

export interface PhaseState {
  opacity: number;
  y: number; // px сдвиг (входит снизу, уходит вверх)
}

export interface HeroMotion {
  /** Заглавный блок (титул + CTA). */
  title: PhaseState;
  /** Подсказка «листайте» — видна только в самом начале. */
  hintOpacity: number;
  /** Лёгкий «дыхательный» масштаб видео: 1.06 → 1.0 за весь полёт. */
  videoScale: number;
  /** Слой-занавес перехода к следующей секции (0 — нет, 1 — полностью). */
  exitOpacity: number;
  /** Подпись финала. */
  outro: PhaseState;
  /** Тонкая линия-прогресс таймлайна. */
  timeline: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Нормализация отрезка [a..b] → 0..1. */
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
/** Кубический ease-in-out — «дорогая» кривая без резких стартов. */
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Состояние «фазы» (главы) с окном жизни [from..to]:
 * плавный вход на первых fade долях окна и уход на последних.
 */
export function phase(p: number, from: number, to: number, fade = 0.22): PhaseState {
  const len = to - from;
  const enter = ease(span(p, from, from + len * fade));
  const leave = ease(span(p, to - len * fade, to));
  return {
    opacity: enter * (1 - leave),
    y: (1 - enter) * 26 + leave * -30,
  };
}

/** Окна жизни глав — правится дизайнером в одном месте. */
export const TITLE_WINDOW: [number, number] = [0, 0.22];
export const CHAPTER_WINDOWS: [number, number][] = [
  [0.24, 0.46],
  [0.5, 0.7],
  [0.73, 0.88],
];
export const OUTRO_WINDOW: [number, number] = [0.89, 0.985];

/**
 * Прогресс прорисовки «нити маршрута» (0..1): линия начинает тянуться чуть
 * раньше первой главы и дорисовывается к последней — главы как узлы на пути.
 */
export function chainProgress(p: number): number {
  return ease(span(p, 0.14, 0.82));
}

/** Доли длины нити, на которых стоят узлы-главы (подобраны под путь). */
export const CHAIN_NODES = [0.22, 0.72, 0.97];

export function computeMotion(p: number): HeroMotion {
  // Титул виден с самого нуля (окно [0..x] → enter уже завершён на p=0).
  const t = phase(p, -0.12, TITLE_WINDOW[1], 0.3);
  return {
    title: p < 0.001 ? { opacity: 1, y: 0 } : t,
    hintOpacity: 1 - ease(span(p, 0.02, 0.1)),
    videoScale: 1.06 - 0.06 * ease(span(p, 0, 1)),
    exitOpacity: ease(span(p, 0.93, 1)),
    outro: phase(p, OUTRO_WINDOW[0], OUTRO_WINDOW[1], 0.3),
    timeline: p,
  };
}
