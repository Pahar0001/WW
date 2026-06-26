'use client';

import { useEffect, useState } from 'react';
import { getTripEstimate, type Comfort, type SpendEstimate } from '@/lib/api';

/**
 * "Примерные траты" — automatic ballpark spend estimate for the trip.
 * Inputs: travellers + comfort tier (minimal). Everything else (duration, number
 * of cities) the backend reads straight from the trip, so a useful number shows
 * up with zero manual data. The figure is an ESTIMATE, never a supplier quote.
 */
const COMFORT_LABEL: Record<Comfort, string> = {
  BUDGET: 'Эконом',
  STANDARD: 'Стандарт',
  COMFORT: 'Комфорт',
};

const CATEGORY_RU: Record<string, string> = {
  HOTELS: 'Жильё',
  FOOD: 'Питание',
  TRANSPORT: 'Транспорт',
  ACTIVITIES: 'Развлечения',
  RESERVE: 'Резерв (10%)',
};

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

export function SpendEstimator({ slug }: { slug: string }) {
  const [travelers, setTravelers] = useState(2);
  const [comfort, setComfort] = useState<Comfort>('STANDARD');
  const [data, setData] = useState<SpendEstimate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getTripEstimate(slug, { travelers, comfort }).then((d) => {
      if (alive) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [slug, travelers, comfort]);

  return (
    <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-2xl tracking-tightest">Примерные траты</h3>
        <span className="rounded-full border border-aurora/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-aurora">
          оценка
        </span>
      </div>

      {/* Controls: travellers + comfort */}
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">Путешественников</div>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              data-cursor="hover"
              onClick={() => setTravelers((t) => Math.max(1, t - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-line text-paper-dim hover:text-paper"
              aria-label="Меньше"
            >
              −
            </button>
            <span className="w-6 text-center text-lg text-paper">{travelers}</span>
            <button
              type="button"
              data-cursor="hover"
              onClick={() => setTravelers((t) => Math.min(20, t + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-line text-paper-dim hover:text-paper"
              aria-label="Больше"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">Уровень комфорта</div>
          <div className="mt-2 flex gap-2">
            {(['BUDGET', 'STANDARD', 'COMFORT'] as Comfort[]).map((c) => (
              <button
                key={c}
                type="button"
                data-cursor="hover"
                onClick={() => setComfort(c)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  c === comfort
                    ? 'border-aurora bg-aurora/10 text-aurora'
                    : 'border-ink-line text-paper-dim hover:text-paper'
                }`}
              >
                {COMFORT_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {loading && !data ? (
        <p className="mt-6 text-sm text-paper-faint">Считаем оценку…</p>
      ) : !data ? (
        <p className="mt-6 text-sm text-paper-faint">Не удалось рассчитать оценку.</p>
      ) : (
        <div className="mt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Per-person breakdown */}
            <div className="divide-y divide-ink-line">
              {data.perPerson.categories.map((l) => (
                <div key={l.category} className="flex items-center justify-between py-2.5">
                  <span className="text-paper-dim">{CATEGORY_RU[l.category] ?? l.category}</span>
                  <span className="text-paper">≈ {fmt(l.amount)} ₽</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="flex flex-col justify-center rounded-xl border border-ink-line bg-ink/20 p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">На человека</div>
              <div className="mt-1 font-serif text-3xl text-aurora">≈ {fmt(data.perPerson.total)} ₽</div>
              <div className="mt-1 text-sm text-paper-faint">
                диапазон {fmt(data.perPerson.low)}–{fmt(data.perPerson.high)} ₽
              </div>
              <div className="mt-5 text-xs uppercase tracking-[0.25em] text-paper-faint">
                На группу ({data.travelers})
              </div>
              <div className="mt-1 font-serif text-2xl text-paper">≈ {fmt(data.group.total)} ₽</div>
              <div className="mt-1 text-sm text-paper-faint">
                диапазон {fmt(data.group.low)}–{fmt(data.group.high)} ₽
              </div>
            </div>
          </div>

          <p className="mt-5 text-xs leading-relaxed text-paper-faint">
            Расчёт автоматический: из длительности ({data.durationDays} дн., {data.nights} ноч.) и
            числа городов маршрута ({data.cities}, переездов {data.transfers}) по типовым дневным
            ставкам на человека для уровня «{COMFORT_LABEL[data.comfort]}». Это{' '}
            <span className="text-aurora">оценка</span>, а не котировка поставщиков — реальные цены
            появятся после подключения провайдеров бронирования.
          </p>
        </div>
      )}
    </div>
  );
}
