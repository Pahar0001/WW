'use client';

import { useEffect, useRef } from 'react';
import { clamp, damp, isFinePointer, onFrame, prefersReducedMotion } from '@/lib/motion';

/**
 * Сквозная атмосфера сайта:
 *  • плёночное зерно,
 *  • индикатор прокрутки (яркость реагирует на скорость),
 *  • магнитное притяжение любого [data-magnetic] к курсору.
 *
 * Магнит переписан с CSS-переходов на пружину в общем тикере: transition
 * «догоняет» цель с постоянной задержкой и на быстрых движениях ощущается
 * резиновым. Пружина же даёт вес — элемент тянется, слегка доворачивается
 * и мягко возвращается.
 *
 * Один inline-transform на элемент собирает всё сразу (сдвиг + доворот +
 * подъём + нажатие): inline-стиль перекрывает Tailwind-утилиты
 * hover:-translate-y / active:scale, поэтому их эффект воспроизводится здесь,
 * иначе магнитные кнопки теряли бы отклик на наведение и нажатие.
 */
export function Atmosphere() {
  const barRef = useRef<HTMLDivElement>(null);

  // ── Индикатор прокрутки ──
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let shown = 0;
    return onFrame(({ page, vy, dt }) => {
      shown = damp(shown, page, 18, dt);
      bar.style.transform = `scaleX(${shown.toFixed(4)})`;
      // На быстрой прокрутке нить наливается светом — обратная связь без HUD.
      const heat = clamp(Math.abs(vy) / 2200);
      bar.style.filter = `brightness(${(1 + heat * 0.8).toFixed(2)})`;
      bar.style.height = `${(2 + heat * 1.6).toFixed(2)}px`;
    });
  }, []);

  // ── Магнитные элементы ──
  useEffect(() => {
    if (!isFinePointer() || prefersReducedMotion()) return;

    type Live = {
      el: HTMLElement;
      tx: number; ty: number;           // цель
      x: number; y: number;             // текущее
      hover: number; press: number;     // 0..1
      hoverTarget: number; pressTarget: number;
    };

    let live: Live | null = null;
    const STRENGTH = 0.16;
    const MAX = 12; // px — дальше элемент отрывается от своего места

    const reset = (l: Live) => {
      l.el.style.transform = '';
      l.el.style.willChange = '';
    };

    const onMove = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('[data-magnetic]') as HTMLElement | null;

      if (el !== live?.el) {
        if (live) reset(live);
        live = el
          ? { el, tx: 0, ty: 0, x: 0, y: 0, hover: 0, press: 0, hoverTarget: 1, pressTarget: 0 }
          : null;
        if (live) live.el.style.willChange = 'transform';
      }
      if (!live) return;

      const r = live.el.getBoundingClientRect();
      live.tx = clamp((e.clientX - (r.left + r.width / 2)) * STRENGTH, -MAX, MAX);
      live.ty = clamp((e.clientY - (r.top + r.height / 2)) * STRENGTH, -MAX, MAX);
      live.hoverTarget = 1;
    };

    const onDown = () => { if (live) live.pressTarget = 1; };
    const onUp = () => { if (live) live.pressTarget = 0; };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown, { passive: true });
    window.addEventListener('mouseup', onUp, { passive: true });

    const off = onFrame(({ dt }) => {
      const l = live;
      if (!l) return;
      l.x = damp(l.x, l.tx, 16, dt);
      l.y = damp(l.y, l.ty, 16, dt);
      l.hover = damp(l.hover, l.hoverTarget, 12, dt);
      l.press = damp(l.press, l.pressTarget, 26, dt);

      // Доворот пропорционален горизонтальному смещению: 12px → ~1.1°.
      // Больше выглядит как поломанная вёрстка, меньше — не читается.
      const rot = (l.x / MAX) * 1.1;
      const lift = -2 * l.hover;
      const scale = 1 - 0.025 * l.press;
      l.el.style.transform =
        `translate3d(${l.x.toFixed(2)}px, ${(l.y + lift).toFixed(2)}px, 0) ` +
        `rotate(${rot.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
    });

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      off();
      if (live) reset(live);
    };
  }, []);

  return (
    <>
      <div ref={barRef} className="scroll-progress" style={{ transform: 'scaleX(0)' }} aria-hidden />
      <div className="grain-overlay" aria-hidden />
    </>
  );
}
