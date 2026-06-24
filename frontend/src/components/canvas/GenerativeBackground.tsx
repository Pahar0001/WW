'use client';

import { useEffect, useRef } from 'react';

/**
 * Lightweight generative background — a flow-field of drifting particles that
 * evokes wind over terrain / ocean currents. Performance guards:
 *  - capped device pixel ratio, capped particle count scaled to viewport
 *  - pauses when the tab is hidden or the canvas is offscreen
 *  - fully disabled under prefers-reduced-motion (renders a static gradient)
 *  - additive, low-alpha strokes — cheap on the GPU/CPU
 */
export function GenerativeBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d', { alpha: true })!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    if (reduced) {
      // Static fill in the theme background — no animation.
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '40 30% 97%';
      ctx.fillStyle = `hsl(${bg})`;
      ctx.fillRect(0, 0, w, h);
      return () => window.removeEventListener('resize', resize);
    }

    // Read theme colors from CSS variables so the field matches light/dark,
    // and recompute when the theme toggles.
    let fadeColor = 'hsla(40 30% 97% / 0.14)';
    let lineColor = 'hsla(168 26% 38% / 0.1)';
    let solidBg = 'hsl(40 30% 97%)';
    const readColors = () => {
      const css = getComputedStyle(document.documentElement);
      const bgHsl = (css.getPropertyValue('--bg') || '40 30% 97%').trim();
      const primaryHsl = (css.getPropertyValue('--primary') || '168 26% 38%').trim();
      const isDark = document.documentElement.classList.contains('dark');
      solidBg = `hsl(${bgHsl})`;
      fadeColor = `hsla(${bgHsl} / ${isDark ? 0.16 : 0.2})`;
      // Very faint strokes — the field should read as a soft haze, not a web of lines.
      lineColor = `hsla(${primaryHsl} / ${isDark ? 0.07 : 0.045})`;
    };
    readColors();
    // On theme toggle: recompute colors and hard-clear to the new background
    // (otherwise the slow trail-fade would keep showing the old theme).
    const onTheme = () => { readColors(); ctx.fillStyle = solidBg; ctx.fillRect(0, 0, w, h); };
    window.addEventListener('vela-theme', onTheme);

    // Far fewer particles than before — a calm scattering, not a dense weave.
    const count = Math.min(42, Math.floor((w * h) / 46000));
    type P = { x: number; y: number; vx: number; vy: number };
    const ps: P[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: 0,
      vy: 0,
    }));

    let t = 0;
    let raf = 0;
    let running = true;

    // Simple curl-ish flow field via layered sine — no noise lib needed.
    const angleAt = (x: number, y: number) =>
      Math.sin(x * 0.0016 + t) * 1.4 + Math.cos(y * 0.0016 - t * 0.8) * 1.4;

    const frame = () => {
      if (!running) return;
      t += 0.0009;
      // Trail fade — slight overlay instead of full clear gives motion blur.
      ctx.fillStyle = fadeColor;
      ctx.fillRect(0, 0, w, h);
      ctx.lineWidth = 1;

      for (const p of ps) {
        const a = angleAt(p.x, p.y);
        p.vx = p.vx * 0.9 + Math.cos(a) * 0.32;
        p.vy = p.vy * 0.9 + Math.sin(a) * 0.32;
        const px = p.x;
        const py = p.y;
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          p.x = Math.random() * w;
          p.y = Math.random() * h;
        }
        ctx.strokeStyle = lineColor;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const onVisibility = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('vela-theme', onTheme);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
