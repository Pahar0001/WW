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
 *    MotionController считает все производные значения (титры, главы, выход);
 *  - значения пишутся НАПРЯМУЮ в style через refs — ни одного setState
 *    в горячем цикле, React не ре-рендерится на скролле вообще.
 *
 * Повествование: скролл — не пустая перемотка, а история по главам.
 *  Глава 0 — титул + CTA; главы 1..3 — что такое Vela (маршруты по дням,
 *  честные цены, заказ под ключ); финал — переход к следующей секции.
 *
 * Читаемость: под каждым текстовым блоком — «дымка» (Mist): маскированное
 * пятно backdrop-blur с тёмной подложкой, края растворяются радиальной
 * маской — текст читается на любом кадре, включая белую воду и снег.
 *
 * Слои (снизу вверх): видео (SVG-грейдинг) → виньетка/скримы →
 * HalftoneOverlay → PaperNoise → дымка+текст → занавес → таймлайн.
 */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ScrollController } from './ScrollController';
import { VideoScrubber } from './VideoScrubber';
import { computeMotion, phase, CHAPTER_WINDOWS } from './MotionController';
import { buildGradeSvg, GRADE_FILTER_ID } from './ColorGrading';
import { PaperNoise } from './PaperNoise';
import { pluralize } from '@/lib/plural';

const SCROLL_VH = 420; // «длина плёнки» в vh — главная ручка темпа

/** «Дымка» под текстом: тёмное blur-пятно с растворяющимися краями. */
function Mist() {
  return (
    <div
      aria-hidden
      className="absolute -inset-x-10 -inset-y-8 -z-10 rounded-[48px] bg-[#0d0b08]/45 backdrop-blur-md"
      style={{
        WebkitMaskImage:
          'radial-gradient(85% 90% at 35% 55%, #000 45%, transparent 98%)',
        maskImage: 'radial-gradient(85% 90% at 35% 55%, #000 45%, transparent 98%)',
      }}
    />
  );
}

interface Chapter {
  index: string;
  eyebrow: string;
  title: string;
  text: string;
  cta?: { href: string; label: string };
}

export function HeroVideo({
  src,
  poster,
  tripCount = 0,
  eyebrow = 'Премиальное планирование путешествий',
  titleTop = 'Путешествия,',
  titleAccent = 'которые запоминаются.',
  subtitle = 'Полёт управляется вами: листайте — и смотрите, из чего собрана Vela.',
}: {
  src: string;
  poster?: string;
  tripCount?: number;
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
  const chapterEls = useRef<(HTMLDivElement | null)[]>([]);
  const chapterMarks = useRef<(HTMLSpanElement | null)[]>([]);
  const [reduced, setReduced] = useState(false);

  // Главы повествования. Числа — реальные (кол-во маршрутов приходит из БД).
  const chapters: Chapter[] = [
    {
      index: '01',
      eyebrow: 'Коллекция',
      title: tripCount > 0 ? `${pluralize(tripCount, 'готовый маршрут', 'готовых маршрута', 'готовых маршрутов')} по дням` : 'Готовые маршруты по дням',
      text: 'От Альп до Бали: реальные места с фото, координатами и планом на каждый день. Открывайте и адаптируйте под себя в конструкторе.',
      cta: { href: '#dream-trips', label: 'Смотреть коллекцию' },
    },
    {
      index: '02',
      eyebrow: 'Честные данные',
      title: 'Реальные цены, а не обещания',
      text: 'Билеты — живые котировки Aviasales под ваши даты. Траты — прозрачный расчёт: отель, прожиточный минимум, транспорт. Мы ничего не выдумываем.',
    },
    {
      index: '03',
      eyebrow: 'Под ключ',
      title: 'Или закажите путешествие',
      text: 'Опишите поездку мечты своими словами — ИИ уточнит детали, а организатор соберёт маршрут и вернётся с предложением.',
      cta: { href: '/order', label: 'Заказать путешествие' },
    },
  ];

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
      const set = (el: HTMLElement | null, s: { opacity: number; y: number }) => {
        if (!el) return;
        el.style.opacity = String(s.opacity);
        el.style.transform = `translateY(${s.y}px)`;
        // Скрытые блоки не должны перехватывать клики по CTA соседних глав.
        el.style.visibility = s.opacity < 0.02 ? 'hidden' : 'visible';
      };
      set(titleEl.current, m.title);
      set(outroEl.current, m.outro);
      CHAPTER_WINDOWS.forEach(([from, to], i) => {
        set(chapterEls.current[i], phase(progress, from, to));
        // Метка активной главы у таймлайна.
        const mark = chapterMarks.current[i];
        if (mark) mark.style.opacity = progress >= from && progress <= to ? '1' : '0.35';
      });
      if (hintEl.current) hintEl.current.style.opacity = String(m.hintOpacity);
      if (exitEl.current) exitEl.current.style.opacity = String(m.exitOpacity);
      if (lineEl.current) lineEl.current.style.transform = `scaleX(${m.timeline})`;
      vid.style.transform = `scale(${m.videoScale})`;
    });

    return () => {
      unsub();
      controller.destroy();
      scrubber.destroy();
    };
  }, [reduced]);

  /** Общая обёртка текстового блока: колонка слева-снизу + дымка. */
  const Block = ({ children, blockRef }: { children: ReactNode; blockRef: (el: HTMLDivElement | null) => void }) => (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-end">
      <div className="container-vela w-full pb-24 md:pb-28">
        <div ref={blockRef} className="relative max-w-2xl" style={{ opacity: 0 }}>
          <Mist />
          {children}
        </div>
      </div>
    </div>
  );

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

        {/* Виньетка + постоянные скримы читаемости: нижний и левый.
            Текст всегда живёт в левом нижнем квадранте — там всегда темно. */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_35%,transparent_42%,rgba(13,11,8,0.6)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#0d0b08]/95 via-[#0d0b08]/45 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-3/5 bg-gradient-to-r from-[#0d0b08]/60 to-transparent md:block" />

        {/* Фактура: живое зерно бумаги (halftone-растр убран по решению
            владельца — компонент HalftoneOverlay остаётся в кодовой базе). */}
        <PaperNoise />

        {/* ── Глава 0: титул + CTA ── */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-end">
          <div className="container-vela w-full pb-24 md:pb-28">
            <div ref={titleEl} className="relative max-w-3xl">
              <Mist />
              <p className="mb-5 flex items-center gap-3 text-xs uppercase tracking-[0.34em] text-white/70">
                <span className="h-px w-8 bg-aurora/70" />
                {eyebrow}
              </p>
              <h1 className="font-serif display-1 text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.8),0_8px_44px_rgba(0,0,0,0.55)]">
                {titleTop}
                <br />
                <span className="text-gold-gradient [text-shadow:none]">{titleAccent}</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.85)]">
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
                  className="inline-flex items-center rounded-full border border-white/30 px-8 py-4 text-sm font-medium text-white transition-colors duration-500 hover:border-aurora/60"
                >
                  Заказать путешествие
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Главы 1..3: повествование по ходу полёта ── */}
        {!reduced &&
          chapters.map((c, i) => (
            <Block
              key={c.index}
              blockRef={(el) => {
                chapterEls.current[i] = el;
              }}
            >
              <p className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-aurora">
                <span className="font-serif text-2xl tracking-normal text-aurora/90">{c.index}</span>
                <span className="h-px w-8 bg-aurora/60" />
                {c.eyebrow}
              </p>
              <h2 className="max-w-xl font-serif text-4xl tracking-tightest text-white md:text-5xl [text-shadow:0_2px_18px_rgba(0,0,0,0.8)]">
                {c.title}
              </h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/90 [text-shadow:0_1px_10px_rgba(0,0,0,0.85)]">
                {c.text}
              </p>
              {c.cta && (
                <Link
                  href={c.cta.href}
                  data-magnetic
                  className="glow-gold pointer-events-auto mt-7 inline-flex items-center gap-2 rounded-full border border-aurora/50 px-7 py-3.5 text-sm font-medium text-aurora transition-colors duration-500 hover:bg-aurora/10"
                >
                  {c.cta.label} →
                </Link>
              )}
            </Block>
          ))}

        {/* Подсказка «полёт листается» — исчезает после первого движения */}
        {!reduced && (
          <div
            ref={hintEl}
            className="pointer-events-none absolute inset-x-0 bottom-7 z-10 flex flex-col items-center gap-2 text-white/60"
          >
            <span className="text-[11px] uppercase tracking-[0.3em] [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
              Листайте — вы управляете полётом
            </span>
            <span className="h-8 w-px animate-pulse bg-gradient-to-b from-aurora/80 to-transparent" />
          </div>
        )}

        {/* Финальная подпись перед переходом */}
        <div
          ref={outroEl}
          style={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <div className="relative px-6 text-center">
            <Mist />
            <p className="font-serif text-3xl tracking-tightest text-white md:text-4xl [text-shadow:0_2px_24px_rgba(0,0,0,0.8)]">
              Путешествие продолжается ниже
            </p>
            <p className="mt-3 text-sm uppercase tracking-[0.3em] text-white/60">
              Коллекция маршрутов ждёт
            </p>
          </div>
        </div>

        {/* Занавес выхода: кадр растворяется в фон следующей секции */}
        <div
          ref={exitEl}
          style={{ opacity: 0 }}
          className="pointer-events-none absolute inset-0 z-20 bg-ink"
        />

        {/* Таймлайн: линия прогресса + метки глав */}
        {!reduced && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
            <div className="mb-2 hidden justify-center gap-8 md:flex">
              {chapters.map((c, i) => (
                <span
                  key={c.index}
                  ref={(el) => {
                    chapterMarks.current[i] = el;
                  }}
                  className="text-[10px] uppercase tracking-[0.25em] text-aurora/90 transition-opacity duration-500"
                  style={{ opacity: 0.35 }}
                >
                  {c.index} · {c.eyebrow}
                </span>
              ))}
            </div>
            <div className="h-px bg-white/10">
              <div ref={lineEl} className="h-full w-full origin-left bg-aurora/70" style={{ transform: 'scaleX(0)' }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
