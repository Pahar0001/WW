'use client';

/**
 * HeroVideo — кинематографический первый экран: полёт, управляемый скроллом.
 *
 * Устройство:
 *  - секция высотой SCROLL_VH (≈420vh): это «длина плёнки» — чем выше,
 *    тем медленнее и вальяжнее листается полёт;
 *  - внутри секции sticky-вьюпорт (100svh): видео и оверлеи приклеены,
 *    прокручивается только страница;
 *  - ScrollController (rAF + сглаживание) отдаёт прогресс 0..1,
 *    VideoScrubber переводит его в currentTime (сик-очередь без рывков),
 *    MotionController считает все производные значения (титры, выход);
 *  - значения пишутся НАПРЯМУЮ в style через refs — ни одного setState
 *    в горячем цикле, React не ре-рендерится на скролле вообще.
 *
 * Слои (снизу вверх):
 *  видео (SVG-грейдинг) → виньетка → HalftoneOverlay → PaperNoise →
 *  контент (титры/CTA/подсказка) → занавес выхода → линия таймлайна.
 *
 * Доступность/деградация: prefers-reduced-motion → статичный кадр-постер
 * без скраб-полотна; видео недоступно → постер (никаких дыр).
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ScrollController } from './ScrollController';
import { VideoScrubber } from './VideoScrubber';
import { computeMotion } from './MotionController';
import { buildGradeSvg, GRADE_FILTER_ID } from './ColorGrading';
import { HalftoneOverlay } from './HalftoneOverlay';
import { PaperNoise } from './PaperNoise';

const SCROLL_VH = 420; // «длина плёнки» в vh — главная ручка темпа

export function HeroVideo({
  src,
  poster,
  eyebrow = 'Премиальное планирование путешествий',
  titleTop = 'Путешествия,',
  titleAccent = 'которые запоминаются.',
  subtitle = 'Готовые маршруты и конструктор по дням, карта, отели и бюджет — на честных данных. Листайте — полёт управляется вами.',
}: {
  src: string;
  poster?: string;
  eyebrow?: string;
  titleTop?: string;
  titleAccent?: string;
  subtitle?: string;
}) {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const titleEl = useRef<HTMLDivElement>(null);
  const hintEl = useRef<HTMLDivElement>(null);
  const exitEl = useRef<HTMLDivElement>(null);
  const outroEl = useRef<HTMLDivElement>(null);
  const lineEl = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (reduced) return;
    const sec = section.current;
    const vid = video.current;
    if (!sec || !vid) return;

    const controller = new ScrollController(sec);
    const scrubber = new VideoScrubber(vid);

    // Один подписчик на кадр: сик видео + прямые записи в style.
    const unsub = controller.subscribe(({ progress }) => {
      scrubber.setProgress(progress);
      const m = computeMotion(progress);
      if (titleEl.current) {
        titleEl.current.style.opacity = String(m.titleOpacity);
        titleEl.current.style.transform = `translateY(${m.titleY}px)`;
      }
      if (hintEl.current) hintEl.current.style.opacity = String(m.hintOpacity);
      if (exitEl.current) exitEl.current.style.opacity = String(m.exitOpacity);
      if (outroEl.current) outroEl.current.style.opacity = String(m.outroOpacity);
      if (lineEl.current) lineEl.current.style.transform = `scaleX(${m.timeline})`;
      vid.style.transform = `scale(${m.videoScale})`;
    });

    return () => {
      unsub();
      controller.destroy();
      scrubber.destroy();
    };
  }, [reduced]);

  return (
    <section
      ref={section}
      className="relative bg-[#0d0b08]"
      style={{ height: reduced ? '100svh' : `${SCROLL_VH}vh` }}
    >
      {/* SVG-фильтр цветокоррекции (см. ColorGrading.ts) */}
      <span aria-hidden dangerouslySetInnerHTML={{ __html: buildGradeSvg() }} />

      {/* Приклеенный кино-вьюпорт */}
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* Кадр. preload=auto: faststart-mp4 качается прогрессивно,
            скраб доступен по мере буферизации. */}
        <video
          ref={video}
          src={src}
          poster={poster}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
          style={{ filter: `url(#${GRADE_FILTER_ID})`, transform: 'scale(1.06)' }}
        />

        {/* Виньетка + нижний скрим для читаемости титров на любом кадре */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_35%,transparent_45%,rgba(13,11,8,0.55)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#0d0b08]/85 to-transparent" />

        {/* Типографская фактура: растр из квадратов + живое зерно бумаги */}
        <HalftoneOverlay />
        <PaperNoise />

        {/* Титры. pointer-events только у ссылок — остальное прозрачно. */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-end">
          <div className="container-vela w-full pb-24 md:pb-28">
            <div ref={titleEl} style={{ opacity: 0 }}>
              <p className="mb-5 flex items-center gap-3 text-xs uppercase tracking-[0.34em] text-white/60">
                <span className="h-px w-8 bg-aurora/70" />
                {eyebrow}
              </p>
              <h1 className="max-w-4xl font-serif display-1 text-white [text-shadow:0_2px_24px_rgba(0,0,0,0.6)]">
                {titleTop}
                <br />
                <span className="text-gold-gradient">{titleAccent}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80 [text-shadow:0_1px_12px_rgba(0,0,0,0.7)]">
                {subtitle}
              </p>
              <div className="pointer-events-auto mt-9 flex flex-wrap items-center gap-4">
                <Link
                  href="#dream-trips"
                  data-magnetic
                  className="sheen glow-gold group inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-medium text-[#0d0b08] transition-transform duration-500 ease-smooth hover:-translate-y-0.5"
                >
                  Все маршруты
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-aurora text-aurora-fg transition-transform duration-500 group-hover:translate-x-0.5">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </span>
                </Link>
                <Link
                  href="/order"
                  data-magnetic
                  className="inline-flex items-center rounded-full border border-white/25 px-8 py-4 text-sm font-medium text-white transition-colors duration-500 hover:border-aurora/60"
                >
                  Заказать путешествие
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Подсказка «полёт листается» — исчезает после первого движения */}
        {!reduced && (
          <div
            ref={hintEl}
            className="pointer-events-none absolute inset-x-0 bottom-7 z-10 flex flex-col items-center gap-2 text-white/55"
          >
            <span className="text-[11px] uppercase tracking-[0.3em]">Листайте — вы управляете полётом</span>
            <span className="h-8 w-px animate-pulse bg-gradient-to-b from-aurora/80 to-transparent" />
          </div>
        )}

        {/* Финальная подпись перед переходом */}
        <div
          ref={outroEl}
          style={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <p className="px-6 text-center font-serif text-3xl tracking-tightest text-white/90 md:text-4xl [text-shadow:0_2px_24px_rgba(0,0,0,0.7)]">
            Путешествие продолжается ниже
          </p>
        </div>

        {/* Занавес выхода: кадр растворяется в фон следующей секции */}
        <div
          ref={exitEl}
          style={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-20 bg-ink"
        />

        {/* Тонкая линия-таймлайн внизу кино-вьюпорта */}
        {!reduced && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-px bg-white/10">
            <div ref={lineEl} className="h-full w-full origin-left bg-aurora/70" style={{ transform: 'scaleX(0)' }} />
          </div>
        )}
      </div>
    </section>
  );
}
