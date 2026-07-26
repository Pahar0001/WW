'use client';

/**
 * Знакомство с Vela — отдельная страница для новых пользователей.
 *
 * Куда ведёт: сюда попадают сразу после подтверждения email (регистрация →
 * verify-email → welcome), а в конце — на главную. Никаких подсказок поверх
 * интерфейса: экран сам по себе, его нельзя «случайно» получить второй раз —
 * пройденное знакомство помечается флагом vela_welcomed.
 *
 * Дизайн: тёмная кино-сцена в фирменной палитре (как auth-страницы), крупная
 * серифная типографика, золотая «нить» прогресса, мягкие переходы между шагами.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

const SEEN_KEY = 'vela_welcomed';
const EASE = [0.22, 1, 0.36, 1] as const;

interface Step {
  eyebrow: string;
  title: string;
  body: string;
  /** SVG-path иконки (тот же язык, что в меню главной). */
  icon: string;
}

const STEPS: Step[] = [
  {
    eyebrow: 'Шаг первый',
    title: 'Планета Vela',
    body: 'Главная открывается полётом над Кхао Сок, а ниже ждёт глобус: крутите его, выбирайте страну — и сразу попадаете в маршрут по ней.',
    icon: 'M12 3a9 9 0 100 18 9 9 0 000-18M3.5 9h17M3.5 15h17M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18',
  },
  {
    eyebrow: 'Шаг второй',
    title: 'Готовые маршруты',
    body: 'План по дням с местами, описаниями и картой. Цены билетов — настоящие, из выдачи Aviasales; всё, что посчитано, помечено как оценка. Мы не выдумываем цифры.',
    icon: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10',
  },
  {
    eyebrow: 'Шаг третий',
    title: 'Маршрут под ключ',
    body: 'Не хотите собирать сами — опишите пожелание своими словами. ИИ превратит его в бриф, а мы соберём поездку и назовём стоимость работы.',
    icon: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z',
  },
  {
    eyebrow: 'Шаг четвёртый',
    title: 'ИИ-консьерж рядом',
    body: 'Вопросы про визы, документы и сборы — в любой момент, кнопкой в углу экрана. Диалоги сохраняются в вашем аккаунте, к ним можно вернуться.',
    icon: 'M12 3a7 7 0 017 7c0 3-2 5-2 7H7c0-2-2-4-2-7a7 7 0 017-7zM9 21h6',
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const finish = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* приватный режим — просто уходим на главную */
    }
    setLeaving(true);
    setTimeout(() => router.replace('/'), 650);
  }, [router]);

  const next = useCallback(() => {
    setI((n) => {
      if (n >= STEPS.length - 1) {
        finish();
        return n;
      }
      return n + 1;
    });
  }, [finish]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        next();
      }
      if (e.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1));
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, finish]);

  const s = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <main className="relative flex min-h-[100svh] flex-col overflow-hidden bg-[#14100c] text-white">
      {/* Сцена: тёплое золотое свечение снизу-слева, как в кино-герое */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_0%_100%,rgba(201,165,95,0.18),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,rgba(201,165,95,0.07),transparent_60%)]" />

      {/* Шапка */}
      <header className="relative flex items-center justify-between px-6 py-7 md:px-12">
        <span className="flex items-center gap-2 font-serif text-xl tracking-tightest">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-aurora/40 text-[12px] leading-none text-aurora">
            和
          </span>
          Vela
        </span>
        <button
          onClick={finish}
          className="text-[11px] uppercase tracking-[0.2em] text-white/40 transition-colors hover:text-white"
        >
          Пропустить
        </button>
      </header>

      {/* Шаг */}
      <section className="relative flex flex-1 items-center px-6 pb-10 md:px-12">
        <div className="mx-auto w-full max-w-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.45, ease: EASE }}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-aurora/40 bg-aurora/10 text-aurora">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={s.icon} />
                </svg>
              </span>

              <p className="mt-8 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-aurora">
                <span className="h-px w-8 bg-aurora/60" />
                {s.eyebrow}
              </p>
              <h1 className="mt-5 font-serif display-2 leading-[1.05] tracking-tightest text-balance">
                {s.title}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/70 text-balance">
                {s.body}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Прогресс + управление */}
          <div className="mt-12 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              {STEPS.map((step, n) => (
                <button
                  key={step.title}
                  onClick={() => setI(n)}
                  aria-label={`Шаг ${n + 1}: ${step.title}`}
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    n === i ? 'w-10 bg-aurora' : n < i ? 'w-4 bg-aurora/40' : 'w-4 bg-white/15'
                  }`}
                />
              ))}
              <span className="ml-3 text-xs text-white/35">
                {i + 1} / {STEPS.length}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {i > 0 && (
                <button
                  onClick={() => setI((n) => Math.max(0, n - 1))}
                  className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/60 transition-colors hover:text-white"
                >
                  Назад
                </button>
              )}
              <button
                onClick={next}
                className="glow-gold rounded-full bg-aurora px-7 py-3 text-sm font-medium text-aurora-fg transition-transform hover:-translate-y-0.5"
              >
                {last ? 'На главную' : 'Дальше'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Занавес перехода на главную — без резкого скачка */}
      <AnimatePresence>
        {leaving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="fixed inset-0 z-[9700] grid place-items-center bg-[#14100c]"
          >
            <p className="font-serif text-2xl tracking-tightest text-aurora">Добро пожаловать</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
