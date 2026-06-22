'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { auth } from '@/lib/auth';
import { AuthShell, inp, btn } from '@/components/auth/AuthShell';

function ResetForm() {
  const token = useSearchParams().get('token') ?? '';
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await auth.reset(token, password);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!token) return <p className="text-paper-dim">Нет токена сброса в ссылке.</p>;
  if (done)
    return (
      <p className="text-paper-dim">
        Пароль обновлён. <Link href="/login" className="text-paper hover:text-aurora">Войти</Link>
      </p>
    );

  return (
    <form onSubmit={submit} className="space-y-4">
      <input className={inp} type="password" placeholder="Новый пароль (минимум 8 символов)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button disabled={busy} className={btn}>{busy ? 'Сохраняем…' : 'Сменить пароль'}</button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Новый пароль">
      <Suspense fallback={<p className="text-paper-dim">Загрузка…</p>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
