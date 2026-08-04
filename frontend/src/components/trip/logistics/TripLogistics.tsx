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
import { RouteDiagram } from './RouteDiagram';
import { LogisticsMap } from './LogisticsMap';

/**
 * Раздел «Логистика путешествия».
 *
 * Отвечает на вопрос, которого не было в маршруте: как я туда реально доберусь,
 * чем поеду внутри страны, где ночую в первую ночь и что будет, когда вернусь.
 *
 * Порядок блоков — это порядок подготовки поездки, а не порядок написания кода:
 * сначала перелёт с настоящей ценой, потом карта, потом день за днём, потом
 * земля, ночёвки, машина и возвращение. Первый экран отвечает на главный вопрос
 * и стоит дороже остальных по вниманию — дальше плотность нарастает.
 *
 * ⚠️ Про честность данных. Цены билетов настоящие (Aviasales) и помечены. Для
 * наземного транспорта цен и времени у нас НЕТ — и здесь прямо написано, что их
 * нет, со ссылкой на перевозчика. Соблазн подставить «примерно 1500 ₽» велик,
 * но человек поверит числу и построит на нём бюджет.
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
    <div className="space-y-8">
      {/* Панель дат липкая: она управляет всем содержимым ниже, и уезжать
          из виду вместе с прокруткой ей нельзя. */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-ink-line bg-ink/85 px-4 py-4 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-6">
        <div className="flex flex-wrap items-end gap-4">
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
      </div>

      {loading && <div className="h-64 animate-pulse rounded-2xl bg-ink-line/30" />}

      {!loading && !plan && (
        <p className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6 text-sm text-paper-dim">
          Не удалось загрузить логистику. Обновите страницу — маршрут и остальные разделы работают
          независимо от этого блока.
        </p>
      )}

      {plan && (
        <>
          <HowToGet plan={plan} />
          {plan.map.length >= 2 && (
            <Section title="Маршрут на карте" subtitle="Откуда летим и куда прилетаем">
              <LogisticsMap points={plan.map} />
            </Section>
          )}
          <Timeline plan={plan} />
          <GroundTransport options={plan.ground} country={plan.country.name} />
          <Stays
            title="Где ночевать"
            groups={[
              { label: 'Перед вылетом', options: plan.stays.beforeFlight },
              { label: 'Первая ночь на месте', options: plan.stays.firstNight },
            ]}
          />
          <Parking plan={plan} />
          <ReturnHome plan={plan} />
        </>
      )}
    </div>
  );
}

// ── 1. Как добраться ────────────────────────────────────────────────────────

function HowToGet({ plan }: { plan: LogisticsPlan }) {
  const { flights, origin, arrival, earlyDeparture } = plan;
  const best = flights.offers[0];
  const real = flights.dataStatus === 'VERIFIED' && !!best;

  return (
    <Section
      title="Как добраться"
      subtitle={`${origin.city} → ${plan.country.name}`}
      badge={real ? { text: 'реальные цены Aviasales', tone: 'good' } : undefined}
    >
      {/* Первый экран: схема перелёта и цена крупно. Это то, ради чего сюда
          пришли, — остальное ниже и мельче. */}
      {real ? (
        <div className="rounded-2xl border border-ink-line/70 bg-ink/40 p-6 sm:p-7">
          <RouteDiagram offer={best} />
          <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-t border-ink-line/60 pt-6">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-paper-faint">
                от · туда и обратно, на человека
              </p>
              <p className="mt-1 font-serif text-4xl leading-none tracking-tightest text-paper sm:text-5xl">
                {money(best.price)}
              </p>
              {flights.fetchedAt && (
                <p className="mt-2 text-[11px] text-paper-faint">
                  котировка от {new Date(flights.fetchedAt).toLocaleString('ru-RU')}
                </p>
              )}
            </div>
            <a
              href={best.link}
              target="_blank"
              rel="noopener noreferrer"
              data-magnetic
              className="rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink transition-opacity hover:opacity-90"
            >
              Смотреть билеты →
            </a>
          </div>

          {earlyDeparture && (
            <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/[0.05] px-4 py-3 text-sm leading-relaxed text-paper-dim">
              <span className="text-amber-200">Вылет в {earlyDeparture.time}.</span> Общественный
              транспорт в это время ещё не ходит — заложите ночь рядом с аэропортом или ночной
              трансфер.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-ink-line/70 bg-ink/40 p-6">
          <p className="text-sm text-paper-dim">
            {flights.configured
              ? 'На эти даты котировок в кэше нет — цены смотрите в поиске.'
              : 'Поиск билетов не подключён — цены смотрите напрямую.'}
          </p>
          <a
            href={flights.searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-full border border-ink-line px-5 py-2.5 text-sm text-paper-dim transition-colors hover:text-paper"
          >
            Открыть поиск Aviasales →
          </a>
        </div>
      )}

      {/* Остальные варианты — плотным списком под главным. */}
      {real && flights.offers.length > 1 && (
        <ul className="mt-4 space-y-1.5">
          {flights.offers.slice(1, 5).map((o, i) => (
            <li
              key={i}
              className="flex flex-wrap items-baseline justify-between gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors hover:bg-ink-soft/60"
            >
              <span className="text-paper-dim">
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
                className="text-aurora hover:underline"
              >
                {money(o.price)}
              </a>
            </li>
          ))}
        </ul>
      )}

      {flights.cheapest.length > 1 && (
        <p className="mt-4 text-xs leading-relaxed text-paper-faint">
          Дешевле всего среди найденного:{' '}
          {flights.cheapest
            .map((c) => `${new Date(c.departureAt).toLocaleDateString('ru-RU')} — ${money(c.price)}`)
            .join(' · ')}
          . Это выборка из выдачи на выбранные даты, а не прогноз сезонности.
        </p>
      )}

      {/* Аэропорты — справочно, ниже главного. */}
      <div className="mt-8 grid gap-6 border-t border-ink-line/60 pt-6 md:grid-cols-2">
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
    <Section title="Транспорт внутри страны" subtitle="Чем реально перемещаются между городами">
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
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                {o.priceNote ? (
                  <span className="text-xs text-paper-faint">{o.priceNote}</span>
                ) : (
                  <NoData>цены зависят от даты</NoData>
                )}
                {o.url && (
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-ink-line px-3.5 py-1.5 text-xs text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper"
                  >
                    Расписание и цены →
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

// ── 3. Ночёвки ──────────────────────────────────────────────────────────────

function Stays({
  title,
  groups,
}: {
  title: string;
  groups: { label: string; options: StayOption[] }[];
}) {
  const filled = groups.filter((g) => g.options.length > 0);
  if (filled.length === 0) return null;

  return (
    <Section title={title}>
      <div className="space-y-7">
        {filled.map((g) => (
          <div key={g.label}>
            <h4 className="text-xs uppercase tracking-[0.22em] text-paper-faint">{g.label}</h4>
            {/* На телефоне — лента с прилипанием вместо столбика одинаковых
                блоков: так видно, что вариантов несколько. */}
            <ul className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
              {g.options.map((s, i) => (
                <li
                  key={i}
                  className="w-[85%] shrink-0 snap-start rounded-xl border border-ink-line/70 p-4 md:w-auto"
                >
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
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-paper-faint">
        Конкретных отелей с ценами и рейтингами здесь нет: отельного API у нас сейчас нет, а
        придумывать их мы не станем. Ссылки ведут в живой поиск — там цены настоящие.
      </p>
    </Section>
  );
}

// ── 4. Парковка ─────────────────────────────────────────────────────────────

function Parking({ plan }: { plan: LogisticsPlan }) {
  if (plan.parking.length === 0) return null;

  return (
    <Section
      title="Если едете в аэропорт на машине"
      subtitle="Где оставить её на время поездки"
    >
      <div className="space-y-5">
        {plan.parking.map((p) => (
          <div key={p.iata}>
            <h4 className="text-xs uppercase tracking-[0.22em] text-paper-faint">
              {p.airport} · {p.iata}
            </h4>
            <ul className="mt-3 space-y-2.5">
              {p.options.map((o, i) => (
                <li key={i} className="rounded-xl border border-ink-line/70 p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <span className="text-sm text-paper">{o.title}</span>
                    <a
                      href={o.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-aurora hover:underline"
                    >
                      Тарифы и бронь →
                    </a>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-paper-faint">{o.note}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs leading-relaxed text-paper-faint">
        Тарифов мы не приводим: они зависят от срока, зоны и того, бронировали ли вы заранее.
        Прикиньте сами — на поездку в неделю парковка нередко выходит дороже такси в оба конца.
      </p>
    </Section>
  );
}

// ── 5. Возвращение домой ────────────────────────────────────────────────────

function ReturnHome({ plan }: { plan: LogisticsPlan }) {
  if (plan.returnHome.stays.length === 0) return null;

  return (
    <Section
      title="Возвращение домой"
      subtitle="То, о чём вспоминают уже в самолёте"
    >
      <p className="text-sm leading-relaxed text-paper-dim">
        Если рейс домой приземляется ночью, аэроэкспресс уже не ходит, а метро закрыто. Ночное такси
        через весь город обычно стоит как номер рядом с терминалом — иногда проще выспаться и уехать
        утром.
      </p>

      <ul className="mt-5 space-y-2.5">
        {plan.returnHome.airports
          .filter((a) => a.lateNight)
          .map((a) => (
            <li key={a.iata} className="rounded-xl border border-ink-line/70 p-4">
              <p className="text-sm text-paper">
                {a.name} <span className="text-paper-faint">({a.iata})</span>
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-paper-faint">{a.lateNight}</p>
            </li>
          ))}
      </ul>

      <div className="mt-6">
        <h4 className="text-xs uppercase tracking-[0.22em] text-paper-faint">
          Переночевать рядом с аэропортом
        </h4>
        <ul className="mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-3 md:overflow-visible">
          {plan.returnHome.stays.map((s, i) => (
            <li
              key={i}
              className="w-[85%] shrink-0 snap-start rounded-xl border border-ink-line/70 p-4 md:w-auto"
            >
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
      </div>

      <p className="mt-5 text-xs leading-relaxed text-paper-faint">
        Точное время прилёта домой мы не показываем: в выдаче есть время вылета обратно и суммарная
        продолжительность за оба плеча, но нет ни времени по плечам, ни часовых поясов — посчитать
        из этого час посадки было бы гаданием. Посмотрите его в своём билете.
      </p>
    </Section>
  );
}

// ── 6. Таймлайн ─────────────────────────────────────────────────────────────

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

// ── Общие части ─────────────────────────────────────────────────────────────

/**
 * «Данных нет» — это наша осознанная позиция, а не дырка в интерфейсе, и
 * выглядеть она должна намеренно. Раньше эта строка была набрана тем же серым,
 * что и данные, и читалась как недоделка.
 */
function NoData({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-line/70 px-2.5 py-1 text-[11px] text-paper-faint">
      <span aria-hidden className="h-1 w-1 rounded-full bg-paper-faint/60" />
      {children}
    </span>
  );
}

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
