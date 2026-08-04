'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { readConsent, writeConsent } from '@/lib/cookie-consent';
import { DOCUMENT_VERSIONS } from '@/lib/legal/versions';
import { hasSession } from '@/lib/auth';

/**
 * Баннер согласия на cookie.
 *
 * Три равнозначные кнопки — принять все, настроить, только необходимые. Отказ
 * НЕ прячется за «настройками»: он должен даваться одним нажатием, ровно как и
 * согласие, иначе выбор перестаёт быть свободным.
 *
 * Показывается, пока решения нет. Решение по устаревшей редакции политики
 * считается отсутствующим (см. `readConsent`) — при смене состава cookie баннер
 * спросит заново.
 */

/** На этих страницах баннер не показывается. */
const HIDDEN_PREFIXES = [
  // Игровой мир занимает весь экран и прячет всю обвязку сайта; всплывшая
  // поверх него панель ломала бы управление и перехватывала мышь.
  '/vela',
  // На самих юридических страницах баннер закрывал бы текст, который человек
  // как раз пришёл прочитать, чтобы принять решение.
  '/cookies',
  '/privacy',
  '/terms',
];

export function CookieBanner() {
  const path = usePathname() || '/';
  const [show, setShow] = useState(false);
  const [tuning, setTuning] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    // Только на клиенте и только после гидратации: на сервере cookie этого
    // браузера нет, и отрисовать баннер заранее нельзя без расхождения разметки.
    if (!readConsent()) setShow(true);
  }, []);

  if (!show || HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return null;

  const decide = (choice: { analytics: boolean; marketing: boolean }) => {
    writeConsent(choice);
    setShow(false);
    // Вошедшему пользователю кладём то же решение в историю согласий на
    // сервере: cookie живёт в одном браузере, а доказательство должно
    // существовать независимо от него.
    if (hasSession()) {
      fetch('/api/legal/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'cookie-banner',
          entries: [
            { kind: 'COOKIE_ANALYTICS', granted: choice.analytics, version: DOCUMENT_VERSIONS.COOKIES },
            { kind: 'COOKIE_MARKETING', granted: choice.marketing, version: DOCUMENT_VERSIONS.COOKIES },
          ],
        }),
      }).catch(() => {
        /* решение уже сохранено в браузере — сеть не должна его отменять */
      });
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Согласие на использование cookie"
      className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-5"
    >
      <div className="glass mx-auto max-w-3xl rounded-3xl border border-ink-line p-5 shadow-depth sm:p-6">
        <h2 className="font-serif text-lg tracking-tightest text-paper">Мы используем cookie</h2>
        <p className="mt-2 text-sm leading-relaxed text-paper-dim">
          Обязательные — чтобы вы оставались в аккаунте и сохранялись ваши настройки.
          Аналитические — обезличенный подсчёт просмотров маршрутов. Маркетинговые сейчас
          не используются. Подробности —{' '}
          <Link href="/cookies" className="text-paper underline decoration-aurora/40 underline-offset-4">
            в политике cookies
          </Link>
          .
        </p>

        {tuning && (
          <div className="mt-4 space-y-3 border-t border-ink-line pt-4">
            <Category
              title="Обязательные"
              note="Вход, выбранная тема, сам факт этого выбора. Без них Сервис не работает."
              checked
              disabled
            />
            <Category
              title="Аналитические"
              note="Обезличенный идентификатор посетителя и домен источника перехода."
              checked={analytics}
              onChange={setAnalytics}
            />
            <Category
              title="Маркетинговые"
              note="Пока не используются. Категория останется выключенной, даже если её включить."
              checked={marketing}
              onChange={setMarketing}
            />
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button
            onClick={() => decide(tuning ? { analytics, marketing } : { analytics: true, marketing: true })}
            data-magnetic
            className="rounded-full bg-paper px-5 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90"
          >
            {tuning ? 'Сохранить выбор' : 'Принять все'}
          </button>
          {!tuning && (
            <button
              onClick={() => setTuning(true)}
              className="rounded-full border border-ink-line px-5 py-2.5 text-sm text-paper-dim transition-colors hover:text-paper"
            >
              Настроить
            </button>
          )}
          <button
            onClick={() => decide({ analytics: false, marketing: false })}
            className="rounded-full border border-ink-line px-5 py-2.5 text-sm text-paper-dim transition-colors hover:text-paper"
          >
            Только необходимые
          </button>
        </div>
      </div>
    </div>
  );
}

function Category({
  title,
  note,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  note: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className={`flex gap-3 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 accent-aurora"
      />
      <span>
        <span className="block text-sm text-paper">{title}</span>
        <span className="block text-xs leading-relaxed text-paper-faint">{note}</span>
      </span>
    </label>
  );
}
