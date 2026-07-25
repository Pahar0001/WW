'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { AuthShell, btn } from '@/components/auth/AuthShell';
import { AuthField, PasswordField, emailLooksValid, passwordScore } from '@/components/auth/fields';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Живая валидация до отправки: подсказки, пока пользователь печатает.
  const emailInvalid = email.length > 3 && !emailLooksValid(email);
  const pwTooShort = password.length > 0 && password.length < 8;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await auth.register(email, password, name || undefined);
      window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Регистрация" subtitle="Создайте аккаунт, чтобы планировать поездки.">
      <form onSubmit={submit} className="space-y-4">
        <AuthField label="Имя" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
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
        <PasswordField
          value={password}
          onChange={setPassword}
          withMeter
          autoComplete="new-password"
          required
          minLength={8}
        />
        {pwTooShort && <p className="pl-1 text-xs text-amber-300/90">Минимум 8 символов.</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button disabled={busy || emailInvalid || passwordScore(password) < 1} className={btn}>
          {busy ? 'Создаём…' : 'Создать аккаунт'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-paper-faint">
        Уже есть аккаунт? <Link href="/login" className="text-paper transition-colors hover:text-aurora">Войти</Link>
      </p>
      <p className="mt-3 text-center text-xs text-paper-faint">
        После регистрации придёт письмо с кодом подтверждения email.
      </p>
    </AuthShell>
  );
}
