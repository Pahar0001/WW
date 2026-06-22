'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AuthShell } from '@/components/auth/AuthShell';

function Verify() {
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }
    auth.verifyEmail(token).then(() => setState('ok')).catch(() => setState('error'));
  }, [token]);

  if (state === 'loading') return <p className="text-paper-dim">Подтверждаем email…</p>;
  if (state === 'ok')
    return (
      <p className="text-paper-dim">
        Email подтверждён ✓ <Link href="/login" className="text-paper hover:text-aurora">Войти</Link>
      </p>
    );
  return <p className="text-paper-dim">Ссылка недействительна или уже использована.</p>;
}

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Подтверждение email">
      <Suspense fallback={<p className="text-paper-dim">Загрузка…</p>}>
        <Verify />
      </Suspense>
    </AuthShell>
  );
}
