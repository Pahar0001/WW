'use client';

/**
 * SocialTabs — единая навигация соц-страниц в фирменном стиле «пилюли»
 * (как FloatingNav): логотип → социальные разделы с иконками → сервисные
 * справа. Логическая группировка вместо ряда одинаковых кнопок:
 *   [和 Vela]  Лента · Новости · Люди  |  Сообщество  |  🔔 · Профиль
 * Активный раздел — тёмная подложка; уведомления — бейджем на колокольчике.
 * Sticky сверху; на узких экранах средняя группа скроллится внутри,
 * не обрезая ничего (скролл — только на контейнере ссылок).
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { network } from '@/lib/network';
import { chat } from '@/lib/chat';

const I = {
  feed: <path d="M4 6h16M4 12h16M4 18h10" />,
  news: (
    <>
      <rect x="3" y="5" width="14" height="14" rx="2" />
      <path d="M17 8h2a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5M7 9h6M7 13h6M7 16h4" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0M15.5 5a3.5 3.5 0 0 1 0 7M17 14.5a6 6 0 0 1 4 5.5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.5 9h17M3.5 15h17M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18" />
    </>
  ),
  bell: <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 21h4" />,
  chat: <path d="M21 12a8 8 0 0 1-8 8H4l2.2-3.3A8 8 0 1 1 21 12z" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

function Icon({ d }: { d: ReactNode }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {d}
    </svg>
  );
}

const SOCIAL = [
  { href: '/feed', label: 'Лента', icon: I.feed },
  { href: '/news', label: 'Новости', icon: I.news },
  { href: '/network', label: 'Люди', icon: I.people },
  { href: '/messages', label: 'Сообщения', icon: I.chat },
];

export function SocialTabs() {
  const path = usePathname();
  const [unread, setUnread] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);
  useEffect(() => {
    network.notifications().then((n) => setUnread(n.unread)).catch(() => {});
    chat.unreadCount().then((c) => setUnreadChats(c.unread)).catch(() => {});
  }, [path]);

  const isActive = (href: string) => path === href || path.startsWith(href + '/');

  const tab = (href: string, label: string, icon: ReactNode, badge = 0) => (
    <Link
      key={href}
      href={href}
      className={`relative flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-colors ${
        isActive(href)
          ? 'bg-paper text-ink'
          : 'text-paper-dim hover:bg-ink-line/40 hover:text-paper'
      }`}
    >
      <span className={isActive(href) ? 'text-aurora' : 'text-aurora/70'}>
        <Icon d={icon} />
      </span>
      {label}
      {badge > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-grid h-4 min-w-[16px] place-items-center rounded-full bg-aurora px-1 text-[10px] font-semibold text-aurora-fg">
          {badge}
        </span>
      )}
    </Link>
  );

  return (
    <div className="sticky top-4 z-30 mb-10 flex justify-center">
      <nav className="glass flex max-w-full items-center gap-1 rounded-2xl px-2 py-2 shadow-soft-lg">
        {/* Логотип — выход на главную */}
        <Link
          href="/"
          className="mr-1 flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 font-serif text-lg leading-none tracking-tightest text-paper"
          aria-label="Vela — на главную"
        >
          <span className="text-[13px] text-aurora">和</span>
          Vela
        </Link>
        <span className="h-6 w-px shrink-0 bg-ink-line" />

        {/* Социальные разделы (скроллятся на узких экранах) */}
        <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
          {SOCIAL.map((t) => tab(t.href, t.label, t.icon, t.href === '/messages' ? unreadChats : 0))}
          <span className="mx-0.5 h-6 w-px shrink-0 bg-ink-line" />
          {tab('/community', 'Сообщество', I.globe)}
        </div>

        <span className="mx-0.5 h-6 w-px shrink-0 bg-ink-line" />

        {/* Сервисные: уведомления + профиль */}
        <Link
          href="/notifications"
          aria-label="Уведомления"
          className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors ${
            isActive('/notifications') ? 'bg-paper text-ink' : 'text-paper-dim hover:bg-ink-line/40 hover:text-paper'
          }`}
        >
          <Icon d={I.bell} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
              {unread}
            </span>
          )}
        </Link>
        <Link
          href="/profile"
          className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm transition-colors ${
            isActive('/profile') ? 'bg-paper text-ink' : 'text-paper-dim hover:bg-ink-line/40 hover:text-paper'
          }`}
        >
          <span className={isActive('/profile') ? 'text-aurora' : 'text-aurora/70'}>
            <Icon d={I.user} />
          </span>
          Профиль
        </Link>
      </nav>
    </div>
  );
}
