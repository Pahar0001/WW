/**
 * ColorGrading — киношный грейдинг «старой полиграфии» через SVG-фильтр.
 *
 * Это НЕ готовый CSS-filter (sepia/contrast), а собственный фильтр-граф:
 *   1. feColorMatrix saturate       — приглушаем насыщенность (выцветание);
 *   2. feComponentTransfer (linear) — приподнимаем чёрную точку и чуть
 *      опускаем белую: «молочные» тени типографской печати, ничего не
 *      проваливается в чистый чёрный;
 *   3. feColorMatrix matrix         — тёплый сдвиг каналов: бумага желтит
 *      света и слегка глушит синеву (классика газетной репродукции).
 *
 * Фильтр применяется к <video> одной строкой: filter: url(#vela-grade) —
 * весь граф исполняется на GPU композитора, по стоимости это один проход.
 *
 * ── Ручки для дизайнера ──────────────────────────────────────────────────
 *  SATURATION 0..1   — сколько цвета оставить (0.8 = лёгкое выцветание)
 *  BLACK_LIFT 0..0.1 — насколько «молочные» тени
 *  WHITE_DROP 0..0.1 — насколько притушены света
 *  WARMTH     0..0.1 — сила тёплого (бумажного) тона
 * Для других стилей (VHS, плёнка, CRT) меняются только эти числа и матрица —
 * см. комментарий к buildGradeSvg.
 */

export const GRADE_FILTER_ID = 'vela-grade';

const SATURATION = 0.8;
const BLACK_LIFT = 0.045;
const WHITE_DROP = 0.03;
const WARMTH = 0.045;

/** slope/intercept для feFuncX: y = slope·x + intercept. */
const slope = (1 - WHITE_DROP - BLACK_LIFT).toFixed(4);

/**
 * Возвращает разметку <svg> с фильтром. Вставляется один раз (скрытый svg
 * нулевого размера) — дальше на него ссылаются через url(#vela-grade).
 * Хотите другой стиль? Примеры матриц:
 *  - VHS:  saturate 1.15 + сдвиг каналов R/B в разные стороны (chroma bleed);
 *  - CRT:  зелёный буст + сильный BLACK_LIFT;
 *  - плёнка: saturate 0.9, тёплые света + холодные тени (split-toning двумя
 *    feComponentTransfer с feBlend).
 */
export function buildGradeSvg(): string {
  return `
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <filter id="${GRADE_FILTER_ID}" color-interpolation-filters="sRGB">
    <feColorMatrix type="saturate" values="${SATURATION}" />
    <feComponentTransfer>
      <feFuncR type="linear" slope="${slope}" intercept="${(BLACK_LIFT + WARMTH).toFixed(4)}" />
      <feFuncG type="linear" slope="${slope}" intercept="${(BLACK_LIFT + WARMTH * 0.55).toFixed(4)}" />
      <feFuncB type="linear" slope="${slope}" intercept="${BLACK_LIFT.toFixed(4)}" />
    </feComponentTransfer>
    <feColorMatrix type="matrix" values="
      1      0      0      0  0
      0      0.985  0      0  0
      0      0      ${(1 - WARMTH * 1.4).toFixed(4)} 0  0
      0      0      0      1  0" />
  </filter>
</svg>`;
}
