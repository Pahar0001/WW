'use client';

import { useEffect, useRef } from 'react';

/**
 * Vela signature cursor — a cohesive ring with a precise center dot.
 * - The dot tracks the real pointer 1:1, so aiming/hover is always exact.
 * - The ring follows with a gentle, *tight* ease so it stays wrapped around the
 *   dot (no long trailing tail, no "losing" the pointer).
 * - Soft grow on interactive elements ([data-cursor="hover"], a, button,
 *   [data-magnetic]). No positional magnetic pull — movement reads as one unit.
 * - Disabled on touch devices and when prefers-reduced-motion is set.
 */
export function MagneticCursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduced) return;

    const dot = dotRef.current!;
    const ring = ringRef.current!;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;
    let scale = 1;
    let targetScale = 1;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      const interactive = (e.target as Element | null)?.closest?.(
        '[data-cursor="hover"], [data-magnetic], a, button, input, select, textarea, label',
      );
      targetScale = interactive ? 1.9 : 1;
    };

    const tick = () => {
      // Tight ease keeps the ring wrapped around the dot — present, not trailing.
      ringX += (mouseX - ringX) * 0.32;
      ringY += (mouseY - ringY) * 0.32;
      scale += (targetScale - scale) * 0.18;

      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${scale})`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        className="vela-cursor pointer-events-none fixed left-0 top-0 z-[9999] h-8 w-8 rounded-full border border-aurora/45 bg-aurora/5"
        style={{ transition: 'opacity .3s' }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="vela-cursor pointer-events-none fixed left-0 top-0 z-[9999] h-2 w-2 rounded-full bg-aurora"
      />
    </>
  );
}
