'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { AuthShell, inp, btn } from '@/components/auth/AuthShell';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await auth.login(email, password);
      window.location.href = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? '/admin' : '/';
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Вход" subtitle="Рады видеть снова.">
      <form onSubmit={submit} className="space-y-4">
        <input className={inp} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inp} type="password" placeholder="Пароль" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button disabled={busy} className={btn}>{busy ? 'Входим…' : 'Войти'}</button>
      </form>
      <div className="mt-6 flex justify-between text-sm text-paper-faint">
        <Link href="/forgot-password" className="hover:text-paper">Забыли пароль?</Link>
        <Link href="/register" className="hover:text-paper">Создать аккаунт</Link>
      </div>
    </AuthShell>
  );
}
