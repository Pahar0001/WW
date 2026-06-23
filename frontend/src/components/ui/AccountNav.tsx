'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, isAdminRole, logout, type AuthUser } from '@/lib/auth';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

/** Login/Register links when signed out; account menu when signed in. */
export function AccountNav() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  if (user === undefined) return <ThemeToggle />;

  if (!user) {
    return (
      <span className="flex items-center gap-4">
        <ThemeToggle />
        <Link href="/login" data-cursor="hover" className="transition-colors hover:text-paper">Вход</Link>
        <Link href="/register" data-magnetic className="rounded-full border border-ink-line px-4 py-1.5 text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper">Регистрация</Link>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-4">
      <ThemeToggle />
      {isAdminRole(user.role) && (
        <Link href="/admin" data-cursor="hover" className="transition-colors hover:text-paper">Админка</Link>
      )}
      <span className="text-paper-faint">{user.name || user.email}</span>
      <button onClick={() => logout()} data-cursor="hover" className="rounded-full border border-ink-line px-3 py-1.5 text-paper-dim transition-colors hover:text-paper">Выйти</button>
    </span>
  );
}
