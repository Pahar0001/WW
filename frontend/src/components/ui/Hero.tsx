'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { imageUrl, type Trip } from '@/lib/api';
import { ButtonLink } from '@/components/ui/Button';
import { TextReveal } from '@/components/ui/Motion';
import { plural } from '@/lib/plural';

const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero({ featured, tripCount }: { featured: Trip | null; tripCount: number }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '16%']);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const copyY = useTransform(scrollYProgress, [0, 1], ['0%', '-14%']);
  const hero = imageUrl(featured?.heroImage);

  return (
    <section
      ref={ref}
      className="container-vela relative grid min-h-[calc(100vh-9rem)] grid-cols-1 items-center gap-12 pb-16 pt-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-4"
    >
      {/* Ambient glow */}
      <div className="ambient-glow -left-24 top-4 hidden h-[26rem] w-[26rem] md:block" />
      <div className="ambient-glow right-0 top-1/3 hidden h-[22rem] w-[22rem] opacity-70 lg:block" />

      {/* ── Copy ── */}
      <motion.div style={{ y: copyY }} className="relative z-10">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
          className="mb-6 flex items-center gap-3 text-xs uppercase tracking-[0.32em] text-paper-faint"
        >
          <span className="h-px w-8 bg-aurora/60" />
          Премиальное планирование путешествий
        </motion.p>

        <h1 className="display-1 max-w-2xl font-serif text-balance">
          <TextReveal
            text={'Путешествия,\nкоторые запоминаются.'}
            accentFrom={2}
            accentClassName="text-gold-gradient"
          />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
          className="mt-8 max-w-xl text-lg leading-relaxed text-paper-dim text-balance"
        >
          Выбирайте готовые маршруты или собирайте свой по дням, смотрите каждый шаг
          на карте и понимайте бюджет — на честных данных, которые мы не выдумываем.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.62 }}
          className="mt-10 flex flex-wrap items-center gap-4"
        >
          <ButtonLink href="#dream-trips" variant="primary" size="lg" withArrow magnetic>
            Все маршруты
          </ButtonLink>
          <ButtonLink href="/trips/new" variant="outline" size="lg" magnetic>
            Собрать поездку
          </ButtonLink>
        </motion.div>

        {/* Stats — honest, on-brand (Real Data Policy) */}
        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.8 }}
          className="mt-14 flex flex-wrap gap-x-12 gap-y-6 border-t border-ink-line pt-8"
        >
          {[
            { v: String(tripCount), l: `${plural(tripCount, 'готовый', 'готовых', 'готовых')} ${plural(tripCount, 'маршрут', 'маршрута', 'маршрутов')}` },
            { v: '30', l: 'стран в сообществе' },
            { v: '0', l: 'выдуманных цифр' },
          ].map((s) => (
            <div key={s.l}>
              <dt className="font-serif text-3xl tracking-tightest text-paper">{s.v}</dt>
              <dd className="mt-1 text-xs uppercase tracking-[0.16em] text-paper-faint">{s.l}</dd>
            </div>
          ))}
        </motion.dl>
      </motion.div>

      {/* ── Media panel ── */}
      <motion.div
        initial={{ opacity: 0, scale: 1.03 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: EASE, delay: 0.2 }}
        className="relative z-10 mx-auto w-full max-w-md lg:max-w-none"
      >
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] shadow-soft-lg ring-1 ring-ink-line/60">
          {hero ? (
            <motion.div style={{ y: imgY, scale: imgScale }} className="absolute inset-[-6%]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero} alt={featured?.title ?? ''} className="h-full w-full object-cover" />
            </motion.div>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-ink-soft to-ink" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-transparent" />
          <div className="pointer-events-none absolute inset-0 rounded-[1.75rem] ring-1 ring-inset ring-paper/5" />

          {/* Floating glass card → featured route */}
          {featured && (
            <Link
              href={`/trips/${featured.slug}`}
              data-magnetic
              className="group absolute inset-x-5 bottom-5 flex items-center justify-between gap-4 rounded-2xl glass p-4 shadow-soft"
            >
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.2em] text-paper-faint">
                  {featured.country.name} · {featured.durationDays} дней
                </div>
                <div className="mt-1 truncate font-serif text-lg tracking-tightest text-paper">
                  {featured.title}
                </div>
              </div>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-aurora text-aurora-fg transition-transform duration-500 ease-smooth group-hover:translate-x-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </Link>
          )}
        </div>

        {/* Vertical side label */}
        <div className="pointer-events-none absolute -right-2 top-1/2 hidden -translate-y-1/2 rotate-90 text-[10px] uppercase tracking-[0.4em] text-paper-faint xl:block">
          На честных данных
        </div>
      </motion.div>

      {/* Scroll cue */}
      <div className="pointer-events-none absolute bottom-4 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
        <span className="text-[10px] uppercase tracking-[0.3em] text-paper-faint">Листайте</span>
        <span className="relative h-9 w-px overflow-hidden bg-ink-line">
          <motion.span
            className="absolute inset-x-0 top-0 h-3.5 bg-aurora"
            animate={{ y: [-14, 36] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </div>
    </section>
  );
}
