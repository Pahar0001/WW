'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { listMyTrips, imageUrl, type Trip } from '@/lib/api';
import { getToken } from '@/lib/auth';

/**
 * "Мои поездки" — trips the logged-in user belongs to (created or invited to),
 * including private ones. Hidden entirely for guests and when the list is empty.
 */
export function MyTrips() {
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      setTrips([]);
      return;
    }
    setLoggedIn(true);
    listMyTrips().then(setTrips);
  }, []);

  // Hidden entirely for guests; logged-in users always see the section header
  // with a "create trip" action, even before they have any trips.
  if (!loggedIn || !trips) return null;

  return (
    <section className="container-vela pt-24">
      <div className="mb-10 flex items-end justify-between border-b border-ink-line pb-6">
        <h2 className="font-serif text-3xl tracking-tightest md:text-4xl">Мои поездки</h2>
        <Link
          href="/trips/new"
          data-cursor="hover"
          className="rounded-full bg-aurora px-4 py-2 text-sm font-medium text-aurora-fg transition-transform hover:scale-[1.03]"
        >
          + Создать поездку
        </Link>
      </div>
      {trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-line p-10 text-center text-paper-dim">
          У вас пока нет поездок. Соберите свой первый маршрут — по дням, с темпом и участниками.
        </div>
      ) : (
      <div className="grid gap-6 md:grid-cols-2">
        {trips.map((t) => {
          const hero = imageUrl(t.heroImage);
          return (
            <Link
              key={t.id}
              href={`/trips/${t.slug}`}
              data-magnetic
              className="group block overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/60 transition-colors duration-500 hover:border-aurora/40"
            >
              {hero && (
                <div className="relative h-40 w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={hero}
                    alt={t.title}
                    className="h-full w-full object-cover opacity-80 transition-transform duration-700 ease-smooth group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-soft to-transparent" />
                </div>
              )}
              <div className="p-7">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.25em] text-paper-faint">
                    {t.country.name}
                  </span>
                  {t.visibility === 'PRIVATE' && (
                    <span className="rounded-full border border-aurora/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-aurora">
                      Приватная
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-serif text-2xl tracking-tightest">{t.title}</h3>
                {t.subtitle && <p className="mt-2 text-paper-dim">{t.subtitle}</p>}
                <div className="mt-6 text-sm text-aurora opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  Открыть →
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      )}
    </section>
  );
}
