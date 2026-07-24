/**
 * Slow, elegant marquee (бегущая строка) with key highlights. The animated
 * track holds two copies of the items; sliding it by -50% loops seamlessly
 * (CSS handles the motion; pauses on hover). Каждый пункт — с тонкой золотой
 * иконкой (line-style, 1.5px) и мягким hover-подсветом текста.
 */
import type { ReactNode } from 'react';

// Тонкие line-иконки (stroke=currentColor) — единый визуальный язык Vela.
const I = {
  route: (
    <path d="M4 19a3 3 0 1 0 0-6h9a3 3 0 1 1 0-6h4M17 4l3 3-3 3" />
  ),
  passport: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="10" r="3" />
      <path d="M8 17h8" />
    </>
  ),
  spark: (
    <path d="M12 3v4m0 10v4M3 12h4m10 0h4M6 6l2.5 2.5m7 7L18 18M18 6l-2.5 2.5m-7 7L6 18" />
  ),
  coins: (
    <>
      <circle cx="9" cy="9" r="6" />
      <path d="M14.5 5.5a6 6 0 1 1-9 9" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0M15.5 5a3.5 3.5 0 0 1 0 7M17 14.5a6 6 0 0 1 4 5.5" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
      <path d="M9 4v14m6-12v14" />
    </>
  ),
};

const ITEMS: { icon: ReactNode; text: string }[] = [
  { icon: I.route, text: 'Готовые маршруты на честных данных' },
  { icon: I.passport, text: 'Сообщество по странам — визы и документы' },
  { icon: I.spark, text: 'ИИ-консультант поможет спланировать поездку' },
  { icon: I.coins, text: 'Расчёт примерных трат за секунды' },
  { icon: I.users, text: 'Совместные поездки и общий бюджет' },
  { icon: I.map, text: 'Карты, отели и календарь в одном месте' },
];

export function Marquee() {
  const items = [...ITEMS, ...ITEMS]; // two copies → seamless -50% loop
  return (
    <div className="marquee border-y border-ink-line bg-ink-soft/50 py-3">
      <div className="marquee-track" aria-hidden>
        {items.map((it, i) => (
          <span key={i} className="group inline-flex items-center">
            <span className="flex items-center gap-2.5 px-6 text-sm tracking-wide text-paper-dim transition-colors duration-500 group-hover:text-paper">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 text-aurora/70 transition-all duration-500 group-hover:scale-110 group-hover:text-aurora"
              >
                {it.icon}
              </svg>
              {it.text}
            </span>
            <span className="text-aurora/70">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
