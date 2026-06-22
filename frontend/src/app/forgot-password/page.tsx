'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { AuthShell, inp, btn } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await auth.forgot(email);
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Сброс пароля" subtitle="Пришлём ссылку для сброса.">
      {sent ? (
        <p className="text-paper-dim">
          Если аккаунт с таким email существует — мы отправили ссылку для сброса
          пароля. Проверьте почту.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <input className={inp} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <button disabled={busy} className={btn}>{busy ? 'Отправляем…' : 'Отправить ссылку'}</button>
        </form>
      )}
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-paper-faint hover:text-paper">← Назад ко входу</Link></p>
    </AuthShell>
  );
}
