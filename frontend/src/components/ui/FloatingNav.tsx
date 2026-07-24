'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { auth, isAdminRole, logout, type AuthUser } from '@/lib/auth';
import { network } from '@/lib/network';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Avatar } from '@/components/social/Avatar';

// Routes where the floating nav should stay out of the way (their own chrome).
const HIDDEN_PREFIXES = ['/admin', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email'];

const publicLinks = [
  { href: '/', label: 'Главная' },
  { href: '/community', label: 'Сообщество' },
  { href: '/data', label: 'Данные' },
];
const memberLinks = [
  { href: '/feed', label: 'Лента' },
  { href: '/news', label: 'Новости' },
  { href: '/network', label: 'Люди' },
];

/**
 * Плавающая нижняя навигация (десктоп) — «пилюля» в стиле award-сайтов.
 * Логотип + разделы + тема + аккаунт. Прячется у самого низа страницы,
 * чтобы не перекрывать футер. Мобильная навигация — в SiteHeader/BottomNav.
 */
export function FloatingNav() {
  const path = usePathname() || '/';
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [unread, setUnread] = useState(0);
  const [menu, setMenu] = useState(false);
  const [hidden, setHidden] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    auth
      .me()
      .then((u) => {
        setUser(u);
        if (u) network.notifications().then((n) => setUnread(n.unread)).catch(() => {});
      })
      .catch(() => setUser(null));
  }, [path]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Прячем «пилюлю», когда докрутили почти до низа (чтобы не закрывать футер).
  useEffect(() => {
    let raf = 0;
    const check = () => {
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 120;
      setHidden(nearBottom);
      raf = 0;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(p + '/'))) return null;

  const links = user ? [...publicLinks, ...memberLinks] : publicLinks;
  const isActive = (href: string) =>
    href === '/' ? path === '/' : path === href || path.startsWith(href + '/');

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-40 hidden justify-center px-4 transition-all duration-500 ease-smooth md:flex ${
        hidden ? 'translate-y-24 opacity-0' : 'translate-y-0 opacity-100'
      }`}
    >
      <nav className="glass pointer-events-auto flex max-w-[95vw] items-center gap-1.5 overflow-x-auto rounded-2xl px-2 py-2 shadow-soft-lg">
        {/* Логотип */}
        <Link
          href="/"
          data-magnetic
          className="mr-1 flex items-center gap-2 rounded-xl bg-paper px-3.5 py-2 font-serif text-lg leading-none tracking-tightest text-ink"
          aria-label="Vela — на главную"
        >
          <span className="text-[13px] text-aurora">和</span>
          Vela
        </Link>

        {/* Разделы */}
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`shrink-0 rounded-xl px-3.5 py-2 text-sm transition-colors ${
              isActive(l.href)
                ? 'bg-ink-line/60 text-paper'
                : 'text-paper-dim hover:bg-ink-line/40 hover:text-paper'
            }`}
          >
            {l.label}
          </Link>
        ))}

        <span className="mx-1 h-6 w-px shrink-0 bg-ink-line" />

        <div className="shrink-0">
          <ThemeToggle />
        </div>

        {/* Аккаунт */}
        {user === undefined ? null : !user ? (
          <>
            <Link
              href="/login"
              className="shrink-0 rounded-xl px-3.5 py-2 text-sm text-paper-dim transition-colors hover:text-paper"
            >
              Вход
            </Link>
            <Link
              href="/register"
              data-magnetic
              className="shrink-0 rounded-xl bg-aurora px-4 py-2 text-sm font-medium text-aurora-fg transition-transform hover:-translate-y-0.5"
            >
              Регистрация
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/notifications"
              aria-label="Уведомления"
              className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl text-paper-dim transition-colors hover:bg-ink-line/40 hover:text-paper"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 21h4" /></svg>
              {unread > 0 && (
                <span className="absolute -right-0.5 -top-0.5 inline-grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                  {unread}
                </span>
              )}
            </Link>
            <div ref={menuRef} className="relative shrink-0">
              <button onClick={() => setMenu((m) => !m)} aria-label="Профиль" className="block">
                <Avatar user={user} size={34} />
              </button>
              {menu && (
                <div className="absolute bottom-12 right-0 w-48 overflow-hidden rounded-xl border border-ink-line bg-ink shadow-xl">
                  <div className="border-b border-ink-line px-4 py-3 text-xs text-paper-faint">{user.name || user.email}</div>
                  <Link href="/profile" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-paper-dim hover:bg-ink-soft hover:text-paper">Профиль</Link>
                  {isAdminRole(user.role) && (
                    <Link href="/admin" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-paper-dim hover:bg-ink-soft hover:text-paper">Админка</Link>
                  )}
                  <button onClick={() => logout()} className="block w-full px-4 py-2.5 text-left text-sm text-paper-dim hover:bg-ink-soft hover:text-paper">Выйти</button>
                </div>
              )}
            </div>
          </>
        )}
      </nav>
    </div>
  );
}
