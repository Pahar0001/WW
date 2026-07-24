'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { TextReveal } from '@/components/ui/Motion';
import type { Trip } from '@/lib/api';
import { plural } from '@/lib/plural';
import { getHeroMedia } from '@/lib/hero-media';
import { COUNTRY_COORDS, type GlobeMarker } from '@/lib/country-coords';

// WebGL only on the client (no SSR).
const Hero3D = dynamic(() => import('@/components/ui/Hero3D').then((m) => m.Hero3D), {
  ssr: false,
});

const EASE = [0.22, 1, 0.36, 1] as const;

export function HeroImmersive({
  featured,
  tripCount,
  trips = [],
}: {
  featured: Trip | null;
  tripCount: number;
  trips?: Trip[];
}) {
  // Задел под Higgsfield: генеративное фото/видео ложится ПОД 3D-сцену
  // (см. lib/hero-media.ts); без него — текущее поведение, только глобус.
  const media = getHeroMedia();

  // Кликабельные страны на глобусе: одна точка на страну (первый маршрут),
  // реальные координаты из COUNTRY_COORDS.
  const markers: GlobeMarker[] = [];
  const seen = new Set<string>();
  for (const t of trips) {
    const slug = t.country.slug;
    if (!slug || seen.has(slug)) continue;
    const coords = COUNTRY_COORDS[slug];
    if (!coords) continue;
    seen.add(slug);
    markers.push({ slug: t.slug, name: t.country.name, ...coords });
  }
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-[#0d0b08] text-white">
      {media.kind === 'image' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={media.src} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-40" />
      )}
      {media.kind === 'video' && (
        <video
          src={media.src}
          poster={media.poster}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
      )}
      {/* 3D backdrop — глобус интерактивный: наведите на точку-страну и кликните */}
      <div className="absolute inset-0">
        <Hero3D markers={markers} />
      </div>
      {/* Vignette + fades + left scrim for text legibility over the globe */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_50%_40%,transparent_35%,rgba(13,11,8,0.7)_100%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#0d0b08] via-[#0d0b08]/70 to-transparent md:w-3/4" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#0d0b08] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0d0b08] to-transparent" />

      {/* pointer-events-none: клики проходят сквозь текстовый слой к глобусу;
          интерактивные элементы возвращают pointer-events-auto точечно. */}
      <div className="pointer-events-none container-vela relative z-10 flex min-h-[100svh] flex-col justify-center py-28">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          className="mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.34em] text-white/55"
        >
          <span className="h-px w-8 bg-aurora/70" />
          Премиальное планирование путешествий
        </motion.p>

        <h1 className="max-w-4xl font-serif display-1 text-white">
          <TextReveal text={'Путешествия,\nкоторые запоминаются.'} accentFrom={2} accentClassName="text-gold-gradient" />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.5 }}
          className="mt-8 max-w-xl text-lg leading-relaxed text-white/70"
        >
          Готовые маршруты и конструктор по дням, карта, отели и бюджет — на честных
          данных, которые мы не выдумываем. Соберите поездку, которая станет историей.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.62 }}
          className="pointer-events-auto mt-10 flex flex-wrap items-center gap-4"
        >
          <Link
            href="#dream-trips"
            data-magnetic
            className="sheen glow-gold group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-white px-8 py-4 text-sm font-medium text-[#0d0b08] transition-transform duration-500 ease-smooth hover:-translate-y-0.5"
          >
            <span className="relative">Все маршруты</span>
            <span className="relative grid h-8 w-8 place-items-center rounded-full bg-aurora text-aurora-fg transition-transform duration-500 ease-smooth group-hover:translate-x-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </span>
          </Link>
          <Link
            href="/trips/new"
            data-magnetic
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-8 py-4 text-sm font-medium text-white transition-colors duration-500 hover:border-aurora/60"
          >
            Собрать поездку
          </Link>
        </motion.div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: EASE, delay: 0.8 }}
          className="mt-16 flex flex-wrap gap-x-12 gap-y-6 border-t border-white/10 pt-8"
        >
          {[
            { v: String(tripCount), l: `${plural(tripCount, 'готовый', 'готовых', 'готовых')} ${plural(tripCount, 'маршрут', 'маршрута', 'маршрутов')}` },
            { v: '30', l: 'стран в сообществе' },
            { v: '0', l: 'выдуманных цифр' },
          ].map((s) => (
            <div key={s.l}>
              <dt className="font-serif text-3xl tracking-tightest text-white">{s.v}</dt>
              <dd className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">{s.l}</dd>
            </div>
          ))}
        </motion.dl>

        {featured && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: EASE, delay: 1 }}
            className="mt-10"
          >
            <Link
              href={`/trips/${featured.slug}`}
              className="group pointer-events-auto inline-flex items-center gap-3 text-sm text-white/60 transition-colors hover:text-white"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-aurora" />
              Маршрут недели · {featured.title}
              <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          </motion.div>
        )}

        {/* Подсказка про интерактивный глобус */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: EASE, delay: 1.2 }}
          className="mt-6 flex items-center gap-2.5 text-xs uppercase tracking-[0.2em] text-white/40"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aurora/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-aurora/80" />
          </span>
          Точки на глобусе — страны: наведите и откройте маршрут
        </motion.p>
      </div>
    </section>
  );
}
