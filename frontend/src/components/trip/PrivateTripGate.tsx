'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken, authHeaders } from '@/lib/auth';

/**
 * Shown when the SSR fetch returned nothing — either the trip is private and the
 * viewer has no access, or it doesn't exist. If the viewer actually has access
 * (token present but no cookie yet), we set the cookie and reload once so the
 * server render succeeds.
 */
export function PrivateTripGate({ slug }: { slug: string }) {
  const [state, setState] = useState<'checking' | 'forbidden' | 'notfound'>('checking');

  useEffect(() => {
    const t = getToken();
    if (t && !document.cookie.includes('vela_token=')) {
      document.cookie = `vela_token=${t}; path=/; max-age=${7 * 24 * 3600}; samesite=lax`;
      const key = `vela_gate_reload_${slug}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
        return;
      }
    }
    fetch(`/api/trips/${slug}`, { headers: authHeaders(), cache: 'no-store' })
      .then((r) => {
        if (r.ok) { window.location.reload(); return; }
        setState(r.status === 403 ? 'forbidden' : 'notfound');
      })
      .catch(() => setState('notfound'));
  }, [slug]);

  return (
    <main className="container-vela flex min-h-screen flex-col items-center justify-center text-center">
      <Link href="/" className="mb-8 font-serif text-2xl tracking-tightest">Vela</Link>
      {state === 'checking' && <p className="text-paper-dim">Проверяем доступ…</p>}
      {state === 'forbidden' && (
        <>
          <h1 className="font-serif text-3xl tracking-tightest">Приватная поездка</h1>
          <p className="mt-3 max-w-md text-paper-dim">
            У вас нет доступа к этой поездке. Если вас должны были добавить — войдите
            под нужным аккаунтом или попросите организатора пригласить вас по email.
          </p>
          <Link href="/login" className="mt-6 rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink">Войти</Link>
        </>
      )}
      {state === 'notfound' && (
        <>
          <h1 className="font-serif text-3xl tracking-tightest">Поездка не найдена</h1>
          <Link href="/" className="mt-6 rounded-full border border-ink-line px-6 py-3 text-sm text-paper-dim hover:text-paper">На главную</Link>
        </>
      )}
    </main>
  );
}
