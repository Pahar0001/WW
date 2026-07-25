'use client';

/**
 * HalftoneOverlay — типографский растр: сетка МАЛЕНЬКИХ КВАДРАТОВ (не кругов)
 * поверх видео. Эффект должен ощущаться, а не бросаться в глаза.
 *
 * Реализация через Canvas (не CSS-filter):
 *  - один раз рисуем крошечный тайл (квадрат + зазор) на offscreen-канвасе
 *    с учётом devicePixelRatio — квадраты остаются хрустящими на retina;
 *  - тайл превращается в dataURL и растягивается браузером как
 *    background repeat. Runtime-стоимость после генерации — НОЛЬ: ни одного
 *    кадра перерисовки, композитор просто накладывает готовую текстуру;
 *  - blend-mode multiply даёт эффект «краска поверх бумаги», а не серую
 *    плёнку: растр темнит только там, где под ним есть изображение.
 *
 * ── Ручки для дизайнера ──
 *  CELL   — размер квадрата, px (2–4 по ТЗ)
 *  GAP    — зазор между квадратами, px
 *  ALPHA  — сила эффекта (0.04–0.08 — «ощущается, не видно»)
 *  ANGLE  — поворот растра, град (типографский растр обычно ~15°)
 */

import { useEffect, useState } from 'react';

const CELL = 2;
const GAP = 1.5;
const ALPHA = 0.16;
const ANGLE = 0; // квадратная сетка без поворота — «газетная» строгость

function buildTile(dpr: number): string {
  const tile = CELL + GAP;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(tile * dpr);
  canvas.height = Math.round(tile * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.scale(dpr, dpr);
  // Прозрачный фон; единственный тёмный квадрат в углу тайла.
  ctx.fillStyle = `rgba(10, 8, 5, ${ALPHA})`;
  ctx.fillRect(0, 0, CELL, CELL);
  return canvas.toDataURL('image/png');
}

export function HalftoneOverlay() {
  const [tile, setTile] = useState<string | null>(null);

  useEffect(() => {
    // Генерация тайла и регенерация при смене dpr (перенос окна между
    // мониторами) — matchMedia на resolution вместо поллинга.
    let mq: MediaQueryList | null = null;
    const make = () => setTile(buildTile(Math.min(2, window.devicePixelRatio || 1)));
    const listen = () => {
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener('change', onChange, { once: true });
    };
    const onChange = () => {
      make();
      listen();
    };
    make();
    listen();
    return () => mq?.removeEventListener('change', onChange);
  }, []);

  if (!tile) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage: `url(${tile})`,
        backgroundSize: `${CELL + GAP}px ${CELL + GAP}px`,
        transform: ANGLE ? `rotate(${ANGLE}deg) scale(1.5)` : undefined,
        mixBlendMode: 'multiply',
      }}
    />
  );
}
