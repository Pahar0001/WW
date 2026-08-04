'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { auth, hasSession } from '@/lib/auth';
import { AuthShell, inp, btn } from '@/components/auth/AuthShell';
import { toast } from '@/components/ui/Toaster';

/** Знакомство (/welcome) уже пройдено на этом устройстве? */
function welcomed(): boolean {
  try {
    return Boolean(localStorage.getItem('vela_welcomed'));
  } catch {
    return false;
  }
}

function Verify() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [done, setDone] = useState(false);

  // If there's no email in the URL but the user is logged in, use theirs.
  useEffect(() => {
    if (!email && hasSession()) auth.me().then((u) => u && setEmail(u.email));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await auth.verifyEmail(email.trim(), code.trim());
      setDone(true);
      toast.success(r.alreadyVerified ? 'Email уже подтверждён' : 'Email подтверждён ✓');
      // Nudge the always-mounted terms gate to re-check (it will show the
      // acceptance modal now that the email is verified).
      window.dispatchEvent(new Event('vela:auth-changed'));
      // Новый пользователь идёт на знакомство (/welcome) — один раз на устройство.
      // Тот, кто просто подтверждает почту повторно, остаётся здесь.
      if (!r.alreadyVerified && hasSession() && !welcomed()) {
        setTimeout(() => {
          window.location.href = '/welcome';
        }, 1200);
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!hasSession()) {
      toast.info('Войдите в аккаунт, чтобы отправить код повторно');
      return;
    }
    setResending(true);
    try {
      const r = await auth.resendVerification();
      toast.success(r.alreadyVerified ? 'Email уже подтверждён' : 'Новый код отправлен на почту');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setResending(false);
    }
  }

  if (done) {
    return (
      <p className="text-paper-dim">
        Email подтверждён ✓{' '}
        {hasSession() && !welcomed() ? (
          <Link href="/welcome" className="text-paper hover:text-aurora">Знакомство с Vela</Link>
        ) : (
          <Link href="/login" className="text-paper hover:text-aurora">Войти</Link>
        )}{' '}
        · <Link href="/" className="text-paper hover:text-aurora">На главную</Link>
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-paper-dim">
        Мы отправили 6-значный код на вашу почту. Введите его, чтобы подтвердить email.
      </p>
      <input
        className={inp}
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        className={`${inp} text-center text-2xl tracking-[0.5em]`}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="••••••"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        required
      />
      <button disabled={busy || code.length < 4} className={btn}>
        {busy ? 'Проверяем…' : 'Подтвердить'}
      </button>
      <div className="flex items-center justify-between text-sm text-paper-faint">
        <button type="button" onClick={resend} disabled={resending} className="hover:text-paper disabled:opacity-50">
          {resending ? 'Отправляем…' : 'Отправить код повторно'}
        </button>
        <Link href="/" className="hover:text-paper">На главную</Link>
      </div>
    </form>
  );
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
