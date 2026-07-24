'use client';

import { useEffect, useMemo, useState } from 'react';
import { getTravelPlan, type FlightOffer, type TravelPlan } from '@/lib/api';
import { pluralize } from '@/lib/plural';

/**
 * «Перелёт и даты» — реальные цены авиабилетов под выбранные даты (кэш Aviasales
 * через Travelpayouts) + ссылки на отели с этими же датами. Итоговая стоимость
 * поездки складывается честно: билеты — VERIFIED (реальная котировка), расходы
 * на месте — ESTIMATED (расчёт, не котировка). Ничего не выдумывается: если
 * кэша цен нет — показываем прямую ссылку на поиск Aviasales.
 */

const ORIGINS: { iata: string; city: string }[] = [
  { iata: 'MOW', city: 'Москва' },
  { iata: 'LED', city: 'Санкт-Петербург' },
  { iata: 'SVX', city: 'Екатеринбург' },
  { iata: 'KZN', city: 'Казань' },
  { iata: 'OVB', city: 'Новосибирск' },
  { iata: 'AER', city: 'Сочи' },
];

// Читаемые имена перевозчиков для частых IATA-кодов; неизвестные показываем кодом.
const AIRLINES: Record<string, string> = {
  SU: 'Аэрофлот', S7: 'S7 Airlines', DP: 'Победа', U6: 'Уральские авиалинии',
  UT: 'Utair', N4: 'Nordwind', WZ: 'Red Wings', A4: 'Азимут', FV: 'Россия',
  TK: 'Turkish Airlines', PC: 'Pegasus', VF: 'AJet', J2: 'AZAL', A9: 'Georgian Airways',
  KC: 'Air Astana', DV: 'SCAT', B2: 'Belavia', HY: 'Uzbekistan Airways',
  EK: 'Emirates', FZ: 'flydubai', EY: 'Etihad', QR: 'Qatar Airways', GF: 'Gulf Air',
  WY: 'Oman Air', MS: 'EgyptAir', AI: 'Air India', '6E': 'IndiGo', UL: 'SriLankan',
  Q2: 'Maldivian', TG: 'Thai Airways', VN: 'Vietnam Airlines', VJ: 'VietJet Air',
  SQ: 'Singapore Airlines', GA: 'Garuda Indonesia', KE: 'Korean Air', OZ: 'Asiana',
  NH: 'ANA', JL: 'JAL', CA: 'Air China', MU: 'China Eastern', CZ: 'China Southern',
  HU: 'Hainan Airlines', CX: 'Cathay Pacific', JU: 'Air Serbia', W6: 'Wizz Air',
  LH: 'Lufthansa', AF: 'Air France', KL: 'KLM', BA: 'British Airways',
  AZ: 'ITA Airways', IB: 'Iberia', VY: 'Vueling', A3: 'Aegean', OK: 'Czech Airlines',
  LO: 'LOT', OS: 'Austrian', LX: 'SWISS', AY: 'Finnair', UA: 'United',
  DL: 'Delta', AA: 'American Airlines',
};

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);
const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return isoDate(d);
};
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });

function transfersLabel(n: number): string {
  if (n === 0) return 'прямой';
  return pluralize(n, 'пересадка', 'пересадки', 'пересадок');
}

function durationLabel(min: number): string | null {
  if (!min) return null;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} ч ${m} мин в пути` : `${h} ч в пути`;
}

// Прямая ссылка на поиск Aviasales (когда в кэше нет котировок).
function searchUrl(origin: string, dest: string, depart: string, ret: string): string {
  const dm = (iso: string) => `${iso.slice(8, 10)}${iso.slice(5, 7)}`;
  return `https://www.aviasales.ru/search/${origin}${dm(depart)}${dest}${dm(ret)}1`;
}

export function TravelPlanner({
  slug,
  durationDays,
  onBestPrice,
}: {
  slug: string;
  durationDays: number;
  /** Лучшая (минимальная) реальная цена билетов — уходит в «Примерные траты». */
  onBestPrice?: (price: number | null) => void;
}) {
  // Дефолт: вылет через месяц, возвращение по длительности маршрута.
  const defaultDepart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return isoDate(d);
  }, []);
  const [origin, setOrigin] = useState('MOW');
  const [depart, setDepart] = useState(defaultDepart);
  const [ret, setRet] = useState(addDays(defaultDepart, Math.max(1, durationDays - 1)));
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [loading, setLoading] = useState(true);

  // Смена даты вылета сдвигает возвращение на длительность маршрута.
  const onDepart = (v: string) => {
    if (!v) return;
    setDepart(v);
    setRet(addDays(v, Math.max(1, durationDays - 1)));
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getTravelPlan(slug, { origin, depart, ret }).then((p) => {
      if (!alive) return;
      setPlan(p);
      setLoading(false);
      onBestPrice?.(p?.flights?.[0]?.price ?? null);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, origin, depart, ret]);

  const flights = plan?.flights ?? [];
  const best: FlightOffer | null = flights[0] ?? null;
  const inp =
    'rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-aurora/60 [color-scheme:dark]';

  return (
    <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-2xl tracking-tightest">Перелёт и даты</h3>
        <span className="rounded-full border border-emerald-300/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-emerald-300">
          реальные цены Aviasales
        </span>
      </div>
      <p className="mt-2 text-sm text-paper-faint">
        Выберите, когда хотите поехать, — стоимость поездки пересчитается под даты.
      </p>

      {/* Управление: откуда и когда */}
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Откуда</span>
          <select className={inp} value={origin} onChange={(e) => setOrigin(e.target.value)}>
            {ORIGINS.map((o) => (
              <option key={o.iata} value={o.iata}>{o.city}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Вылет</span>
          <input type="date" className={inp} value={depart} min={isoDate(new Date())} onChange={(e) => onDepart(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Обратно</span>
          <input type="date" className={inp} value={ret} min={addDays(depart, 1)} onChange={(e) => e.target.value && setRet(e.target.value)} />
        </label>
        {plan?.destination && (
          <div className="pb-2 text-sm text-paper-dim">
            → {plan.destination.city} ({plan.destination.iata}) · {pluralize(plan.nights, 'ночь', 'ночи', 'ночей')}
          </div>
        )}
      </div>

      {/* Билеты */}
      <div className="mt-6">
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-ink-line/50" />
            ))}
          </div>
        ) : !plan || !plan.configured ? (
          <p className="text-sm text-paper-faint">
            Поиск реальных цен временно недоступен — воспользуйтесь поиском Aviasales по вашим датам.
          </p>
        ) : flights.length === 0 ? (
          <div className="rounded-xl border border-ink-line p-5 text-sm text-paper-dim">
            На эти даты в кэше цен пока пусто — посмотрите живую выдачу:{' '}
            {plan.destination && (
              <a
                href={searchUrl(origin, plan.destination.iata, depart, ret)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-aurora hover:underline"
              >
                открыть поиск Aviasales →
              </a>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {flights.slice(0, 4).map((f, i) => (
              <li
                key={`${f.flightNumber}-${f.departureAt}-${i}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-line px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-paper">{AIRLINES[f.airline] ?? f.airline}</span>
                    <span className="text-xs text-paper-faint">
                      {transfersLabel(Math.max(f.transfers, f.returnTransfers))}
                    </span>
                  </div>
                  <div className="mt-0.5 text-sm text-paper-faint">
                    {fmtDay(f.departureAt)} → {f.returnAt ? fmtDay(f.returnAt) : '—'}
                    {durationLabel(f.durationMin) ? ` · ${durationLabel(f.durationMin)}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-serif text-xl text-paper">{fmt(f.price)} ₽</span>
                  <a
                    href={f.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="hover"
                    className="rounded-full border border-aurora/40 px-4 py-1.5 text-sm text-aurora transition-colors hover:bg-aurora/10"
                  >
                    Выбрать →
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Итог считается ниже, в «Примерных тратах» — туда уходит лучшая цена билетов. */}
      {best && (
        <p className="mt-4 text-xs leading-relaxed text-paper-faint">
          Билеты от <span className="text-emerald-300">{fmt(best.price)} ₽</span> туда-обратно —
          реальная котировка Aviasales на момент запроса; она уже учтена в «Примерных тратах» ниже.
          Цена меняется — финальная будет в выдаче Aviasales.
        </p>
      )}

      {/* Отели под выбранные даты */}
      {plan && plan.hotelLinks.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">
            Отели под эти даты — по городам маршрута
          </div>
          <div className="mt-3 space-y-2">
            {plan.hotelLinks.map((h) => (
              <div
                key={h.city}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-line px-4 py-3"
              >
                <span className="text-paper">{h.city}</span>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Яндекс Путешествия', href: h.yandex },
                    { label: 'Ostrovok', href: h.ostrovok },
                    { label: 'Booking', href: h.booking },
                  ].map((l) => (
                    <a
                      key={l.label}
                      href={l.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-cursor="hover"
                      className="rounded-full border border-ink-line px-4 py-1.5 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper"
                    >
                      {l.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-paper-faint">
            Ссылки открывают живой поиск с вашими датами ({fmtDay(depart)} — {fmtDay(ret)},{' '}
            {pluralize(plan.nights, 'ночь', 'ночи', 'ночей')}).
            Цены отелей мы не выдумываем — только реальная выдача агрегаторов.
          </p>
        </div>
      )}
    </div>
  );
}
