'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, hasSession, logout, type AuthUser } from '@/lib/auth';
import { TERMS, PRIVACY } from '@/lib/legal';
import { toast } from '@/components/ui/Toaster';

/**
 * Блокирующее окно принятия документов.
 *
 * Нужно двум группам: тем, кто зарегистрировался ДО появления галочек в форме
 * регистрации, и всем — когда выходит новая редакция соглашения или политики.
 *
 * Показывается по списку `pendingConsents`, который отдаёт `/auth/me`, а НЕ по
 * пустому `termsAcceptedAt`, как раньше: одна отметка времени не различает
 * документы и не знает про смену редакции, поэтому новую версию никто бы не
 * подписал — гейт молчал бы.
 *
 * Галочек две, по одной на документ. Согласие на обработку персональных данных
 * должно быть отдельным и конкретным; «принимаю всё сразу» этому не отвечает.
 */
export function TermsGate() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);

  const recheck = useCallback(() => {
    if (!hasSession()) {
      setOpen(false);
      return;
    }
    auth.me().then((u) => {
      // Пока почта не подтверждена, человека ведёт другой экран — не наваливаем
      // два блокирующих окна разом.
      if (u && u.emailVerified && (u.pendingConsents?.length ?? 0) > 0) {
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
      toast.success('Документы приняты');
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const updating = Boolean(user.termsAcceptedAt);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-ink-line bg-ink-soft shadow-2xl">
        <div className="border-b border-ink-line px-7 py-5">
          <p className="text-xs uppercase tracking-[0.3em] text-paper-faint">
            Редакция {TERMS.version}
          </p>
          <h2 className="mt-2 font-serif text-2xl tracking-tightest text-paper">
            {updating ? 'Документы обновились' : 'Условия использования'}
          </h2>
          <p className="mt-2 text-sm text-paper-dim">
            {updating
              ? 'Вышла новая редакция. Чтобы продолжить пользоваться Vela, ознакомьтесь с условиями и примите их заново.'
              : 'Чтобы продолжить пользоваться Vela, ознакомьтесь с условиями и примите их.'}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-7 py-5">
          {TERMS.sections.map((s, i) => (
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
          <div className="space-y-2.5">
            <Check checked={terms} onChange={setTerms}>
              Принимаю{' '}
              <Link href={TERMS.href} target="_blank" className="text-aurora hover:underline">
                пользовательское соглашение
              </Link>
            </Check>
            <Check checked={privacy} onChange={setPrivacy}>
              Даю согласие на обработку персональных данных на условиях{' '}
              <Link href={PRIVACY.href} target="_blank" className="text-aurora hover:underline">
                политики
              </Link>
            </Check>
          </div>
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
              disabled={busy || !terms || !privacy}
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

function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-aurora"
      />
      <span className="text-sm leading-relaxed text-paper-dim">{children}</span>
    </label>
  );
}
