'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { clamp, damp, isFinePointer, onFrame, prefersReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/cn';

/**
 * Поверхность с 3D-наклоном, следящим блеском и «дыханием».
 *
 * Что происходит:
 *  • наклон по курсору (rotateX/rotateY) — объект будто лежит под стеклом;
 *  • блик (spotlight) движется в противоход наклону: источник света остаётся на
 *    месте, поворачивается поверхность — только так наклон читается как
 *    физический, а не как «дёрганый div»;
 *  • idle-floating: медленная синусоида ±2px со своей фазой у каждого
 *    экземпляра. Одинаковая фаза у сетки карточек выглядит как рябь на воде,
 *    поэтому фаза разводится по порядку монтирования;
 *  • всё считается в общем тикере и пишется в CSS-переменные — сам transform
 *    остаётся в CSS (.tilt-3d), то есть на GPU.
 *
 * Выключается на тач-устройствах и при prefers-reduced-motion: наклон без
 * курсора бессмысленен, а лишнее движение — вредно.
 *
 * API — хук, а не только обёртка: карточки живут в grid/flex, и лишний div
 * вокруг них ломал бы растяжение элемента сетки. Хук вешает поведение прямо
 * на существующий узел.
 */

export type TiltOptions = {
  /** Максимальный угол наклона, градусы. 6–10 — премиально, больше — аттракцион. */
  max?: number;
  /** Амплитуда «дыхания», px. 0 — выключить. */
  float?: number;
  /** Радиус блика, px. */
  spotSize?: number;
  /** Дополнительный подъём при наведении, px. */
  lift?: number;
  /** Инвертировать наклон (поверхность отклоняется от курсора). */
  invert?: boolean;
  enabled?: boolean;
};

// Разводка фаз плавания. Считается на клиенте при монтировании, поэтому на
// SSR-разметку не влияет (гидратация не расходится).
let phaseSeed = 0;

/** Классы, которые обязан нести узел с наклоном. */
export const TILT_CLASS = 'tilt-3d spotlight';

export function useTilt<T extends HTMLElement>({
  max = 7,
  float = 2,
  spotSize = 320,
  lift = 0,
  invert = false,
  enabled = true,
}: TiltOptions = {}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    el.style.setProperty('--spot-size', `${spotSize}px`);

    if (!isFinePointer() || prefersReducedMotion()) return;

    const phase = (phaseSeed++ % 8) * 0.785; // 8 фаз по π/4
    const sign = invert ? -1 : 1;

    const target = { x: 0, y: 0, hover: 0 };
    const cur = { x: 0, y: 0, hover: 0, spotX: 50, spotY: 50 };
    let visible = false;
    let hovering = false;

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, {
      rootMargin: '10% 0px',
    });
    io.observe(el);

    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      // rect читается только на движении внутри карточки — это редкие события,
      // а не горячий цикл, layout thrash не возникает.
      const nx = clamp((e.clientX - r.left) / r.width, 0, 1);
      const ny = clamp((e.clientY - r.top) / r.height, 0, 1);
      target.x = (nx - 0.5) * 2;
      target.y = (ny - 0.5) * 2;
      cur.spotX = nx * 100;
      cur.spotY = ny * 100;
    };
    const onEnter = () => { hovering = true; target.hover = 1; };
    const onLeave = () => {
      hovering = false;
      target.hover = 0;
      target.x = 0;
      target.y = 0;
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);

    const off = onFrame(({ t, dt }) => {
      if (!visible) return;
      // Вход быстрее, возврат медленнее: «отпустил» должно читаться как
      // расслабление пружины, а не как отмена анимации.
      const lambda = hovering ? 12 : 6;
      cur.x = damp(cur.x, target.x, lambda, dt);
      cur.y = damp(cur.y, target.y, lambda, dt);
      cur.hover = damp(cur.hover, target.hover, 10, dt);

      const breathe = float ? Math.sin(t * 0.62 + phase) * float : 0;

      el.style.setProperty('--tilt-y', `${(cur.x * max * sign).toFixed(3)}deg`);
      el.style.setProperty('--tilt-x', `${(-cur.y * max * sign).toFixed(3)}deg`);
      el.style.setProperty('--tilt-lift', `${(breathe - cur.hover * lift).toFixed(2)}px`);
      el.style.setProperty('--spot-x', `${(cur.spotX - cur.x * 8).toFixed(2)}%`);
      el.style.setProperty('--spot-y', `${(cur.spotY - cur.y * 8).toFixed(2)}%`);
      el.style.setProperty('--spot-opacity', cur.hover.toFixed(3));
    });

    return () => {
      io.disconnect();
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      off();
    };
  }, [max, float, spotSize, lift, invert, enabled]);

  return ref;
}

/** Готовая обёртка для случаев, когда лишний узел не мешает разметке. */
export function Tilt({
  children,
  className,
  ...opts
}: TiltOptions & { children: ReactNode; className?: string }) {
  const ref = useTilt<HTMLDivElement>(opts);
  return (
    <div ref={ref} className={cn(TILT_CLASS, className)}>
      {children}
    </div>
  );
}
