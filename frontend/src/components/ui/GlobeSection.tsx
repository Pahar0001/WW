'use client';

/**
 * GlobeSection — «Планета Vela»: интерактивный 3D-глобус перед коллекцией.
 *
 * Каждая страна каталога — золотая метка с реальными координатами.
 * Клик по стране:
 *  - один маршрут  → сразу открываем его;
 *  - несколько     → стеклянная панель со списком маршрутов страны.
 * Данные приходят с сервера (список публичных поездок) — ничего не хардкодим.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import type { Trip } from '@/lib/api';
import { COUNTRY_COORDS, type GlobeMarker } from '@/lib/country-coords';
import { pluralize } from '@/lib/plural';

// WebGL — только на клиенте.
const Hero3D = dynamic(() => import('@/components/ui/Hero3D').then((m) => m.Hero3D), {
  ssr: false,
});

interface CountryTrips {
  name: string;
  trips: { slug: string; title: string; durationDays: number }[];
}

export function GlobeSection({ trips }: { trips: Trip[] }) {
  const router = useRouter();
  const [panel, setPanel] = useState<CountryTrips | null>(null);

  // Группировка маршрутов по странам + маркеры с реальными координатами.
  const { markers, byCountry } = useMemo(() => {
    const byCountry = new Map<string, CountryTrips>();
    for (const t of trips) {
      const slug = t.country.slug;
      if (!slug || !COUNTRY_COORDS[slug]) continue;
      const entry = byCountry.get(slug) ?? { name: t.country.name, trips: [] };
      entry.trips.push({ slug: t.slug, title: t.title, durationDays: t.durationDays });
      byCountry.set(slug, entry);
    }
    const markers: GlobeMarker[] = [...byCountry.entries()].map(([slug, c]) => ({
      // slug маркера — slug ПЕРВОГО маршрута (для фолбэка), имя — страна.
      slug: c.trips[0].slug,
      name: c.name,
      countrySlug: slug,
      ...COUNTRY_COORDS[slug],
    })) as GlobeMarker[];
    return { markers, byCountry };
  }, [trips]);

  const onSelect = (m: GlobeMarker) => {
    // Находим страну по имени маркера (имя уникально в каталоге).
    const entry = [...byCountry.values()].find((c) => c.name === m.name);
    if (!entry) return;
    if (entry.trips.length === 1) router.push(`/trips/${entry.trips[0].slug}`);
    else setPanel(entry);
  };

  if (markers.length === 0) return null;

  return (
    <section data-tour="globe" className="relative overflow-hidden bg-[#0d0b08] py-20 text-white">
      {/* Мягкое золотое свечение фона */}
      <div className="ambient-glow left-1/2 top-0 h-72 w-72 -translate-x-1/2 opacity-60" />

      <div className="container-vela relative">
        <p className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-white/50">
          <span className="h-px w-8 bg-aurora/70" />
          Планета Vela
        </p>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-2xl font-serif display-2">
            Выберите страну <span className="text-gold-gradient">на глобусе</span>
          </h2>
          <p className="max-w-sm text-sm leading-relaxed text-white/55">
            Золотые точки — страны каталога. Наведите, чтобы увидеть название,
            кликните — откроется путешествие. Глобус можно вращать рукой.
          </p>
        </div>
      </div>

      {/* Глобус */}
      <div className="relative mx-auto h-[70vh] min-h-[480px] max-w-6xl">
        <Hero3D markers={markers} onSelect={onSelect} />

        {/* Панель выбора, когда у страны несколько маршрутов */}
        <AnimatePresence>
          {panel && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="absolute bottom-6 left-1/2 z-20 w-[min(92vw,460px)] -translate-x-1/2 rounded-2xl border border-aurora/30 bg-[#0d0b08]/90 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-lg"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-2xl tracking-tightest">{panel.name}</h3>
                <button
                  type="button"
                  onClick={() => setPanel(null)}
                  className="text-sm text-white/50 transition-colors hover:text-white"
                  aria-label="Закрыть"
                >
                  Закрыть ✕
                </button>
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/45">
                {pluralize(panel.trips.length, 'маршрут', 'маршрута', 'маршрутов')}
              </p>
              <ul className="mt-4 space-y-2">
                {panel.trips.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/trips/${t.slug}`}
                      className="group flex items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3 transition-colors hover:border-aurora/50 hover:bg-aurora/5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-white">{t.title}</span>
                        <span className="text-xs text-white/45">
                          {pluralize(t.durationDays, 'день', 'дня', 'дней')}
                        </span>
                      </span>
                      <span className="text-aurora transition-transform duration-300 group-hover:translate-x-1">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
