'use client';

/**
 * PaperNoise — «живая бумага»: очень медленное движение зерна поверх кадра.
 *
 * Как достигается дешевизна при живости:
 *  - зерно НЕ генерируется каждый кадр. На маунте создаются NOISE_FRAMES
 *    маленьких тайлов шума (TILE×TILE), дальше они только чередуются;
 *  - канвас перерисовывается ~6 раз в секунду (STEP_MS), а не 60: глаз
 *    воспринимает это как медленное «дыхание» бумаги, GPU почти спит;
 *  - тайл рисуется как CanvasPattern с медленным дрейфом смещения —
 *    ощущение волокна, ползущего по листу;
 *  - IntersectionObserver полностью останавливает цикл вне вьюпорта,
 *    prefers-reduced-motion замораживает зерно (один статичный слой).
 *
 * ── Ручки для дизайнера ──
 *  ALPHA    — сила зерна (0.03–0.06)
 *  STEP_MS  — период смены кадра шума (больше = медленнее «жизнь»)
 *  DRIFT    — скорость дрейфа волокна, px/сек
 */

import { useEffect, useRef } from 'react';

const TILE = 160;
const NOISE_FRAMES = 4;
const ALPHA = 0.4; // альфа самих зёрен в тайле; итог глушится opacity слоя
const LAYER_OPACITY = 0.05;
const STEP_MS = 160;
const DRIFT = 2.5;

function makeNoiseTile(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = TILE;
  c.height = TILE;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(TILE, TILE);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // Тёпло-серое зерно: чуть смещено к бумажному тону, не чисто ч/б.
    const v = 120 + Math.random() * 135;
    d[i] = v;
    d[i + 1] = v * 0.985;
    d[i + 2] = v * 0.94;
    d[i + 3] = Math.random() < 0.5 ? 0 : ALPHA * 255 * Math.random();
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export function PaperNoise() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const frames = Array.from({ length: NOISE_FRAMES }, makeNoiseTile);
    const patterns = frames.map((f) => ctx.createPattern(f, 'repeat')!);

    let frame = 0;
    let last = 0;
    let raf: number | null = null;
    let running = false;

    // Канвас держим в CSS-пикселях (зерно и должно быть «пиксельным» —
    // это часть фактуры), но пересобираем под размер вьюпорта.
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      draw(performance.now(), true);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number, force = false) => {
      if (!force && now - last < STEP_MS) return;
      last = now;
      frame = (frame + 1) % NOISE_FRAMES;
      const drift = ((now / 1000) * DRIFT) % TILE;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(-drift, drift * 0.6); // диагональный дрейф волокна
      ctx.fillStyle = patterns[frame];
      ctx.fillRect(-TILE, -TILE, canvas.width + TILE * 2, canvas.height + TILE * 2);
      ctx.restore();
    };

    const loop = (now: number) => {
      if (!running) return;
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const start = () => {
      if (running || reduced) return;
      running = true;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      if (raf != null) cancelAnimationFrame(raf);
      raf = null;
    };

    // Вне экрана шум полностью останавливается.
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), {
      threshold: 0,
    });
    io.observe(canvas);

    resize();
    if (reduced) draw(performance.now(), true); // статичный лист

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity: LAYER_OPACITY, mixBlendMode: 'overlay' }}
    />
  );
}
