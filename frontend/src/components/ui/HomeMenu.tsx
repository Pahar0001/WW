'use client';

import Link from 'next/link';

/**
 * Quick-access menu on the home page: the main sections of Vela in one glance.
 * The AI-consultant tile opens the floating assistant via a global event.
 */
const ITEMS: { href?: string; label: string; hint: string; icon: string; event?: string }[] = [
  { href: '/#dream-trips', label: 'Готовые маршруты', hint: 'Проверенные путешествия', icon: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10' },
  { href: '/trips/new', label: 'Собрать поездку', hint: 'Свой маршрут по дням', icon: 'M12 5v14M5 12h14' },
  { href: '/community', label: 'Сообщество', hint: 'Визы и документы по странам', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18M3.5 9h17M3.5 15h17M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18' },
  { href: '/feed', label: 'Лента', hint: 'Впечатления путешественников', icon: 'M4 6h16M4 12h16M4 18h10' },
  { event: 'vela:open-assistant', label: 'ИИ-консультант', hint: 'Спросите совет по поездке', icon: 'M12 3a7 7 0 017 7c0 3-2 5-2 7H7c0-2-2-4-2-7a7 7 0 017-7zM9 21h6' },
];

export function HomeMenu() {
  return (
    <section className="container-vela pb-4 pt-2">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ITEMS.map((it) => {
          const inner = (
            <>
              <span className="grid h-10 w-10 place-items-center rounded-full border border-ink-line text-aurora transition-colors group-hover:border-aurora/50">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d={it.icon} />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-paper group-hover:text-aurora">{it.label}</span>
                <span className="block truncate text-xs text-paper-faint">{it.hint}</span>
              </span>
            </>
          );
          const cls =
            'group flex items-center gap-3 rounded-2xl border border-ink-line bg-ink-soft/40 p-4 text-left transition-colors hover:border-aurora/40';
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
