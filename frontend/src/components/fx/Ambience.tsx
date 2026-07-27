'use client';

import { useEffect, useRef } from 'react';
import { clamp, detectTier, onFrame, prefersReducedMotion } from '@/lib/motion';

/**
 * Атмосфера страницы: медленно живущий фон, из-за которого сайт никогда не
 * выглядит пустым.
 *
 * Один <canvas> вместо десятков DOM-слоёв. Здесь три вещи:
 *  • объёмные градиентные пятна («световые массы») — они дышат и дрейфуют,
 *    задавая тёплый источник и холодную тень;
 *  • пылинки с параллаксом по скроллу — глубина без 3D;
 *  • нижняя дымка (fog), собирающая композицию.
 *
 * Почему canvas, а не CSS-градиенты с animation:
 *  анимация background-position/filter: blur на элементе во весь экран каждый
 *  кадр перерисовывает весь слой на CPU. Canvas в 0.5–0.75 разрешения с
 *  готовыми радиальными градиентами стоит доли миллисекунды, а размытость
 *  здесь — часть картинки, а не постэффект.
 *
 * Слой лежит ПОД контентом: он отрисован в <body> до {children}, оба
 * позиционированы с z-index: auto, поэтому порядок рисования решает DOM.
 */

type Blob = {
  /** Базовые координаты в долях вьюпорта. */
  bx: number;
  by: number;
  /** Радиус в долях меньшей стороны. */
  r: number;
  hue: number;
  sat: number;
  light: number;
  alpha: number;
  /** Скорость и фаза дрейфа. */
  sx: number;
  sy: number;
  phase: number;
};

// Тёплое золото / антикварная латунь / холодный сумеречный синий.
// Композиция намеренно из трёх температур: без холодного пятна кадр выглядит
// «пожелтевшим», а не освещённым.
const LIGHT_BLOBS: Blob[] = [
  { bx: 0.18, by: 0.12, r: 0.62, hue: 40, sat: 62, light: 74, alpha: 0.3, sx: 0.021, sy: 0.013, phase: 0 },
  { bx: 0.86, by: 0.3, r: 0.5, hue: 28, sat: 48, light: 70, alpha: 0.22, sx: -0.017, sy: 0.019, phase: 1.9 },
  { bx: 0.6, by: 0.82, r: 0.7, hue: 206, sat: 34, light: 64, alpha: 0.16, sx: 0.013, sy: -0.011, phase: 3.4 },
  { bx: 0.08, by: 0.7, r: 0.44, hue: 46, sat: 54, light: 78, alpha: 0.18, sx: 0.024, sy: -0.016, phase: 5.1 },
];

const DARK_BLOBS: Blob[] = [
  { bx: 0.2, by: 0.14, r: 0.66, hue: 40, sat: 60, light: 46, alpha: 0.3, sx: 0.019, sy: 0.012, phase: 0.4 },
  { bx: 0.88, by: 0.34, r: 0.52, hue: 24, sat: 52, light: 40, alpha: 0.24, sx: -0.016, sy: 0.017, phase: 2.3 },
  { bx: 0.55, by: 0.86, r: 0.74, hue: 212, sat: 44, light: 34, alpha: 0.26, sx: 0.012, sy: -0.01, phase: 3.9 },
  { bx: 0.06, by: 0.66, r: 0.46, hue: 44, sat: 56, light: 44, alpha: 0.2, sx: 0.022, sy: -0.014, phase: 5.6 },
];

type Mote = { x: number; y: number; z: number; r: number; tw: number; drift: number };

export function Ambience() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const tier = detectTier();
    // Пятна огромные и размытые — разрешение можно резать без потери качества.
    const quality = tier === 'low' ? 0.42 : tier === 'mid' ? 0.6 : 0.75;
    const moteCount = reduced ? 0 : tier === 'low' ? 26 : tier === 'mid' ? 54 : 90;

    let w = 0;
    let h = 0;
    let dark = document.documentElement.classList.contains('dark');

    const motes: Mote[] = Array.from({ length: moteCount }, (_, i) => {
      // Детерминированное «случайное» распределение: золотое сечение даёт
      // равномерное поле без сгустков, которые даёт Math.random.
      const g = 0.618033988749895;
      const a = ((i * g) % 1);
      const b = (((i * 2 + 1) * g * 1.7) % 1);
      return {
        x: a,
        y: b,
        z: 0.25 + ((i * 0.37) % 1) * 0.75, // глубина: дальние мельче и медленнее
        r: 0.6 + ((i * 0.61) % 1) * 1.7,
        tw: (i % 7) * 0.9,
        drift: 0.6 + ((i * 0.29) % 1) * 1.6,
      };
    });

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    // Тема меняется классом на <html> — палитру пересобираем по факту.
    const themeObserver = new MutationObserver(() => {
      dark = document.documentElement.classList.contains('dark');
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const draw = (t: number, scrollY: number) => {
      const min = Math.min(w, h);
      ctx.clearRect(0, 0, w, h);

      // ── Световые массы ──
      // В тёмной теме свет складывается (lighter) — так пятна светятся, а не
      // мажут кадр серым; в светлой обычное наложение мягче и не выжигает крем.
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      const blobs = dark ? DARK_BLOBS : LIGHT_BLOBS;
      for (const b of blobs) {
        const breathe = Math.sin(t * 0.12 + b.phase) * 0.5 + 0.5;
        const x = (b.bx + Math.sin(t * b.sx + b.phase) * 0.07) * w;
        // Пятна медленно уплывают вверх при прокрутке — фон живёт своей
        // жизнью, но связан со страницей.
        const y = (b.by + Math.cos(t * b.sy + b.phase * 1.3) * 0.06) * h - scrollY * 0.035;
        const r = b.r * min * (0.86 + breathe * 0.22);
        const a = b.alpha * (0.72 + breathe * 0.34);

        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `hsla(${b.hue}, ${b.sat}%, ${b.light}%, ${a})`);
        g.addColorStop(0.45, `hsla(${b.hue}, ${b.sat}%, ${b.light}%, ${a * 0.34})`);
        g.addColorStop(1, `hsla(${b.hue}, ${b.sat}%, ${b.light}%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── Пылинки ──
      if (motes.length) {
        ctx.globalCompositeOperation = 'lighter';
        for (const m of motes) {
          // Параллакс: дальние пылинки почти стоят, ближние заметно смещаются.
          const py = (m.y * h - scrollY * 0.12 * m.z + t * m.drift * 6) % (h + 80);
          const y = py < -40 ? py + h + 80 : py;
          const x = m.x * w + Math.sin(t * 0.35 + m.tw) * 14 * m.z;
          const tw = 0.35 + 0.65 * (Math.sin(t * 1.1 + m.tw * 2) * 0.5 + 0.5);
          const a = tw * (dark ? 0.4 : 0.22) * m.z;
          ctx.fillStyle = dark
            ? `hsla(44, 70%, 82%, ${a})`
            : `hsla(38, 58%, 52%, ${a})`;
          ctx.beginPath();
          ctx.arc(x, y, m.r * m.z, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Нижняя дымка ──
      ctx.globalCompositeOperation = 'source-over';
      const fog = ctx.createLinearGradient(0, h * 0.62, 0, h);
      const fogA = dark ? 0.3 : 0.18;
      const shift = Math.sin(t * 0.09) * 0.04;
      fog.addColorStop(0, 'hsla(0, 0%, 0%, 0)');
      fog.addColorStop(
        clamp(0.55 + shift, 0.1, 0.9),
        dark ? `hsla(214, 24%, 12%, ${fogA * 0.5})` : `hsla(38, 30%, 82%, ${fogA * 0.6})`,
      );
      fog.addColorStop(1, dark ? `hsla(214, 26%, 10%, ${fogA})` : `hsla(38, 34%, 78%, ${fogA})`);
      ctx.fillStyle = fog;
      ctx.fillRect(0, h * 0.62, w, h * 0.38);
    };

    if (reduced) {
      // Один статичный кадр: композиция остаётся, движения нет.
      draw(0, 0);
      return () => {
        window.removeEventListener('resize', resize);
        themeObserver.disconnect();
      };
    }

    const off = onFrame(({ t, y }) => draw(t, y));

    return () => {
      off();
      window.removeEventListener('resize', resize);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 select-none"
      style={{ contain: 'strict' }}
    />
  );
}
