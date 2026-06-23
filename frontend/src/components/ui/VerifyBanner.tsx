'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, getToken } from '@/lib/auth';
import { toast } from '@/components/ui/Toaster';

/**
 * Soft reminder for logged-in users whose email isn't verified yet. Non-blocking:
 * a thin bar with a link to the code page and a one-click resend.
 */
export function VerifyBanner() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getToken()) return;
    auth.me().then((u) => {
      if (u && !u.emailVerified) {
        setEmail(u.email);
        setShow(true);
      }
    });
  }, []);

  if (!show) return null;

  async function resend() {
    setBusy(true);
    try {
      const r = await auth.resendVerification();
      toast.success(r.alreadyVerified ? 'Email уже подтверждён' : 'Код отправлен на почту');
      if (r.alreadyVerified) setShow(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-aurora/30 bg-aurora/10">
      <div className="container-vela flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
        <span className="text-paper-dim">
          Подтвердите email, чтобы не потерять доступ к приватным поездкам.
        </span>
        <div className="flex items-center gap-4">
          <button onClick={resend} disabled={busy} className="text-paper hover:text-aurora disabled:opacity-50">
            {busy ? 'Отправляем…' : 'Отправить код'}
          </button>
          <Link
            href={`/verify-email?email=${encodeURIComponent(email)}`}
            className="rounded-full border border-aurora/40 px-4 py-1 text-aurora hover:bg-aurora/10"
          >
            Ввести код
          </Link>
        </div>
      </div>
    </div>
  );
}
