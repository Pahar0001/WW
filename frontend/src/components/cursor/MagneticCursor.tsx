'use client';

import { useEffect, useRef } from 'react';

/**
 * Vela signature cursor.
 * - Two elements: a precise dot and a trailing ring with eased follow (lerp).
 * - Magnetic attraction: when near an element marked [data-magnetic], the ring
 *   is pulled toward the element's center and expands.
 * - Hover growth on [data-cursor="hover"], map/card aware via data attributes.
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

      // Magnetic pull toward the nearest magnetic element under/near the pointer.
      const el = document
        .elementFromPoint(e.clientX, e.clientY)
        ?.closest<HTMLElement>('[data-magnetic]');
      if (el) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        // Pull the perceived target 35% toward the element center.
        mouseX = e.clientX + (cx - e.clientX) * 0.35;
        mouseY = e.clientY + (cy - e.clientY) * 0.35;
        targetScale = 2.6;
      } else {
        const hover = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest('[data-cursor="hover"], a, button');
        targetScale = hover ? 1.8 : 1;
      }
    };

    const tick = () => {
      // Eased follow for the ring; the dot tracks the raw pointer 1:1.
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      scale += (targetScale - scale) * 0.15;

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
        className="vela-cursor pointer-events-none fixed left-0 top-0 z-[9999] h-9 w-9 rounded-full border border-aurora/50"
        style={{ transition: 'opacity .3s' }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="vela-cursor pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 rounded-full bg-aurora"
      />
    </>
  );
}
