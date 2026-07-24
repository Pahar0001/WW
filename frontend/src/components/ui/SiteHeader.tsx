'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { auth, isAdminRole, logout, type AuthUser } from '@/lib/auth';
import { network } from '@/lib/network';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Avatar } from '@/components/social/Avatar';

const anchors = [
  { href: '#dream-trips', label: 'Путешествия' },
  { href: '/order', label: 'Заказать' },
  { href: '/data', label: 'Честные данные' },
];
const social = [
  { href: '/feed', label: 'Лента' },
  { href: '/news', label: 'Новости' },
  { href: '/community', label: 'Сообщество' },
  { href: '/network', label: 'Люди' },
];

/** Responsive site header: inline nav on desktop, a tidy menu sheet on mobile. */
export function SiteHeader() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [unread, setUnread] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    auth.me().then((u) => {
      setUser(u);
      if (u) network.notifications().then((n) => setUnread(n.unread)).catch(() => {});
    }).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    // Десктоп-навигация переехала в нижнюю «пилюлю» (FloatingNav);
    // здесь остаётся только мобильная шапка.
    <header className="relative z-30 md:hidden">
      <div className="container-vela flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl tracking-tightest" data-magnetic>
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-aurora/40 text-[12px] leading-none text-aurora">和</span>
          <span className="leading-none">Vela</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm text-paper-dim md:flex">
          {anchors.map((l) => (
            <a key={l.href} href={l.href} data-cursor="hover" className="transition-colors hover:text-paper">{l.label}</a>
          ))}
          {user && social.map((l) => (
            <Link key={l.href} href={l.href} data-cursor="hover" className="transition-colors hover:text-paper">{l.label}</Link>
          ))}
          <ThemeToggle />
          {user === undefined ? null : !user ? (
            <>
              <Link href="/login" data-cursor="hover" className="transition-colors hover:text-paper">Вход</Link>
              <Link href="/register" data-magnetic className="rounded-full border border-ink-line px-4 py-1.5 transition-colors hover:border-aurora/40 hover:text-paper">Регистрация</Link>
            </>
          ) : (
            <>
              <Link href="/notifications" data-cursor="hover" aria-label="Уведомления" className="relative transition-colors hover:text-paper">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 21h4" /></svg>
                {unread > 0 && <span className="absolute -right-2 -top-2 inline-grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">{unread}</span>}
              </Link>
              {/* Profile avatar + dropdown */}
              <div ref={menuRef} className="relative">
                <button onClick={() => setMenu((m) => !m)} data-cursor="hover" aria-label="Профиль" className="block">
                  <Avatar user={user} size={32} />
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-ink-line bg-ink shadow-xl">
                    <div className="border-b border-ink-line px-4 py-3 text-xs text-paper-faint">{user.name || user.email}</div>
                    <Link href="/profile" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-paper-dim hover:bg-ink-soft hover:text-paper">Профиль</Link>
                    <Link href="/feed" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-paper-dim hover:bg-ink-soft hover:text-paper">Лента</Link>
                    {isAdminRole(user.role) && <Link href="/admin" onClick={() => setMenu(false)} className="block px-4 py-2.5 text-sm text-paper-dim hover:bg-ink-soft hover:text-paper">Админка</Link>}
                    <button onClick={() => logout()} className="block w-full px-4 py-2.5 text-left text-sm text-paper-dim hover:bg-ink-soft hover:text-paper">Выйти</button>
                  </div>
                )}
              </div>
            </>
          )}
        </nav>

        {/* Mobile controls — only the burger; everything else lives in the sheet
            and the bottom navigation, to avoid duplicating the same actions. */}
        <div className="flex items-center md:hidden">
          <button
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="grid h-9 w-9 place-items-center rounded-full border border-ink-line text-paper-dim transition-colors hover:text-paper"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              {open ? (<><path d="M4 4l10 10" /><path d="M14 4L4 14" /></>) : (<><path d="M3 5h12" /><path d="M3 9h12" /><path d="M3 13h12" /></>)}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu sheet */}
      {open && (
        <div className="container-vela md:hidden">
          <div className="mb-3 overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/90 p-3 shadow-xl backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between px-3 py-1">
              <span className="text-xs uppercase tracking-[0.2em] text-paper-faint">Тема</span>
              <ThemeToggle />
            </div>
            <nav className="flex flex-col text-paper-dim">
              {anchors.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 transition-colors hover:bg-ink hover:text-paper">{l.label}</a>
              ))}
              {user && social.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 transition-colors hover:bg-ink hover:text-paper">{l.label}</Link>
              ))}
              <div className="my-2 h-px bg-ink-line" />
              {user === undefined ? null : !user ? (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 transition-colors hover:bg-ink hover:text-paper">Вход</Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="mt-1 rounded-full bg-aurora px-3 py-3 text-center font-medium text-aurora-fg">Регистрация</Link>
                </>
              ) : (
                <>
                  <Link href="/profile" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 transition-colors hover:bg-ink hover:text-paper">Профиль</Link>
                  {isAdminRole(user.role) && <Link href="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 transition-colors hover:bg-ink hover:text-paper">Админка</Link>}
                  <button onClick={() => logout()} className="rounded-lg px-3 py-3 text-left transition-colors hover:bg-ink hover:text-paper">Выйти</button>
                </>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
