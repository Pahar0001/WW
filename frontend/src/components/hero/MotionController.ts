/**
 * MotionController — единственный источник правды для всех производных
 * анимаций hero. Чистые функции: прогресс 0..1 на входе → набор значений
 * на выходе. Ни DOM, ни состояния — легко тестировать и настраивать.
 *
 * Хронология таймлайна (доли прогресса — «ручки» дизайнера):
 *   0.00–0.10  титры входят (двигаются вверх, проявляются)
 *   0.10–0.78  чистый полёт: интерфейс почти прозрачен, работает видео
 *   0.78–0.92  титры уходят, появляется подпись следующей главы
 *   0.90–1.00  «выход»: кадр плавно растворяется в фон следующей секции —
 *              переход ощущается продолжением путешествия, а не обрывом.
 */

export interface HeroMotion {
  /** Прозрачность и сдвиг заглавного блока. */
  titleOpacity: number;
  titleY: number; // px
  /** Подсказка «листайте» — видна только в самом начале. */
  hintOpacity: number;
  /** Лёгкий «дыхательный» масштаб видео: 1.06 → 1.0 за весь полёт. */
  videoScale: number;
  /** Слой-занавес перехода к следующей секции (0 — нет, 1 — полностью). */
  exitOpacity: number;
  /** Подпись финала («полёт продолжается ниже»). */
  outroOpacity: number;
  /** Тонкая линия-прогресс таймлайна. */
  timeline: number;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Нормализация отрезка [a..b] → 0..1. */
const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
/** Кубический ease-in-out — «дорогая» кривая без резких стартов. */
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function computeMotion(p: number): HeroMotion {
  const enter = ease(span(p, 0, 0.1)); // вход титров
  const leave = ease(span(p, 0.78, 0.92)); // уход титров
  const exit = ease(span(p, 0.9, 1)); // растворение кадра

  return {
    titleOpacity: enter * (1 - leave),
    titleY: (1 - enter) * 28 + leave * -36,
    hintOpacity: (1 - ease(span(p, 0.04, 0.14))) * enter,
    videoScale: 1.06 - 0.06 * ease(span(p, 0, 1)),
    exitOpacity: exit,
    outroOpacity: ease(span(p, 0.84, 0.94)) * (1 - ease(span(p, 0.97, 1))),
    timeline: p,
  };
}
