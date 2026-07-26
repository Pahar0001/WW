'use client';

/**
 * Аналитика посещений: сколько смотрят маршруты, какие страны интереснее,
 * откуда приходят. Источник — таблица TripView (маячок на странице маршрута,
 * дедуп по посетителю за 30 минут).
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminAnalytics, type TripAnalytics } from '@/lib/api';
import { auth, isAdminRole, type AuthUser } from '@/lib/auth';
import { AreaChart } from '@/components/admin/AdminDashboard';
import { Skeleton } from '@/components/ui/Skeleton';
import { plural } from '@/lib/plural';

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);
const WINDOWS = [7, 30, 90] as const;

export default function AdminAnalyticsPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<TripAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.me().then((u) => {
      if (!u || !isAdminRole(u.role)) window.location.href = '/login';
      else setMe(u);
    });
  }, []);

  const load = useCallback(async (d: number) => {
    setLoading(true);
    setData(await adminAnalytics(d));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (me) load(days);
  }, [me, days, load]);

  if (me === undefined) {
    return (
      <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">
        Проверка доступа…
      </main>
    );
  }

  const maxTrip = Math.max(1, ...(data?.topTrips.map((t) => t.views) ?? [1]));
  const maxCountry = Math.max(1, ...(data?.topCountries.map((c) => c.views) ?? [1]));

  return (
    <main className="container-vela min-h-screen py-10">
      <header className="mb-12 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" data-magnetic className="font-serif text-xl tracking-tightest">
          Vela
        </Link>
        <div className="flex flex-wrap items-center gap-5 text-sm">
          <Link href="/admin" data-cursor="hover" className="text-paper-dim hover:text-paper">Дашборд</Link>
          <Link href="/admin/users" data-cursor="hover" className="text-paper-dim hover:text-paper">Пользователи</Link>
          <Link href="/admin/orders" data-cursor="hover" className="text-paper-dim hover:text-paper">Заявки</Link>
          <Link href="/" data-cursor="hover" className="text-paper-dim hover:text-paper">← На главную</Link>
        </div>
      </header>

      <p className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
        <span className="h-px w-8 bg-aurora/60" />
        Админка · аналитика
      </p>
      <h1 className="font-serif display-2">Что смотрят</h1>
      <p className="mt-4 max-w-2xl text-lg text-paper-dim">
        Просмотры страниц маршрутов. Повторные заходы одного посетителя в течение 30 минут
        считаются один раз, идентификатор посетителя анонимный.
      </p>

      {/* Окно наблюдения */}
      <div className="mt-8 inline-flex rounded-full border border-ink-line p-1">
        {WINDOWS.map((w) => (
          <button
            key={w}
            onClick={() => setDays(w)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              days === w ? 'bg-aurora text-aurora-fg' : 'text-paper-dim hover:text-paper'
            }`}
          >
            {w} {plural(w, 'день', 'дня', 'дней')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-2xl" />
            ))}
          </div>
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : !data ? (
        <p className="mt-8 rounded-2xl border border-ink-line bg-ink-soft/40 p-6 text-paper-dim">
          Не удалось загрузить аналитику. Обновите страницу — возможно, бэкенд ещё просыпается.
        </p>
      ) : (
        <>
          {/* Сводка */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Всего просмотров" value={fmt(data.totals.all)} note="за всё время" />
            <Stat label="За сутки" value={fmt(data.totals.today)} note="последние 24 часа" />
            <Stat label="За неделю" value={fmt(data.totals.week)} note="последние 7 дней" />
            <Stat
              label="Уникальных гостей"
              value={fmt(data.totals.uniqueVisitors)}
              note={`за ${data.days} ${plural(data.days, 'день', 'дня', 'дней')}`}
            />
          </div>

          {/* Динамика */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <AreaChart data={data.series} label="Просмотры маршрутов" />
            <div className="card-lux rounded-2xl p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">Источники переходов</div>
              {data.referrers.length === 0 ? (
                <p className="mt-4 text-sm text-paper-faint">
                  Пока все заходы прямые — внешних переходов не зафиксировано.
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {data.referrers.map((r) => (
                    <li key={r.source} className="flex items-baseline justify-between gap-4">
                      <span className="truncate text-sm text-paper-dim">{r.source}</span>
                      <span className="font-serif text-paper">{fmt(r.views)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Топ маршрутов и стран */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6">
              <h2 className="font-serif text-xl tracking-tightest">Популярные маршруты</h2>
              {data.topTrips.length === 0 ? (
                <p className="mt-4 text-sm text-paper-faint">Просмотров пока нет.</p>
              ) : (
                <ul className="mt-5 space-y-4">
                  {data.topTrips.map((t, i) => (
                    <li key={t.slug}>
                      <div className="flex items-baseline justify-between gap-3">
                        <Link
                          href={`/trips/${t.slug}`}
                          className="truncate text-paper transition-colors hover:text-aurora"
                        >
                          <span className="mr-2 text-paper-faint">{i + 1}.</span>
                          {t.title}
                        </Link>
                        <span className="shrink-0 font-serif text-paper">{fmt(t.views)}</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-line">
                        <div
                          className="h-full rounded-full bg-aurora/70"
                          style={{ width: `${(t.views / maxTrip) * 100}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-paper-faint">
                        {t.country} · {fmt(t.visitors)}{' '}
                        {plural(t.visitors, 'гость', 'гостя', 'гостей')}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6">
              <h2 className="font-serif text-xl tracking-tightest">Страны по интересу</h2>
              {data.topCountries.length === 0 ? (
                <p className="mt-4 text-sm text-paper-faint">Просмотров пока нет.</p>
              ) : (
                <ul className="mt-5 space-y-4">
                  {data.topCountries.map((c, i) => (
                    <li key={c.country}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="truncate text-paper">
                          <span className="mr-2 text-paper-faint">{i + 1}.</span>
                          {c.country}
                        </span>
                        <span className="shrink-0 font-serif text-paper">{fmt(c.views)}</span>
                      </div>
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-line">
                        <div
                          className="h-full rounded-full bg-aurora/70"
                          style={{ width: `${(c.views / maxCountry) * 100}%` }}
                        />
                      </div>
                      <div className="mt-1 text-[11px] text-paper-faint">
                        {fmt(c.trips)} {plural(c.trips, 'маршрут', 'маршрута', 'маршрутов')} смотрели
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </main>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="card-lux rounded-2xl p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">{label}</div>
      <div className="mt-2 font-serif text-3xl tracking-tightest text-paper">{value}</div>
      <div className="mt-1 text-[11px] text-paper-faint">{note}</div>
    </div>
  );
}
