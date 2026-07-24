'use client';

import { useState } from 'react';
import Link from 'next/link';
import { imageUrl, type Trip } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { FadeIn } from '@/components/ui/Motion';

const PREVIEW = 4; // сколько маршрутов показываем в свёрнутом виде

export function TripCollection({ trips }: { trips: Trip[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? trips : trips.slice(0, PREVIEW);
  const hidden = trips.length - visible.length;

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {visible.map((t, i) => {
          const hero = imageUrl(t.heroImage);
          return (
            <FadeIn key={t.id} delay={Math.min(i, PREVIEW) * 0.05}>
              <Card href={`/trips/${t.slug}`} className="group h-full overflow-hidden">
                {hero && (
                  <div className="relative h-60 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={hero}
                      alt={t.title}
                      className="h-full w-full object-cover transition-transform duration-[1.4s] ease-smooth group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink-soft via-ink-soft/10 to-transparent" />
                    <span className="absolute left-5 top-5 rounded-full glass px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-paper">
                      {t.country.name}
                    </span>
                  </div>
                )}
                <div className="p-8">
                  <div className="flex items-baseline justify-between text-xs text-paper-faint">
                    <span className="uppercase tracking-[0.22em]">{t.seasonLabel ?? 'Круглый год'}</span>
                    <span>{t.durationDays} дней</span>
                  </div>
                  <h3 className="mt-4 font-serif text-2xl tracking-tightest text-paper md:text-3xl">{t.title}</h3>
                  {t.subtitle && <p className="mt-2 text-paper-dim">{t.subtitle}</p>}
                  <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-aurora">
                    Открыть маршрут
                    <span className="transition-transform duration-500 ease-smooth group-hover:translate-x-1">→</span>
                  </div>
                </div>
              </Card>
            </FadeIn>
          );
        })}

        {/* Пригласительная карточка — собрать свой маршрут */}
        <FadeIn delay={0.05}>
          <Link
            href="/trips/new"
            className="group relative flex h-full min-h-[20rem] flex-col justify-between overflow-hidden rounded-2xl border border-dashed border-ink-line p-8 transition-colors duration-500 hover:border-aurora/50"
          >
            <div className="ambient-glow -right-10 -top-10 h-40 w-40 opacity-70" />
            <span className="relative grid h-12 w-12 place-items-center rounded-full bg-aurora/10 text-aurora transition-colors duration-300 group-hover:bg-aurora/20">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <div className="relative">
              <h3 className="font-serif text-2xl tracking-tightest text-paper md:text-3xl">Соберите свой маршрут</h3>
              <p className="mt-2 max-w-xs text-paper-dim">По дням, под ваш темп и бюджет — с картой, отелями и календарём.</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-aurora">
                Начать
                <span className="transition-transform duration-500 ease-smooth group-hover:translate-x-1">→</span>
              </span>
            </div>
          </Link>
        </FadeIn>
      </div>

      {trips.length > PREVIEW && (
        <div className="mt-10 flex justify-center">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="group inline-flex items-center gap-2.5 rounded-full border border-ink-line px-7 py-3.5 text-sm font-medium text-paper transition-colors hover:border-aurora/50"
          >
            {expanded ? 'Свернуть список' : `Показать все — ещё ${hidden}`}
            <span
              className={`transition-transform duration-500 ease-smooth ${expanded ? 'rotate-180' : ''} group-hover:translate-y-0.5`}
            >
              ↓
            </span>
          </button>
        </div>
      )}
    </>
  );
}
