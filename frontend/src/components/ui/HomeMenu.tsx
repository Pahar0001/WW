'use client';

import Link from 'next/link';

/**
 * Quick-access menu on the home page: the main sections of Vela in one glance.
 * The AI-consultant tile opens the floating assistant via a global event.
 */
const ITEMS: { href?: string; label: string; hint: string; icon: string; event?: string }[] = [
  { href: '/#dream-trips', label: 'Маршруты', hint: 'Готовые путешествия', icon: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10' },
  { href: '/trips/new', label: 'Собрать поездку', hint: 'Свой маршрут по дням', icon: 'M12 5v14M5 12h14' },
  { href: '/order', label: 'Заказать путешествие', hint: 'Организатор соберёт за вас', icon: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z' },
  { href: '/community', label: 'Сообщество', hint: 'Визы и документы', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18M3.5 9h17M3.5 15h17M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18' },
  { href: '/feed', label: 'Лента', hint: 'Впечатления', icon: 'M4 6h16M4 12h16M4 18h10' },
  { event: 'vela:open-assistant', label: 'ИИ-консультант', hint: 'Совет по поездке', icon: 'M12 3a7 7 0 017 7c0 3-2 5-2 7H7c0-2-2-4-2-7a7 7 0 017-7zM9 21h6' },
];

export function HomeMenu() {
  return (
    <section className="container-vela pb-6 pt-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        {ITEMS.map((it) => {
          const inner = (
            <>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-aurora/10 text-aurora transition-colors duration-300 group-hover:bg-aurora/15">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d={it.icon} />
                </svg>
              </span>
              <span className="mt-4 block font-medium leading-tight text-paper">{it.label}</span>
              <span className="mt-1 block text-xs leading-snug text-paper-faint">{it.hint}</span>
            </>
          );
          const cls =
            'group flex flex-col rounded-2xl border border-ink-line/70 bg-ink-soft/50 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-aurora/40 hover:bg-ink-soft/80 hover:shadow-soft';
          return it.event ? (
            <button key={it.label} onClick={() => window.dispatchEvent(new Event(it.event!))} className={cls}>
              {inner}
            </button>
          ) : (
            <Link key={it.label} href={it.href!} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
