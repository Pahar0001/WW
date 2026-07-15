/**
 * Slow, elegant marquee (бегущая строка) with key highlights. The animated
 * track holds two copies of the items; sliding it by -50% loops seamlessly
 * (CSS handles the motion; pauses on hover). Decorative/informational only.
 */
const ITEMS = [
  'Готовые маршруты на честных данных',
  'Сообщество по странам — визы и документы',
  'ИИ-консультант поможет спланировать поездку',
  'Расчёт примерных трат за секунды',
  'Совместные поездки и общий бюджет',
  'Карты, отели и календарь в одном месте',
];

export function Marquee() {
  const items = [...ITEMS, ...ITEMS]; // two copies → seamless -50% loop
  return (
    <div className="marquee border-y border-ink-line bg-ink-soft/50 py-3">
      <div className="marquee-track" aria-hidden>
        {items.map((t, i) => (
          <span key={i} className="inline-flex items-center">
            <span className="px-6 text-sm tracking-wide text-paper-dim">{t}</span>
            <span className="text-aurora">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
