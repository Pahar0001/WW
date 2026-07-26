'use client';

/**
 * Онбординг-тур первого визита.
 *
 * Четыре подсказки поверх интерфейса главной: глобус, готовые маршруты, заказ
 * под ключ и ИИ-консьерж. Показывается один раз (флаг в localStorage), только
 * на главной и только после кино-героя — во время скролл-видео подсказки бы
 * мешали. Цели помечены атрибутом data-tour в соответствующих компонентах.
 *
 * Механика: «прожектор» — затемнение с вырезом по прямоугольнику цели (box-shadow
 * на прозрачном блоке), карточка рядом с целью. Если цель вне экрана, карточка
 * показывается по центру без выреза — тур ничего не скроллит, чтобы не спорить
 * со скролл-таймлайном героя.
 */

import { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

const SEEN_KEY = 'vela_tour_seen';
const EASE = [0.22, 1, 0.36, 1] as const;
const PAD = 10; // отступ выреза вокруг цели

interface Step {
  target: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    target: '[data-tour="globe"]',
    title: 'Планета Vela',
    body: 'Крутите глобус и выбирайте страну — сразу откроется маршрут по ней.',
  },
  {
    target: '[data-tour="trips"]',
    title: 'Готовые маршруты',
    body: 'План по дням, места с описаниями, карта и честный расчёт трат.',
  },
  {
    target: '[data-tour="order"]',
    title: 'Маршрут под ключ',
    body: 'Опишите пожелание своими словами — ИИ соберёт бриф, а мы сделаем поездку.',
  },
  {
    target: '[data-tour="assistant"]',
    title: 'ИИ-консьерж',
    body: 'Спросите про визы, документы и сборы — ответит здесь же, в любой момент.',
  },
];

type Rect = { top: number; left: number; width: number; height: number } | null;

function rectOf(selector: string): Rect {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) return null;
  // Считаем целью только то, что реально видно на экране.
  const visible = r.bottom > 60 && r.top < window.innerHeight - 40;
  if (!visible) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

const CARD_W = 340;

export function OnboardingTour() {
  const path = usePathname() || '/';
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<Rect>(null);
  const [vp, setVp] = useState({ w: 1280, h: 800 });

  // Запуск: только главная, только первый визит, без спешки.
  useEffect(() => {
    if (path !== '/') return;
    try {
      if (localStorage.getItem(SEEN_KEY)) return;
    } catch {
      return; // приватный режим — не навязываемся
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Тур останется доступным вручную (событие ниже), но сам не всплывёт.
      return;
    }
    const id = setTimeout(() => setStep(0), 2600);
    return () => clearTimeout(id);
  }, [path]);

  // Ручной запуск: window.dispatchEvent(new Event('vela:start-tour')).
  useEffect(() => {
    const start = () => setStep(0);
    window.addEventListener('vela:start-tour', start);
    return () => window.removeEventListener('vela:start-tour', start);
  }, []);

  // Позиция выреза: пересчитываем на скролле и ресайзе.
  useEffect(() => {
    if (step === null) return;
    const sync = () => {
      setRect(rectOf(STEPS[step].target));
      setVp({ w: window.innerWidth, h: window.innerHeight });
    };
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);
    const id = setInterval(sync, 500); // цели появляются по мере загрузки
    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', sync);
      clearInterval(id);
    };
  }, [step]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* не критично */
    }
    setStep(null);
  }, []);

  const next = useCallback(() => {
    setStep((s) => {
      if (s === null) return s;
      if (s >= STEPS.length - 1) {
        try {
          localStorage.setItem(SEEN_KEY, '1');
        } catch {
          /* не критично */
        }
        return null;
      }
      return s + 1;
    });
  }, []);

  // Escape закрывает тур.
  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'Enter' || e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, finish, next]);

  if (step === null) return null;
  const s = STEPS[step];

  // Карточка: под целью, если та в верхней половине экрана, иначе над ней.
  // Позиция считается в пикселях: framer-motion управляет transform, поэтому
  // центрировать через translate(-50%,-50%) нельзя — он будет затёрт анимацией.
  const cardW = Math.min(CARD_W, vp.w - 32);
  const below = rect ? rect.top + rect.height / 2 < vp.h / 2 : true;
  const cardStyle: React.CSSProperties = rect
    ? {
        top: below ? rect.top + rect.height + PAD + 14 : undefined,
        bottom: below ? undefined : vp.h - rect.top + PAD + 14,
        left: Math.min(Math.max(rect.left, 16), Math.max(16, vp.w - cardW - 16)),
        width: cardW,
      }
    : {
        top: Math.max(24, Math.round(vp.h / 2 - 130)),
        left: Math.round((vp.w - cardW) / 2),
        width: cardW,
      };

  return (
    <AnimatePresence>
      <motion.div
        key="tour"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="fixed inset-0 z-[9500]"
        aria-live="polite"
      >
        {/* Затемнение: с вырезом по цели или сплошное */}
        {rect ? (
          <motion.div
            layout
            transition={{ duration: 0.4, ease: EASE }}
            className="pointer-events-none absolute rounded-2xl"
            style={{
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
              boxShadow: '0 0 0 9999px rgba(8,6,4,0.72)',
              outline: '1px solid rgba(201,165,95,0.55)',
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-[rgba(8,6,4,0.72)]" />
        )}

        {/* Клик по фону — закрыть */}
        <button
          onClick={finish}
          aria-label="Пропустить знакомство"
          className="absolute inset-0 h-full w-full cursor-default"
        />

        {/* Карточка подсказки */}
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          style={cardStyle}
          className="absolute rounded-2xl border border-aurora/30 bg-[#14100c]/96 p-5 text-white shadow-[0_24px_70px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.22em] text-aurora">
              Знакомство · {step + 1}/{STEPS.length}
            </span>
            <button
              onClick={finish}
              className="text-[11px] uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white"
            >
              Пропустить
            </button>
          </div>

          <h3 className="mt-3 font-serif text-xl tracking-tightest">{s.title}</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-white/70">{s.body}</p>

          <div className="mt-5 flex items-center justify-between">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-5 bg-aurora' : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              className="glow-gold rounded-full bg-aurora px-4 py-1.5 text-sm font-medium text-aurora-fg transition-transform hover:-translate-y-0.5"
            >
              {step === STEPS.length - 1 ? 'Понятно' : 'Дальше'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
