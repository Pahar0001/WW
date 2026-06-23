'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, isAdminRole, logout, type AuthUser } from '@/lib/auth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const links = [
  { href: '#dream-trips', label: 'Путешествия' },
  { href: '#data', label: 'Честные данные' },
];

/** Responsive site header: inline nav on desktop, a tidy menu sheet on mobile. */
export function SiteHeader() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  return (
    <header className="relative z-30">
      <div className="container-vela flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl tracking-tightest" data-magnetic>
          <span className="grid h-6 w-6 place-items-center rounded-full border border-aurora/40 text-[11px] text-aurora">和</span>
          Vela
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 text-sm text-paper-dim md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} data-cursor="hover" className="transition-colors hover:text-paper">
              {l.label}
            </a>
          ))}
          <ThemeToggle />
          {user === undefined ? null : !user ? (
            <>
              <Link href="/login" data-cursor="hover" className="transition-colors hover:text-paper">Вход</Link>
              <Link href="/register" data-magnetic className="rounded-full border border-ink-line px-4 py-1.5 transition-colors hover:border-aurora/40 hover:text-paper">Регистрация</Link>
            </>
          ) : (
            <>
              {isAdminRole(user.role) && (
                <Link href="/admin" data-cursor="hover" className="transition-colors hover:text-paper">Админка</Link>
              )}
              <span className="text-paper-faint">{user.name || user.email}</span>
              <button onClick={() => logout()} className="rounded-full border border-ink-line px-3 py-1.5 transition-colors hover:text-paper">Выйти</button>
            </>
          )}
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-3 md:hidden">
          <ThemeToggle />
          <button
            aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="grid h-9 w-9 place-items-center rounded-full border border-ink-line text-paper-dim transition-colors hover:text-paper"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              {open ? (
                <>
                  <path d="M4 4l10 10" />
                  <path d="M14 4L4 14" />
                </>
              ) : (
                <>
                  <path d="M3 5h12" />
                  <path d="M3 9h12" />
                  <path d="M3 13h12" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu sheet */}
      {open && (
        <div className="container-vela md:hidden">
          <div className="mb-3 overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/90 p-3 shadow-xl backdrop-blur-xl">
            <nav className="flex flex-col text-paper-dim">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 transition-colors hover:bg-ink hover:text-paper">
                  {l.label}
                </a>
              ))}
              <div className="my-2 h-px bg-ink-line" />
              {user === undefined ? null : !user ? (
                <>
                  <Link href="/login" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 transition-colors hover:bg-ink hover:text-paper">Вход</Link>
                  <Link href="/register" onClick={() => setOpen(false)} className="mt-1 rounded-full bg-aurora px-3 py-3 text-center font-medium text-aurora-fg">Регистрация</Link>
                </>
              ) : (
                <>
                  {isAdminRole(user.role) && (
                    <Link href="/admin" onClick={() => setOpen(false)} className="rounded-lg px-3 py-3 transition-colors hover:bg-ink hover:text-paper">Админка</Link>
                  )}
                  <span className="px-3 py-2 text-xs text-paper-faint">{user.name || user.email}</span>
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
