'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, logout, type AuthUser, type ConsentKind } from '@/lib/auth';
import {
  account,
  downloadExport,
  type ConsentRecord,
  type ConsentState,
  type NotificationPrefs,
} from '@/lib/account';
import { LEGAL_DOCUMENTS, DOCUMENT_VERSIONS, TERMS, PRIVACY, COOKIES } from '@/lib/legal';
import { readConsent, writeConsent } from '@/lib/cookie-consent';
import { toast } from '@/components/ui/Toaster';

/**
 * Настройки аккаунта: персональные данные, согласия, уведомления, выгрузка и
 * удаление.
 *
 * Собрано в одном месте намеренно. Права субъекта персональных данных (ст. 14 и
 * 21 152-ФЗ) должны быть выполнимы самим человеком, а не через переписку с
 * поддержкой; разложенные по разным экранам, они на практике недоступны.
 */
export default function AccountSettingsPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);

  useEffect(() => {
    auth.me().then(setMe).catch(() => setMe(null));
  }, []);

  if (me === undefined) {
    return (
      <main className="container-vela min-h-screen py-8">
        <div className="h-8 w-56 animate-pulse rounded bg-ink-line/60" />
      </main>
    );
  }

  if (!me) {
    return (
      <main className="container-vela min-h-screen py-16">
        <h1 className="font-serif display-2">Настройки аккаунта</h1>
        <p className="mt-4 text-paper-dim">
          Чтобы управлять своими данными,{' '}
          <Link href="/login" className="text-aurora hover:underline">
            войдите
          </Link>
          .
        </p>
      </main>
    );
  }

  return (
    <main className="container-vela min-h-screen py-8 pb-32 md:pb-16">
      <p className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
        <span className="h-px w-8 bg-aurora/60" />
        <Link href="/profile" className="transition-colors hover:text-paper">
          Профиль
        </Link>
      </p>
      <h1 className="font-serif display-2">Настройки аккаунта</h1>

      <div className="mt-8 max-w-3xl space-y-6">
        <PersonalData me={me} />
        <Consents />
        <Notifications />
        <CookieSettings />
        <DataExport />
        <DangerZone />
      </div>
    </main>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-line bg-ink-soft/50 p-6 shadow-soft sm:p-7">
      <h2 className="font-serif text-xl tracking-tightest text-paper">{title}</h2>
      {description && <p className="mt-1.5 text-sm leading-relaxed text-paper-dim">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

// ── Персональные данные ─────────────────────────────────────────────────────

function PersonalData({ me }: { me: AuthUser }) {
  return (
    <Section
      title="Персональные данные"
      description="Что о вас хранится в учётной записи. Имя, описание и изображение меняются в профиле."
    >
      <dl className="space-y-3 text-sm">
        <Row label="Email">{me.email}</Row>
        <Row label="Имя">{me.name || <span className="text-paper-faint">не указано</span>}</Row>
        <Row label="Почта подтверждена">{me.emailVerified ? 'да' : 'нет'}</Row>
      </dl>
      <Link
        href="/profile"
        className="mt-5 inline-block rounded-full border border-ink-line px-5 py-2 text-sm text-paper-dim transition-colors hover:text-paper"
      >
        Изменить в профиле
      </Link>
    </Section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-ink-line/60 pb-3">
      <dt className="text-paper-faint">{label}</dt>
      <dd className="text-paper">{children}</dd>
    </div>
  );
}

// ── Согласия ────────────────────────────────────────────────────────────────

const CONSENT_LABELS: Record<ConsentKind, { title: string; note: string; docHref?: string }> = {
  TERMS: {
    title: 'Пользовательское соглашение',
    note: 'Обязательно для работы Сервиса. Отзыв означает удаление аккаунта.',
    docHref: TERMS.href,
  },
  PRIVACY: {
    title: 'Обработка персональных данных',
    note: 'Обязательно для работы Сервиса. Отзыв означает удаление аккаунта.',
    docHref: PRIVACY.href,
  },
  MARKETING: {
    title: 'Новости и предложения',
    note: 'Необязательно. Отзыв немедленно прекращает все рекламные рассылки.',
    docHref: PRIVACY.href,
  },
  COOKIE_ANALYTICS: {
    title: 'Аналитические cookie',
    note: 'Необязательно. Меняется здесь же, ниже, в разделе «Cookie».',
    docHref: COOKIES.href,
  },
  COOKIE_MARKETING: {
    title: 'Маркетинговые cookie',
    note: 'Необязательно. Сейчас не используются.',
    docHref: COOKIES.href,
  },
};

function Consents() {
  const [state, setState] = useState<ConsentState[] | null>(null);
  const [history, setHistory] = useState<ConsentRecord[]>([]);
  const [busy, setBusy] = useState<ConsentKind | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(() => {
    account
      .consents()
      .then((r) => {
        setState(r.current);
        setHistory(r.history);
      })
      .catch(() => setState([]));
  }, []);

  useEffect(load, [load]);

  async function toggle(kind: ConsentKind, granted: boolean) {
    setBusy(kind);
    try {
      const version =
        kind === 'TERMS'
          ? DOCUMENT_VERSIONS.TERMS
          : kind === 'COOKIE_ANALYTICS' || kind === 'COOKIE_MARKETING'
            ? DOCUMENT_VERSIONS.COOKIES
            : DOCUMENT_VERSIONS.PRIVACY;
      await account.setConsents([{ kind, granted, version }]);
      toast.success(granted ? 'Согласие сохранено' : 'Согласие отозвано');
      load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Section
      title="Согласия"
      description="Что и когда вы подписывали. Обязательные согласия отозвать нельзя, не удалив аккаунт, — без них Сервис не может вас обслуживать."
    >
      {state === null ? (
        <div className="h-20 animate-pulse rounded-xl bg-ink-line/40" />
      ) : (
        <div className="space-y-4">
          {state
            // Cookie-согласиями управляет раздел ниже — не показываем один и тот
            // же выключатель дважды в двух местах с разной логикой.
            .filter((s) => s.kind === 'TERMS' || s.kind === 'PRIVACY' || s.kind === 'MARKETING')
            .map((s) => {
              const meta = CONSENT_LABELS[s.kind];
              const required = s.kind === 'TERMS' || s.kind === 'PRIVACY';
              return (
                <div key={s.kind} className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-paper">
                      {meta.docHref ? (
                        <Link href={meta.docHref} className="hover:text-aurora">
                          {meta.title}
                        </Link>
                      ) : (
                        meta.title
                      )}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-paper-faint">{meta.note}</p>
                    <p className="mt-1 text-xs text-paper-faint">
                      {s.granted && s.at
                        ? `Дано ${new Date(s.at).toLocaleDateString('ru-RU')}, редакция ${s.version}`
                        : 'Не дано'}
                      {s.outdated && ' · вышла новая редакция'}
                    </p>
                  </div>
                  {required ? (
                    <span className="shrink-0 rounded-full border border-ink-line px-3 py-1 text-xs text-paper-faint">
                      обязательное
                    </span>
                  ) : (
                    <button
                      onClick={() => toggle(s.kind, !s.granted)}
                      disabled={busy === s.kind}
                      className="shrink-0 rounded-full border border-ink-line px-4 py-1.5 text-xs text-paper-dim transition-colors hover:text-paper disabled:opacity-50"
                    >
                      {s.granted ? 'Отозвать' : 'Дать согласие'}
                    </button>
                  )}
                </div>
              );
            })}

          {history.length > 0 && (
            <div className="border-t border-ink-line/60 pt-4">
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="text-xs text-paper-faint transition-colors hover:text-paper"
              >
                {showHistory ? 'Скрыть историю' : `История согласий (${history.length})`}
              </button>
              {showHistory && (
                <ul className="mt-3 space-y-1.5">
                  {history.map((h, i) => (
                    <li key={i} className="text-xs text-paper-faint">
                      {new Date(h.createdAt).toLocaleString('ru-RU')} ·{' '}
                      {CONSENT_LABELS[h.kind]?.title ?? h.kind} ·{' '}
                      {h.granted ? 'дано' : 'отозвано'} · редакция {h.version}
                      {h.source ? ` · ${h.source}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

// ── Уведомления ─────────────────────────────────────────────────────────────

const CHANNELS: { key: keyof NotificationPrefs; title: string; note: string; marketing: boolean }[] =
  [
    { key: 'notifyNews', title: 'Новости Vela', note: 'Что нового в сервисе.', marketing: true },
    {
      key: 'notifyRoutes',
      title: 'Новые маршруты',
      note: 'Воскресный дайджест: свежие маршруты и лучшее за неделю.',
      marketing: true,
    },
    {
      key: 'notifyOffers',
      title: 'Специальные предложения',
      note: 'Скидки и предложения партнёров.',
      marketing: true,
    },
    {
      key: 'notifyReminders',
      title: 'Напоминания о путешествиях',
      note: 'Служебные напоминания по вашим поездкам — не реклама.',
      marketing: false,
    },
  ];

function Notifications() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    account.notifications().then(setPrefs).catch(() => setPrefs(null));
  }, []);

  async function toggle(key: keyof NotificationPrefs, value: boolean) {
    setBusy(key);
    try {
      const next = await account.setNotifications({ [key]: value });
      setPrefs(next);
    } catch (e) {
      // Самая частая причина отказа — включение рекламного канала без согласия
      // на рассылки. Сообщение сервера объясняет это прямым текстом.
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Section
      title="Настройки уведомлений"
      description="Первые три письма — рекламные: они приходят только при согласии на рассылки и прекращаются сразу после его отзыва."
    >
      {!prefs ? (
        <div className="h-24 animate-pulse rounded-xl bg-ink-line/40" />
      ) : (
        <div className="space-y-3">
          {CHANNELS.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={prefs[c.key]}
                disabled={busy === c.key}
                onChange={(e) => toggle(c.key, e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-aurora"
              />
              <span>
                <span className="block text-sm text-paper">{c.title}</span>
                <span className="block text-xs leading-relaxed text-paper-faint">{c.note}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Cookie ──────────────────────────────────────────────────────────────────

function CookieSettings() {
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const c = readConsent();
    setAnalytics(c?.analytics ?? false);
    setMarketing(c?.marketing ?? false);
    setLoaded(true);
  }, []);

  function save() {
    writeConsent({ analytics, marketing });
    // Дублируем решение в историю согласий на сервере: cookie живёт в одном
    // браузере, а доказательство должно существовать независимо от него.
    account
      .setConsents(
        [
          { kind: 'COOKIE_ANALYTICS', granted: analytics, version: DOCUMENT_VERSIONS.COOKIES },
          { kind: 'COOKIE_MARKETING', granted: marketing, version: DOCUMENT_VERSIONS.COOKIES },
        ],
        'settings',
      )
      .catch(() => {
        /* в браузере выбор уже применён — сеть не должна его отменять */
      });
    toast.success('Настройки cookie сохранены');
  }

  return (
    <Section
      title="Cookie и локальное хранилище"
      description={`Обязательные не отключаются — без них не работает вход. Полный перечень — в политике cookies.`}
    >
      {!loaded ? (
        <div className="h-20 animate-pulse rounded-xl bg-ink-line/40" />
      ) : (
        <>
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-aurora"
              />
              <span>
                <span className="block text-sm text-paper">Аналитические</span>
                <span className="block text-xs leading-relaxed text-paper-faint">
                  Обезличенный подсчёт просмотров маршрутов. Отказ немедленно удаляет сохранённый
                  идентификатор посетителя.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-aurora"
              />
              <span>
                <span className="block text-sm text-paper">Маркетинговые</span>
                <span className="block text-xs leading-relaxed text-paper-faint">
                  Сейчас не используются — включение ни на что не влияет.
                </span>
              </span>
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={save}
              className="rounded-full bg-paper px-5 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90"
            >
              Сохранить
            </button>
            <Link
              href={LEGAL_DOCUMENTS.COOKIES.href}
              className="rounded-full border border-ink-line px-5 py-2 text-sm text-paper-dim transition-colors hover:text-paper"
            >
              Политика cookies
            </Link>
          </div>
        </>
      )}
    </Section>
  );
}

// ── Выгрузка ────────────────────────────────────────────────────────────────

function DataExport() {
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await downloadExport();
      toast.success('Файл с вашими данными скачан');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section
      title="Скачать мои данные"
      description="Один файл JSON со всем, что о вас хранится: учётная запись, поездки, сообщения, согласия, журнал действий. Файлы вложений в него не входят — они остаются доступны по ссылкам."
    >
      <button
        onClick={run}
        disabled={busy}
        className="rounded-full border border-ink-line px-5 py-2.5 text-sm text-paper-dim transition-colors hover:text-paper disabled:opacity-50"
      >
        {busy ? 'Собираем…' : 'Скачать выгрузку'}
      </button>
    </Section>
  );
}

// ── Удаление ────────────────────────────────────────────────────────────────

function DangerZone() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await account.remove(password);
      toast.success('Аккаунт удалён');
      // Выходим сами: токен ещё в браузере, но пользователя за ним больше нет —
      // без этого следующий запрос вернул бы «пользователь не найден».
      setTimeout(() => logout(), 600);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-red-400/30 bg-red-400/[0.03] p-6 shadow-soft sm:p-7">
      <h2 className="font-serif text-xl tracking-tightest text-paper">Удалить аккаунт</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-paper-dim">
        Учётная запись и связанные с ней данные удаляются безвозвратно: поездки, сообщения,
        воспоминания, загруженные файлы. В совместных поездках ваши записи останутся, но перестанут
        быть связаны с вами. Отменить удаление нельзя — если данные нужны, сначала скачайте выгрузку.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-5 rounded-full border border-red-400/40 px-5 py-2.5 text-sm text-red-200 transition-colors hover:bg-red-400/10"
        >
          Удалить аккаунт
        </button>
      ) : (
        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.22em] text-paper-faint">
              Пароль для подтверждения
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-xl border border-ink-line bg-transparent px-4 py-2.5 text-sm text-paper outline-none focus:border-aurora/50"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={remove}
              disabled={busy || password.length === 0}
              className="rounded-full bg-red-400/90 px-5 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Удаляем…' : 'Удалить навсегда'}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setPassword('');
              }}
              className="rounded-full border border-ink-line px-5 py-2.5 text-sm text-paper-dim transition-colors hover:text-paper"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
