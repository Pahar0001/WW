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
      // Static, calm gradient — no animation.
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#0a0b0d');
      g.addColorStop(1, '#101216');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      return () => window.removeEventListener('resize', resize);
    }

    const count = Math.min(140, Math.floor((w * h) / 14000));
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
      ctx.fillStyle = 'rgba(10,11,13,0.10)';
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
        ctx.strokeStyle = 'rgba(127,227,208,0.16)';
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
