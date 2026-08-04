'use client';

import { useState } from 'react';
import Link from 'next/link';
import { auth, type ConsentEntry } from '@/lib/auth';
import { TERMS, PRIVACY, DOCUMENT_VERSIONS } from '@/lib/legal';
import { AuthShell, AuthCurtain, btn } from '@/components/auth/AuthShell';
import { AuthField, PasswordField, emailLooksValid, passwordScore } from '@/components/auth/fields';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Обязательные согласия — по одному на документ. Общая галочка «принимаю всё»
  // не годится: согласие на обработку персональных данных должно быть
  // конкретным и относиться к конкретному документу.
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  // Рассылки — отдельно и НЕ предотмечены: реклама только по предварительному
  // согласию, а заранее поставленная галочка согласием не является.
  const [acceptMarketing, setAcceptMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Живая валидация до отправки: подсказки, пока пользователь печатает.
  const emailInvalid = email.length > 3 && !emailLooksValid(email);
  const pwTooShort = password.length > 0 && password.length < 8;
  const consentsGiven = acceptTerms && acceptPrivacy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Версии — те, что показаны на этом экране: доказательством служит
      // редакция, которую человек действительно видел, а не текущая на сервере.
      const consents: ConsentEntry[] = [
        { kind: 'TERMS', granted: acceptTerms, version: DOCUMENT_VERSIONS.TERMS },
        { kind: 'PRIVACY', granted: acceptPrivacy, version: DOCUMENT_VERSIONS.PRIVACY },
        { kind: 'MARKETING', granted: acceptMarketing, version: DOCUMENT_VERSIONS.PRIVACY },
      ];
      await auth.register(email, password, name || undefined, consents);
      // Плавный «занавес» перед подтверждением email — без резкого скачка.
      setLeaving(true);
      setTimeout(() => {
        window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
      }, 900);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Регистрация" subtitle="Создайте аккаунт, чтобы планировать поездки.">
      <AuthCurtain show={leaving} note="Добро пожаловать" />
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

        <div className="space-y-2.5 pt-1">
          <Consent checked={acceptTerms} onChange={setAcceptTerms}>
            Принимаю{' '}
            <Doc href={TERMS.href}>пользовательское соглашение</Doc>
          </Consent>
          <Consent checked={acceptPrivacy} onChange={setAcceptPrivacy}>
            Даю согласие на обработку персональных данных на условиях{' '}
            <Doc href={PRIVACY.href}>политики обработки персональных данных</Doc>
          </Consent>
          <Consent checked={acceptMarketing} onChange={setAcceptMarketing}>
            Хочу получать новости и предложения Vela{' '}
            <span className="text-paper-faint">— необязательно, отписаться можно в любой момент</span>
          </Consent>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
        <button
          disabled={busy || emailInvalid || passwordScore(password) < 1 || !consentsGiven}
          className={btn}
        >
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

function Consent({
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
      <span className="text-xs leading-relaxed text-paper-dim">{children}</span>
    </label>
  );
}

/** Документ открывается в новой вкладке — иначе заполненная форма теряется. */
function Doc({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="text-paper underline decoration-aurora/40 underline-offset-2 hover:text-aurora"
    >
      {children}
    </Link>
  );
}
