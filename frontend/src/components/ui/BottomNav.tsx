'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { network } from '@/lib/network';

const ITEMS = [
  { href: '/feed', label: 'Лента', icon: 'M4 6h16M4 12h16M4 18h10' },
  { href: '/news', label: 'Новости', icon: 'M4 5h16v14H4zM8 9h8M8 13h5' },
  { href: '/network', label: 'Люди', icon: 'M9 11a3 3 0 100-6 3 3 0 000 6zM2 20a7 7 0 0114 0M17 11a3 3 0 100-6' },
  { href: '/notifications', label: 'Уведом.', icon: 'M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 21h4' },
  { href: '/profile', label: 'Профиль', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0' },
];

/** Mobile-only fixed bottom navigation for the social network. */
export function BottomNav() {
  const path = usePathname();
  const [loggedIn, setLoggedIn] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    auth.me().then((u) => {
      setLoggedIn(!!u);
      if (u) network.notifications().then((n) => setUnread(n.unread)).catch(() => {});
    });
  }, [path]);

  if (!loggedIn) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[8000] border-t border-ink-line bg-ink/95 backdrop-blur md:hidden">
      <div className="flex items-stretch">
        {ITEMS.map((it) => {
          const active = path === it.href || path.startsWith(it.href + '/');
          return (
            <Link key={it.href} href={it.href} className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active ? 'text-aurora' : 'text-paper-dim'}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={it.icon} />
              </svg>
              <span>{it.label}</span>
              {it.href === '/notifications' && unread > 0 && (
                <span className="absolute right-[18%] top-1 inline-grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">{unread}</span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
