'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { network } from '@/lib/network';

const TABS = [
  { href: '/feed', label: 'Лента' },
  { href: '/news', label: 'Новости' },
  { href: '/network', label: 'Люди' },
  { href: '/notifications', label: 'Уведомления' },
  { href: '/profile', label: 'Профиль' },
];

/** Top navigation row for the social pages (desktop + mobile scrollable). */
export function SocialTabs() {
  const path = usePathname();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    network.notifications().then((n) => setUnread(n.unread)).catch(() => {});
  }, [path]);

  return (
    <div className="mb-8 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
      <Link href="/" className="mr-1 shrink-0 text-sm text-paper-faint hover:text-paper">← Главная</Link>
      {TABS.map((t) => {
        const active = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`relative shrink-0 rounded-full px-4 py-2 text-sm transition-colors ${active ? 'bg-aurora text-aurora-fg' : 'border border-ink-line text-paper-dim hover:text-paper'}`}
          >
            {t.label}
            {t.href === '/notifications' && unread > 0 && (
              <span className="ml-1.5 inline-grid h-5 min-w-[20px] place-items-center rounded-full bg-red-500 px-1 text-[11px] font-medium text-white">{unread}</span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
