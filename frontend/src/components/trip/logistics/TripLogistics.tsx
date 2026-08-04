'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getLogistics,
  COMFORT_LABEL,
  TRANSPORT_LABEL,
  type LogisticsPlan,
  type StayOption,
  type TransportOption,
} from '@/lib/logistics';
import { pluralize } from '@/lib/plural';

/**
 * Раздел «Логистика путешествия».
 *
 * Отвечает на вопрос, которого не было в маршруте: как я туда реально доберусь,
 * чем поеду внутри страны и где ночую в первую ночь.
 *
 * ⚠️ Про честность данных. Цены билетов настоящие (Aviasales) и помечены как
 * реальные. Для наземного транспорта цен и времени у нас НЕТ — и здесь прямо
 * написано, что их нет, со ссылкой на перевозчика. Соблазн подставить
 * «примерно 1500 ₽» велик, но это ровно то, что §1 хендоффа запрещает: человек
 * поверит числу и построит на нём бюджет.
 */

const ORIGINS = [
  { iata: 'MOW', city: 'Москва' },
  { iata: 'LED', city: 'Санкт-Петербург' },
  { iata: 'SVX', city: 'Екатеринбург' },
  { iata: 'KZN', city: 'Казань' },
  { iata: 'OVB', city: 'Новосибирск' },
  { iata: 'AER', city: 'Сочи' },
];

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDate(d);
};
const money = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;

export function TripLogistics({ slug, durationDays }: { slug: string; durationDays: number }) {
  const defaultDepart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return isoDate(d);
  }, []);
  const [origin, setOrigin] = useState('MOW');
  const [depart, setDepart] = useState(defaultDepart);
  const [ret, setRet] = useState(addDays(defaultDepart, Math.max(1, durationDays - 1)));
  const [plan, setPlan] = useState<LogisticsPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const onDepart = (v: string) => {
    if (!v) return;
    setDepart(v);
    setRet(addDays(v, Math.max(1, durationDays - 1)));
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getLogistics(slug, { origin, depart, ret }).then((p) => {
      if (!alive) return;
      setPlan(p);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [slug, origin, depart, ret]);

  const inp =
    'rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-aurora/60 [color-scheme:dark]';

  return (
    <div className="space-y-10">
      {/* ── Управление: откуда и когда ── */}
      <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-ink-line bg-ink-soft/40 p-6">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Откуда</span>
          <select className={inp} value={origin} onChange={(e) => setOrigin(e.target.value)}>
            {ORIGINS.map((o) => (
              <option key={o.iata} value={o.iata}>
                {o.city}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Вылет</span>
          <input
            type="date"
            className={inp}
            value={depart}
            min={isoDate(new Date())}
            onChange={(e) => onDepart(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Обратно</span>
          <input
            type="date"
            className={inp}
            value={ret}
            min={addDays(depart, 1)}
            onChange={(e) => e.target.value && setRet(e.target.value)}
          />
        </label>
      </div>

      {loading && <div className="h-40 animate-pulse rounded-2xl bg-ink-line/30" />}

      {!loading && !plan && (
        <p className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6 text-sm text-paper-dim">
          Не удалось загрузить логистику. Обновите страницу — маршрут и остальные разделы
          работают независимо от этого блока.
        </p>
      )}

      {plan && (
        <>
          <HowToGet plan={plan} />
          <GroundTransport options={plan.ground} country={plan.country.name} />
          <Stays title="Где ночевать перед вылетом" options={plan.stays.beforeFlight} />
          <Stays title="Где остановиться в первую ночь" options={plan.stays.firstNight} />
          <Timeline plan={plan} />
        </>
      )}
    </div>
  );
}

// ── 1. Как добраться ────────────────────────────────────────────────────────

function HowToGet({ plan }: { plan: LogisticsPlan }) {
  const { flights, origin, arrival } = plan;
  const real = flights.dataStatus === 'VERIFIED' && flights.offers.length > 0;

  return (
    <Section
      title="Как добраться"
      badge={real ? { text: 'реальные цены Aviasales', tone: 'good' } : undefined}
      subtitle={`${origin.city} → ${plan.country.name}`}
    >
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="text-xs uppercase tracking-[0.22em] text-paper-faint">Аэропорты вылета</h4>
          <ul className="mt-3 space-y-2.5">
            {origin.airports.map((a) => (
              <li key={a.iata} className="text-sm">
                <span className="text-paper">
                  {a.name} <span className="text-paper-faint">({a.iata})</span>
                </span>
                {a.toCity && <p className="text-xs leading-relaxed text-paper-faint">{a.toCity}</p>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="text-xs uppercase tracking-[0.22em] text-paper-faint">Аэропорты прилёта</h4>
          {arrival.airports.length === 0 ? (
            <p className="mt-3 text-sm text-paper-faint">
              Справочника по этой стране пока нет — смотрите варианты в поиске.
            </p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {arrival.airports.map((a) => (
                <li key={a.iata} className="text-sm">
                  <span className="text-paper">
                    {a.name} <span className="text-paper-faint">({a.iata})</span>
                  </span>
                  <p className="text-xs leading-relaxed text-paper-faint">
                    {a.city}
                    {a.distanceKm !== undefined && ` · ${a.distanceKm} км до центра`}
                    {a.toCity && ` · ${a.toCity}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-7 border-t border-ink-line pt-6">
        {real ? (
          <>
            <div className="flex flex-wrap items-baseline gap-3">
              <h4 className="text-xs uppercase tracking-[0.22em] text-paper-faint">Варианты перелёта</h4>
              {flights.fetchedAt && (
                <span className="text-[11px] text-paper-faint">
                  котировка от {new Date(flights.fetchedAt).toLocaleString('ru-RU')}
                </span>
              )}
            </div>
            <ul className="mt-3 space-y-2">
              {flights.offers.slice(0, 5).map((o, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-baseline justify-between gap-3 rounded-xl border border-ink-line/70 px-4 py-3"
                >
                  <span className="text-sm text-paper">
                    {o.originAirport} → {o.destinationAirport}
                    <span className="text-paper-faint">
                      {' · '}
                      {o.transfers === 0
                        ? 'прямой'
                        : pluralize(o.transfers, 'пересадка', 'пересадки', 'пересадок')}
                      {o.airline && ` · ${o.airline}`}
                    </span>
                  </span>
                  <a
                    href={o.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-aurora hover:underline"
                  >
                    {money(o.price)} →
                  </a>
                </li>
              ))}
            </ul>
            {flights.cheapest.length > 0 && (
              <p className="mt-4 text-xs leading-relaxed text-paper-faint">
                Дешевле всего среди найденного:{' '}
                {flights.cheapest
                  .map(
                    (c) =>
                      `${new Date(c.departureAt).toLocaleDateString('ru-RU')} — ${money(c.price)}`,
                  )
                  .join(' · ')}
                . Это выборка из выдачи на выбранные даты, а не прогноз сезонности — за общей
                картиной цен идите в календарь Aviasales.
              </p>
            )}
          </>
        ) : (
          <div>
            <h4 className="text-xs uppercase tracking-[0.22em] text-paper-faint">Варианты перелёта</h4>
            <p className="mt-3 text-sm text-paper-dim">
              {flights.configured
                ? 'На эти даты котировок в кэше нет — цены смотрите в поиске.'
                : 'Поиск билетов не подключён — цены смотрите напрямую.'}
            </p>
            <a
              href={flights.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-block rounded-full border border-ink-line px-5 py-2 text-sm text-paper-dim transition-colors hover:text-paper"
            >
              Открыть поиск Aviasales →
            </a>
          </div>
        )}
      </div>
    </Section>
  );
}

// ── 2. Транспорт внутри страны ──────────────────────────────────────────────

function GroundTransport({ options, country }: { options: TransportOption[]; country: string }) {
  if (options.length === 0) {
    return (
      <Section title="Транспорт внутри страны">
        <p className="text-sm text-paper-dim">
          Справочника по стране «{country}» пока нет. Мы предпочитаем не показывать ничего, чем
          показывать наугад.
        </p>
      </Section>
    );
  }

  return (
    <Section
      title="Транспорт внутри страны"
      subtitle="Чем реально перемещаются между городами"
    >
      <ul className="space-y-3">
        {options.map((o, i) => {
          const meta = TRANSPORT_LABEL[o.kind];
          return (
            <li key={i} className="rounded-xl border border-ink-line/70 p-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span aria-hidden className="text-lg">
                  {meta.icon}
                </span>
                <span className="text-sm text-paper">{o.title}</span>
                <span className="text-xs text-paper-faint">{COMFORT_LABEL[o.comfort]}</span>
                {o.operator && <span className="text-xs text-paper-faint">· {o.operator}</span>}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-paper-dim">{o.notes}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                <span className="text-paper-faint">
                  {o.priceNote ?? 'Стоимость: смотрите у перевозчика'}
                </span>
                <span className="text-paper-faint">
                  {o.durationNote ?? 'Время в пути: зависит от направления'}
                </span>
                {o.url && (
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-aurora hover:underline"
                  >
                    Расписание и билеты →
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-5 text-xs leading-relaxed text-paper-faint">
        Цен и времени в пути мы не приводим намеренно: они зависят от даты, класса и направления и
        меняются в разы. Вместо правдоподобной, но выдуманной таблицы — прямая ссылка к перевозчику,
        где цифры настоящие и на вашу дату.
      </p>
    </Section>
  );
}

// ── 3. Отели у ключевых точек ───────────────────────────────────────────────

function Stays({ title, options }: { title: string; options: StayOption[] }) {
  if (options.length === 0) return null;
  return (
    <Section title={title}>
      <ul className="grid gap-3 md:grid-cols-3">
        {options.map((s, i) => (
          <li key={i} className="rounded-xl border border-ink-line/70 p-4">
            <p className="text-sm text-paper">{s.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-paper-faint">{s.reason}</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {s.links.map((l) => (
                <a
                  key={l.label}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-aurora hover:underline"
                >
                  {l.label} →
                </a>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-xs leading-relaxed text-paper-faint">
        Конкретных отелей с ценами и рейтингами здесь нет: отельного API у нас сейчас нет, а
        придумывать их мы не станем. Ссылки ведут в живой поиск — там цены настоящие.
      </p>
    </Section>
  );
}

// ── 4. Таймлайн ─────────────────────────────────────────────────────────────

function Timeline({ plan }: { plan: LogisticsPlan }) {
  return (
    <Section title="Таймлайн поездки" subtitle="От сборов до последнего дня">
      <ol className="relative space-y-5 border-l border-ink-line pl-6">
        {plan.timeline.map((step) => (
          <li key={step.day} className="relative">
            <span
              aria-hidden
              className="absolute -left-[1.72rem] top-1.5 h-2 w-2 rounded-full bg-aurora/70"
            />
            <p className="text-xs uppercase tracking-[0.22em] text-paper-faint">{step.label}</p>
            <ul className="mt-2 space-y-1.5">
              {step.items.map((it, j) => (
                <li key={j} className="flex gap-2.5 text-sm text-paper-dim">
                  <span aria-hidden>{it.icon}</span>
                  <span>{it.text}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Section>
  );
}

// ── Общая обёртка раздела ───────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: { text: string; tone: 'good' };
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-2xl tracking-tightest">{title}</h3>
        {badge && (
          <span className="rounded-full border border-emerald-300/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
            {badge.text}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1.5 text-sm text-paper-faint">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}
