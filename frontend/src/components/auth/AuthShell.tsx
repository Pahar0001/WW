'use client';

/**
 * AuthShell — вход/регистрация НА ФОНЕ видео-полёта (то же кино, что и на
 * главной): полноэкранный замедленный цикл с фирменным грейдингом, слева —
 * бренд-посыл, справа — тёмная стеклянная карточка формы.
 *
 * Приём с токенами: карточке присвоен класс `dark` — все фирменные токены
 * (ink/paper/line) внутри переключаются в тёмную гамму независимо от темы
 * сайта, потому что карточка всегда лежит на тёмном кадре.
 *
 * AuthCurtain — «занавес» после успешного входа/регистрации: кадр плавно
 * накрывается тёмной шторой с логотипом, и следующая страница (главная с тем
 * же видео) появляется как продолжение сцены, а не как скачок.
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { buildGradeSvg, GRADE_FILTER_ID } from '@/components/hero/ColorGrading';

// Shared field + button styles (used by all auth pages).
export const inp =
  'w-full rounded-xl border border-ink-line bg-ink/70 px-4 py-3 text-paper placeholder:text-paper-faint outline-none transition-all duration-300 focus:border-aurora/70 focus:ring-2 focus:ring-aurora/20';
export const btn =
  'sheen glow-gold relative w-full overflow-hidden rounded-full bg-aurora px-6 py-3.5 text-sm font-medium text-aurora-fg shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:brightness-[1.04] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50';

const AUTH_VIDEO = '/hero/thailand.mp4';
const AUTH_POSTER = '/hero/thailand-poster.jpg';

const POINTS = [
  'Готовые маршруты и конструктор по дням',
  'Карты, отели, бюджет и календарь в одном месте',
  'Только честные данные — без выдуманных цифр',
];

/** Занавес перехода после успешного входа/регистрации. */
export function AuthCurtain({ show, note }: { show: boolean; note?: string }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[9500] grid place-items-center bg-[#0d0b08]"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-4 text-white"
          >
            <span className="grid h-14 w-14 place-items-center rounded-full border border-aurora/60 font-serif text-xl text-aurora">
              和
            </span>
            <span className="font-serif text-3xl tracking-tightest">Vela</span>
            {note && <span className="text-sm uppercase tracking-[0.3em] text-white/50">{note}</span>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  /**
   * Кино-фон экранов входа.
   *
   * ⚠️ ВИДЕО ИДЁТ В СВОЁМ ТЕМПЕ. Раньше здесь стоял `playbackRate = 0.55` ради
   * «созерцательности», и он же всё портил: на 0.55× каждый кадр держится вдвое
   * дольше, а поверх видео на весь экран висит SVG-грейдинг (`filter: url(…)`),
   * который пересчитывается на каждом кадре композитора. Вдвое больше проходов
   * фильтра на ту же секунду видео — и картинка дёргается вместо того, чтобы
   * плыть. Замедлять обратно не надо: нужен спокойный темп — перекодируйте сам
   * файл, это бесплатно в рантайме.
   *
   * Тяжёлый фон включается не всегда. На телефоне и при `prefers-reduced-motion`
   * остаётся постер, а 16-МБ файл вообще не скачивается: `src` не проставлен.
   * Ровно так же поступает главная (`HeroVideo`, `isStatic`) — там это уже
   * проверено на слабых устройствах.
   */
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cinema, setCinema] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = window.matchMedia('(max-width: 767px)');
    // Подписываемся, а не читаем один раз: окно, растянутое с телефонной ширины
    // до настольной, должно получить фон, а не остаться с постером навсегда.
    // Так же устроен hero на главной.
    const sync = () => setCinema(!reduced.matches && !mobile.matches);
    sync();
    reduced.addEventListener('change', sync);
    mobile.addEventListener('change', sync);
    return () => {
      reduced.removeEventListener('change', sync);
      mobile.removeEventListener('change', sync);
    };
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !cinema) return;
    // Ждём, пока данных хватит на непрерывное проигрывание. Прежний вариант
    // звал play() сразу с `preload="metadata"`: воспроизведение начиналось на
    // пустом буфере и вставало посреди кадра, догружая файл.
    const start = () => {
      v.play().catch(() => {}); // автоплей может быть запрещён — остаёмся на постере
    };
    if (v.readyState >= 3) start();
    else v.addEventListener('canplay', start, { once: true });
    return () => v.removeEventListener('canplay', start);
  }, [cinema]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0d0b08]">
      {/* SVG-фильтр фирменного грейдинга */}
      <span aria-hidden dangerouslySetInnerHTML={{ __html: buildGradeSvg() }} />

      {/* Кино-фон на весь экран */}
      <video
        ref={videoRef}
        // Без `src` браузер показывает постер и НЕ качает файл — так экран
        // входа на телефоне стоит одну картинку вместо шестнадцати мегабайт.
        src={cinema ? AUTH_VIDEO : undefined}
        poster={AUTH_POSTER}
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: `url(#${GRADE_FILTER_ID})` }}
      />
      {/* Скримы читаемости: виньетка + плотнее к правому краю (под картой формы) */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_100%_at_50%_40%,transparent_40%,rgba(13,11,8,0.65)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0d0b08]/55 via-transparent to-[#0d0b08]/70" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0d0b08]/80 to-transparent" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-5 py-12 lg:grid-cols-[1.1fr_minmax(400px,0.9fr)] lg:px-12">
        {/* ── Бренд-посыл (desktop) ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="hidden lg:block"
        >
          <Link href="/" className="flex w-fit items-center gap-2 font-serif text-2xl tracking-tightest text-white">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-aurora/60 text-[14px] text-aurora">和</span>
            Vela
          </Link>
          <p className="mb-5 mt-14 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/65">
            <span className="h-px w-8 bg-aurora/70" />
            Премиальные путешествия
          </p>
          <h2 className="max-w-md font-serif text-4xl leading-[1.08] tracking-tightest text-white xl:text-5xl [text-shadow:0_2px_24px_rgba(0,0,0,0.6)]">
            Каждый маршрут начинается с честного плана.
          </h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p, i) => (
              <motion.li
                key={p}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-3 text-white/80"
              >
                <span className="mt-1.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-aurora/25 text-aurora">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </span>
                {p}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        {/* ── Карточка формы: тёмное стекло поверх кадра (класс dark → тёмные токены) ── */}
        <motion.div
          initial={{ opacity: 0, y: 22, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="w-full justify-self-center lg:max-w-md"
        >
          <div className="dark rounded-[1.75rem] border border-aurora/20 bg-[#14100c]/80 p-8 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-10">
            <Link
              href="/"
              className="mx-auto mb-8 flex w-fit items-center gap-2 font-serif text-2xl tracking-tightest text-paper lg:hidden"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full border border-aurora/40 text-[13px] text-aurora">和</span>
              Vela
            </Link>

            <h1 className="text-center font-serif text-3xl tracking-tightest text-paper sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-3 text-center text-paper-dim">{subtitle}</p>}

            <div className="mt-8">{children}</div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
