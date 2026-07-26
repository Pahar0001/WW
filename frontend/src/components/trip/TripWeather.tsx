'use client';

/**
 * Прогноз погоды по городам маршрута (Open-Meteo, реальный источник → VERIFIED).
 * Ленты на 7 дней: день недели, значок по weather code (WMO), t° max/min,
 * вероятность осадков. Если API недоступен — блок просто не показывается.
 */

import { useEffect, useState } from 'react';

interface DayForecast {
  date: string;
  tMax: number;
  tMin: number;
  precipProbMax: number | null;
  weatherCode: number;
}

interface CityForecast {
  city: string;
  days: DayForecast[];
}

interface TripWeather {
  source: string;
  fetchedAt: string;
  cities: CityForecast[];
}

/** WMO weather code → значок + подпись (по официальной таблице кодов). */
function wmo(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: '☀️', label: 'ясно' };
  if (code <= 2) return { icon: '🌤', label: 'малооблачно' };
  if (code === 3) return { icon: '☁️', label: 'пасмурно' };
  if (code <= 48) return { icon: '🌫', label: 'туман' };
  if (code <= 57) return { icon: '🌦', label: 'морось' };
  if (code <= 67) return { icon: '🌧', label: 'дождь' };
  if (code <= 77) return { icon: '🌨', label: 'снег' };
  if (code <= 82) return { icon: '🌧', label: 'ливни' };
  if (code <= 86) return { icon: '🌨', label: 'снегопад' };
  return { icon: '⛈', label: 'гроза' };
}

const DAY_RU = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export function TripWeather({ slug }: { slug: string }) {
  const [data, setData] = useState<TripWeather | null | undefined>(undefined);

  useEffect(() => {
    fetch(`/api/weather/trip/${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d && d.cities?.length ? d : null))
      .catch(() => setData(null));
  }, [slug]);

  if (!data) return null; // нет данных — честно ничего не показываем

  return (
    <section className="container-vela pb-16">
      <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl tracking-tightest">Погода сейчас</h2>
          <span className="text-[11px] uppercase tracking-[0.18em] text-paper-faint">
            прогноз на 7 дней · {data.source} ·{' '}
            <span className="text-emerald-500/80">проверено</span>
          </span>
        </div>

        <div className="mt-6 space-y-6">
          {data.cities.map((c) => (
            <div key={c.city}>
              <div className="mb-2.5 flex items-center gap-2 text-sm text-paper">
                <span className="h-1.5 w-1.5 rounded-full bg-aurora" />
                {c.city}
              </div>
              <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                {c.days.map((d) => {
                  const w = wmo(d.weatherCode);
                  const date = new Date(d.date);
                  return (
                    <div
                      key={d.date}
                      title={`${w.label}${d.precipProbMax != null ? ` · осадки ${d.precipProbMax}%` : ''}`}
                      className="flex min-w-[76px] flex-1 flex-col items-center gap-1 rounded-xl border border-ink-line bg-ink px-2 py-3"
                    >
                      <span className="text-[11px] uppercase tracking-wider text-paper-faint">
                        {DAY_RU[date.getDay()]} {date.getDate()}
                      </span>
                      <span className="text-xl leading-none">{w.icon}</span>
                      <span className="text-sm text-paper">{d.tMax}°</span>
                      <span className="text-xs text-paper-faint">{d.tMin}°</span>
                      {d.precipProbMax != null && d.precipProbMax >= 30 && (
                        <span className="text-[10px] text-sky-400/90">💧{d.precipProbMax}%</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
