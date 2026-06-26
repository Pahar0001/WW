'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, getToken, logout, type AuthUser } from '@/lib/auth';
import { TERMS_VERSION, TERMS_SECTIONS } from '@/lib/terms';
import { toast } from '@/components/ui/Toaster';

/**
 * Blocking Terms-of-Use gate. After a user confirms their email they must accept
 * the user agreement before they can use the site — a modal overlay covers the
 * page until they agree (or log out). Shown only when:
 *   logged in  &&  emailVerified  &&  termsAcceptedAt is null.
 * Re-checks the session on mount, on focus, and on `vela:auth-changed`.
 */
export function TermsGate() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const recheck = useCallback(() => {
    if (!getToken()) {
      setOpen(false);
      return;
    }
    auth.me().then((u) => {
      if (u && u.emailVerified && !u.termsAcceptedAt) {
        setUser(u);
        setOpen(true);
      } else {
        setOpen(false);
      }
    });
  }, []);

  useEffect(() => {
    recheck();
    const onFocus = () => recheck();
    window.addEventListener('focus', onFocus);
    window.addEventListener('vela:auth-changed', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('vela:auth-changed', onFocus);
    };
  }, [recheck]);

  if (!open || !user) return null;

  async function accept() {
    setBusy(true);
    try {
      await auth.acceptTerms();
      toast.success('Соглашение принято');
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-ink-line bg-ink-soft shadow-2xl">
        <div className="border-b border-ink-line px-7 py-5">
          <p className="text-xs uppercase tracking-[0.3em] text-paper-faint">
            Редакция {TERMS_VERSION}
          </p>
          <h2 className="mt-2 font-serif text-2xl tracking-tightest text-paper">
            Пользовательское соглашение
          </h2>
          <p className="mt-2 text-sm text-paper-dim">
            Email подтверждён. Чтобы продолжить пользоваться Vela, ознакомьтесь с
            условиями и примите их.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-7 py-5">
          {TERMS_SECTIONS.map((s, i) => (
            <div key={i}>
              <h3 className="font-medium text-paper">
                {i + 1}. {s.title}
              </h3>
              <div className="mt-1.5 space-y-1.5">
                {s.paragraphs.map((p, j) => (
                  <p key={j} className="text-sm leading-relaxed text-paper-dim">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-ink-line px-7 py-5">
          <p className="text-xs text-paper-faint">
            Полную версию можно открыть на{' '}
            <Link href="/terms" target="_blank" className="text-aurora hover:underline">
              отдельной странице
            </Link>
            . Нажимая «Принимаю», вы соглашаетесь с условиями.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => logout()}
              className="text-sm text-paper-faint hover:text-paper"
            >
              Выйти
            </button>
            <button
              type="button"
              onClick={accept}
              disabled={busy}
              data-cursor="hover"
              className="rounded-full bg-aurora px-6 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Сохраняем…' : 'Принимаю'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
