'use client';

import { useEffect, useRef } from 'react';

/**
 * Site-wide atmosphere:
 *  • film grain overlay (subtle "expensive" texture),
 *  • scroll-progress bar,
 *  • magnetic pull on any [data-magnetic] element (revives existing hooks).
 * All effects are disabled for reduced-motion / touch where appropriate.
 */
export function Atmosphere() {
  const barRef = useRef<HTMLDivElement>(null);

  // Scroll progress
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    let raf = 0;
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      const p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
      bar.style.transform = `scaleX(${p})`;
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Magnetic buttons via delegation on [data-magnetic]
  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;

    let active: HTMLElement | null = null;
    const reset = (el: HTMLElement) => {
      el.style.transform = '';
    };
    const onMove = (e: MouseEvent) => {
      const el = (e.target as HTMLElement)?.closest?.('[data-magnetic]') as HTMLElement | null;
      if (el !== active) {
        if (active) reset(active);
        active = el;
        if (el) {
          el.style.transition = 'transform 0.35s cubic-bezier(0.22,1,0.36,1)';
          el.style.willChange = 'transform';
        }
      }
      if (el) {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${mx * 0.22}px, ${my * 0.22}px)`;
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (active) reset(active);
    };
  }, []);

  return (
    <>
      <div ref={barRef} className="scroll-progress" style={{ transform: 'scaleX(0)' }} aria-hidden />
      <div className="grain-overlay" aria-hidden />
    </>
  );
}
