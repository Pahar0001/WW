'use client';

/**
 * Фундамент моушна Vela.
 *
 * Один общий rAF-тикер на всё приложение: параллакс, курсор, свечения и
 * скролл-эффекты подписываются на него и пишут результат НАПРЯМУЮ в style
 * через refs. Ноль setState в горячем цикле — это архитектурный принцип
 * проекта (см. docs/PROJECT_HANDOFF.md §15) и единственный способ держать
 * 60 FPS при десятках одновременных эффектов.
 *
 * Тикер спит, когда нет подписчиков или вкладка скрыта.
 */

import { useEffect, useRef } from 'react';

// ── Кривые ─────────────────────────────────────────────────────────────
/** Основная «дорогая» кривая: быстрый старт, длинное мягкое торможение. */
export const EASE = [0.22, 1, 0.36, 1] as const;
/** Экспоненциальный выход — для крупных перемещений и занавесов. */
export const EASE_EXPO = [0.16, 1, 0.3, 1] as const;
/** Симметричная — для переключений состояния (тема, активный пункт). */
export const EASE_SOFT = [0.4, 0, 0.2, 1] as const;
export const CSS_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Шкала длительностей: держим тайминги в одном месте, а не «на глаз». */
export const DUR = {
  micro: 0.18,
  fast: 0.32,
  base: 0.6,
  slow: 0.9,
  cinematic: 1.4,
} as const;

// ── Математика ─────────────────────────────────────────────────────────
export const clamp = (v: number, min = 0, max = 1) => (v < min ? min : v > max ? max : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Плавная ступенька: 0 до e0, 1 после e1, S-кривая между. */
export function smoothstep(e0: number, e1: number, x: number) {
  const t = clamp((x - e0) / (e1 - e0 || 1));
  return t * t * (3 - 2 * t);
}

/**
 * Экспоненциальное сглаживание, НЕ зависящее от частоты кадров.
 * Обычный `v += (target - v) * 0.1` на 144 Гц бежит вдвое быстрее, чем на 60 —
 * анимация «дышит» по-разному на разных мониторах. Здесь скорость задаётся
 * временем полусглаживания, поэтому ощущение одинаковое везде.
 */
export function damp(current: number, target: number, lambda: number, dt: number) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

// ── Возможности устройства ─────────────────────────────────────────────
export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isFinePointer() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: fine)').matches;
}

/**
 * Грубая оценка «класса» устройства для выбора тяжести эффектов.
 * Намеренно консервативна: лучше недокрутить эффекты, чем показать 20 FPS.
 */
export type DeviceTier = 'low' | 'mid' | 'high';
export function detectTier(): DeviceTier {
  if (typeof window === 'undefined') return 'mid';
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 4;
  const mobile = window.matchMedia('(max-width: 767px)').matches;
  const dpr = window.devicePixelRatio || 1;

  if (mobile || cores <= 4 || mem <= 2) return 'low';
  if (cores >= 8 && mem >= 8 && dpr <= 2) return 'high';
  return 'mid';
}

// ── Общий тикер ────────────────────────────────────────────────────────
export type FrameInfo = {
  /** Время с первого кадра, сек. */
  t: number;
  /** Дельта кадра, сек (обрезана сверху — после сворачивания вкладки не «выстреливает»). */
  dt: number;
  /** window.scrollY. */
  y: number;
  /** Сглаженная скорость скролла, px/сек (знаковая). */
  vy: number;
  /** Прогресс всей страницы 0..1. */
  page: number;
};

type Sub = (f: FrameInfo) => void;

const subs = new Set<Sub>();
const frame: FrameInfo = { t: 0, dt: 0, y: 0, vy: 0, page: 0 };

let raf = 0;
let t0 = 0;
let last = 0;
let lastY = 0;
let rawVy = 0;

function tick(now: number) {
  raf = requestAnimationFrame(tick);
  if (!t0) {
    t0 = now;
    last = now;
    lastY = window.scrollY;
  }
  // 50 мс = 20 FPS: всё, что медленнее, считаем «провалом кадра» и не даём
  // эффектам прыгнуть — лучше чуть отстать, чем дёрнуться.
  const dt = Math.min(0.05, (now - last) / 1000) || 0.0001;
  last = now;

  const y = window.scrollY;
  const instant = (y - lastY) / dt;
  lastY = y;
  // Скорость сглаживаем сильно: она управляет «растяжением» контента,
  // а сырое значение на трекпаде шумит.
  rawVy = damp(rawVy, instant, 9, dt);

  const max = document.documentElement.scrollHeight - window.innerHeight;

  frame.t = (now - t0) / 1000;
  frame.dt = dt;
  frame.y = y;
  frame.vy = rawVy;
  frame.page = max > 0 ? clamp(y / max) : 0;

  for (const s of subs) s(frame);
}

function start() {
  if (raf || typeof window === 'undefined') return;
  if (document.hidden) return;
  raf = requestAnimationFrame(tick);
}

function stop() {
  if (!raf) return;
  cancelAnimationFrame(raf);
  raf = 0;
  // Следующий запуск пересчитает базу времени — иначе dt будет огромным.
  t0 = 0;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (subs.size) start();
  });
}

/** Подписка вне React (для императивных модулей). Возвращает отписку. */
export function onFrame(cb: Sub) {
  subs.add(cb);
  start();
  return () => {
    subs.delete(cb);
    if (!subs.size) stop();
  };
}

/**
 * Хук-подписка на общий тикер. Колбэк держим в ref, чтобы подписка не
 * пересоздавалась на каждый рендер (иначе тикер дёргается).
 */
export function useOnFrame(cb: Sub, enabled = true) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    if (!enabled) return;
    return onFrame((f) => ref.current(f));
  }, [enabled]);
}

// ── Прогресс элемента по вьюпорту ──────────────────────────────────────
/**
 * Ведёт прогресс прохождения элемента через вьюпорт (0 — только показался
 * снизу, 1 — полностью ушёл вверх) и зовёт колбэк каждый кадр, пока элемент
 * виден.
 *
 * Геометрия элемента КЭШИРУЕТСЯ (offsetTop/height) и обновляется по resize и
 * при входе во вьюпорт: `getBoundingClientRect()` на каждый кадр для десятка
 * элементов — это гарантированный layout thrash.
 */
export function useViewportProgress<T extends HTMLElement>(
  cb: (progress: number, f: FrameInfo, el: T) => void,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const elRef = useRef<T | null>(null);
  const cbRef = useRef(cb);
  cbRef.current = cb;

  useEffect(() => {
    const el = elRef.current;
    if (!el || !enabled) return;

    let top = 0;
    let height = 0;
    let visible = false;

    const measure = () => {
      const r = el.getBoundingClientRect();
      top = r.top + window.scrollY;
      height = r.height;
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible) measure();
      },
      // Запас в 20% экрана: эффект уже «поймал» элемент к моменту появления.
      { rootMargin: '20% 0px' },
    );
    io.observe(el);

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();

    const off = onFrame((f) => {
      if (!visible) return;
      const vh = window.innerHeight;
      const span = vh + height || 1;
      const p = clamp((f.y + vh - top) / span);
      cbRef.current(p, f, el);
    });

    window.addEventListener('resize', measure);
    return () => {
      io.disconnect();
      ro.disconnect();
      off();
      window.removeEventListener('resize', measure);
    };
  }, [enabled]);

  return elRef;
}
