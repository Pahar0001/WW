'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { AuthShell, AuthCurtain, btn } from '@/components/auth/AuthShell';
import { AuthField, PasswordField, emailLooksValid } from '@/components/auth/fields';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Живая подсказка — только когда пользователь уже что-то ввёл.
  const emailInvalid = email.length > 3 && !emailLooksValid(email);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await auth.login(email, password);
      // Плавный «занавес» — следующая страница появляется как продолжение сцены.
      setLeaving(true);
      const to = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? '/admin' : '/';
      setTimeout(() => {
        window.location.href = to;
      }, 900);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Вход" subtitle="Рады видеть снова.">
      <AuthCurtain show={leaving} note="С возвращением" />
      <form onSubmit={submit} className="space-y-4">
        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          invalid={emailInvalid}
          hint="Похоже, в адресе опечатка — проверьте формат."
          autoComplete="email"
          required
        />
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" required />
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button disabled={busy || emailInvalid} className={btn}>
          {busy ? 'Входим…' : 'Войти'}
        </button>
      </form>
      <div className="mt-6 flex justify-between text-sm text-paper-faint">
        <Link href="/forgot-password" className="transition-colors hover:text-paper">Забыли пароль?</Link>
        <Link href="/register" className="transition-colors hover:text-paper">Создать аккаунт</Link>
      </div>
    </AuthShell>
  );
}
