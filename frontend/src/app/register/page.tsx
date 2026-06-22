'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { AuthShell, inp, btn } from '@/components/auth/AuthShell';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await auth.register(email, password, name || undefined);
      window.location.href = '/?welcome=1';
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Регистрация" subtitle="Создайте аккаунт, чтобы планировать поездки.">
      <form onSubmit={submit} className="space-y-4">
        <input className={inp} placeholder="Имя" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inp} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inp} type="password" placeholder="Пароль (минимум 8 символов)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button disabled={busy} className={btn}>{busy ? 'Создаём…' : 'Создать аккаунт'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-paper-faint">
        Уже есть аккаунт? <Link href="/login" className="text-paper hover:text-aurora">Войти</Link>
      </p>
      <p className="mt-3 text-center text-xs text-paper-faint">
        После регистрации придёт письмо для подтверждения email.
      </p>
    </AuthShell>
  );
}
