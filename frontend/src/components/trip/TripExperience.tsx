'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Trip, Pace, Place } from '@/lib/api';
import { imageUrl } from '@/lib/api';
import { TripMap } from '@/components/map/TripMap';
import { PlaceModal } from '@/components/trip/PlaceModal';
import { HotelsSection } from '@/components/trip/HotelsSection';

const PACE_LABEL: Record<Pace, string> = {
  CALM: 'Спокойная',
  BALANCED: 'Сбалансированная',
  ACTIVE: 'Активная',
};

const CATEGORY_RU: Record<string, string> = {
  FLIGHTS: 'Перелёты',
  HOTELS: 'Отели',
  TRANSPORT: 'Транспорт',
  FOOD: 'Питание',
  ACTIVITIES: 'Развлечения',
  RESERVE: 'Резерв',
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'text-amber-300/80 border-amber-300/30',
  ESTIMATED: 'text-aurora border-aurora/30',
  VERIFIED: 'text-emerald-300 border-emerald-300/30',
};

export function TripExperience({ trip }: { trip: Trip }) {
  const order: Pace[] = ['CALM', 'BALANCED', 'ACTIVE'];
  const variants = [...trip.variants].sort(
    (a, b) => order.indexOf(a.pace) - order.indexOf(b.pace),
  );
  const [paceIdx, setPaceIdx] = useState(
    Math.max(0, variants.findIndex((v) => v.pace === 'BALANCED')),
  );
  const variant = variants[paceIdx] ?? variants[0];
  // Open on the first day that actually has places, so clickable places show up.
  const firstWithPlaces =
    variant?.days.find((d) => d.places.length > 0)?.dayNumber ?? 1;
  const [dayNum, setDayNum] = useState(firstWithPlaces);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const day = useMemo(
    () => variant?.days.find((d) => d.dayNumber === dayNum) ?? variant?.days[0],
    [variant, dayNum],
  );

  if (!variant || !day) return null;

  return (
    <div className="space-y-16">
      {/* Pace selector */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="mr-2 text-sm text-paper-faint">Темп:</span>
        {variants.map((v, i) => (
          <button
            key={v.id}
            data-magnetic
            onClick={() => {
              setPaceIdx(i);
              setDayNum(1);
            }}
            className={`rounded-full border px-5 py-2 text-sm transition-colors duration-300 ${
              i === paceIdx
                ? 'border-aurora bg-aurora/10 text-aurora'
                : 'border-ink-line text-paper-dim hover:text-paper'
            }`}
          >
            {PACE_LABEL[v.pace]}
          </button>
        ))}
      </div>

      {/* Day map + timeline */}
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="order-2 lg:order-1">
          <div className="mb-4 flex flex-wrap gap-1.5">
            {variant.days.map((d) => (
              <button
                key={d.id}
                data-cursor="hover"
                onClick={() => setDayNum(d.dayNumber)}
                className={`h-9 w-9 rounded-lg text-sm transition-colors ${
                  d.dayNumber === dayNum
                    ? 'bg-paper text-ink'
                    : 'bg-ink-soft text-paper-dim hover:bg-ink-line'
                }`}
                aria-label={`Day ${d.dayNumber}`}
              >
                {d.dayNumber}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={day.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-ink-line bg-ink-soft/40 p-7"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-[0.25em] text-paper-faint">
                  Day {day.dayNumber} · {day.baseCity}
                </span>
              </div>
              <h3 className="mt-3 font-serif text-2xl tracking-tightest">
                {day.title}
              </h3>

              {/* Transport legs */}
              {day.legs.length > 0 && (
                <div className="mt-5 space-y-2">
                  {day.legs.map((l) => (
                    <div key={l.id} className="flex items-center gap-3 text-sm">
                      <span className="text-paper-dim">
                        {l.fromLabel} → {l.toLabel}
                      </span>
                      <span className="text-paper-faint">·</span>
                      <span className="text-paper-faint">
                        {l.durationMin != null
                          ? `${Math.round(l.durationMin / 60)}h`
                          : 'time —'}
                      </span>
                      <Badge status={l.dataStatus} />
                    </div>
                  ))}
                </div>
              )}

              {/* Places */}
              <ul className="mt-6 space-y-4">
                {day.places.length === 0 ? (
                  <li className="text-sm text-paper-faint">
                    День отдыха / переезд — без фиксированных точек.
                  </li>
                ) : (
                  day.places.map((dp, i) => {
                    const photo = imageUrl(dp.place.photoUrl);
                    return (
                      <li key={dp.id}>
                        <button
                          type="button"
                          data-cursor="hover"
                          onClick={() => setSelectedPlace(dp.place)}
                          className="group flex w-full gap-4 rounded-xl p-2 text-left transition-colors hover:bg-ink-line/40"
                        >
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-aurora text-[11px] font-semibold text-ink">
                            {i + 1}
                          </span>
                          {photo && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={photo}
                              alt={dp.place.name}
                              className="h-16 w-16 shrink-0 rounded-lg border border-ink-line object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-paper">{dp.place.name}</span>
                              {dp.place.nameLocal && (
                                <span className="text-paper-faint">{dp.place.nameLocal}</span>
                              )}
                              <Badge status={dp.place.dataStatus} />
                            </div>
                            {dp.place.description && (
                              <p className="mt-1 text-sm text-paper-dim">
                                {dp.place.description}
                              </p>
                            )}
                            <span className="mt-1.5 inline-block text-xs text-aurora opacity-0 transition-opacity group-hover:opacity-100">
                              Подробнее, фото и как добраться →
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="order-1 lg:order-2">
          <div className="sticky top-6 h-[460px]">
            <TripMap day={day} />
          </div>
        </div>
      </div>

      {/* Где остановиться */}
      <HotelsSection trip={trip} variant={variant} />

      {/* Budget */}
      <BudgetPanel variant={variant} trip={trip} />

      {/* Place detail modal */}
      <PlaceModal place={selectedPlace} onClose={() => setSelectedPlace(null)} />
    </div>
  );
}

const STATUS_RU: Record<string, string> = {
  PENDING: 'данные уточняются',
  ESTIMATED: 'оценка',
  VERIFIED: 'проверено',
};

function Badge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? STATUS_BADGE.PENDING;
  const label = STATUS_RU[status] ?? status.toLowerCase();
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${cls}`}>
      {label}
    </span>
  );
}

function BudgetPanel({ variant, trip }: { variant: Trip['variants'][number]; trip: Trip }) {
  const lines = variant.budget?.lines ?? [];
  const known = lines.filter((l) => l.amount != null);
  const total = known.reduce((a, l) => a + (l.amount ?? 0), 0);
  const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

  return (
    <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-7">
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-2xl tracking-tightest">Бюджет</h3>
        <span className="text-sm text-paper-faint">
          target {trip.budgetMinRub ? fmt(trip.budgetMinRub) : '—'}–
          {trip.budgetMaxRub ? fmt(trip.budgetMaxRub) : '—'} ₽
        </span>
      </div>
      <div className="mt-6 divide-y divide-ink-line">
        {lines.map((l) => (
          <div key={l.category} className="flex items-center justify-between py-3">
            <span className="text-paper-dim">{CATEGORY_RU[l.category] ?? l.category}</span>
            {l.amount != null ? (
              <span className="flex items-center gap-2">
                <span className="text-paper">≈ {fmt(l.amount)} ₽</span>
                {l.dataStatus === 'ESTIMATED' && <Badge status="ESTIMATED" />}
              </span>
            ) : (
              <Badge status="PENDING" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-ink-line pt-4">
        <span className="text-paper-faint">Итого (пересчитывается автоматически)</span>
        <span className="font-medium text-paper">
          {known.length ? `≈ ${fmt(total)} ₽` : 'data pending'}
        </span>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-paper-faint">
        Это <span className="text-aurora">оценка</span>, рассчитанная из заявленного
        бюджета поездки по типовым долям категорий, а не котировка от поставщиков.
        Реальные цены появятся после подключения провайдеров (Trip.com, Skyscanner и
        др.) — до тех пор цифры помечены как оценочные.
      </p>
    </div>
  );
}
