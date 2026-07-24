'use client';

import Link from 'next/link';
import { AuthScenery } from '@/components/auth/AuthScenery';

// Shared field + button styles (used by all auth pages).
export const inp =
  'w-full rounded-xl border border-ink-line bg-ink/70 px-4 py-3 text-paper placeholder:text-paper-faint outline-none transition-all duration-300 focus:border-aurora/70 focus:ring-2 focus:ring-aurora/20';
export const btn =
  'sheen relative w-full overflow-hidden rounded-full bg-aurora px-6 py-3.5 text-sm font-medium text-aurora-fg shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:brightness-[1.04] active:translate-y-0 disabled:pointer-events-none disabled:opacity-50';

// Reused cinematic visual (the featured shan-shui route).
const AUTH_IMG =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/1_tianzishan_wulingyuan_zhangjiajie_2012.jpg/3840px-1_tianzishan_wulingyuan_zhangjiajie_2012.jpg';

const POINTS = [
  'Готовые маршруты и конструктор по дням',
  'Карты, отели, бюджет и календарь в одном месте',
  'Только честные данные — без выдуманных цифр',
];

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative grid min-h-screen lg:grid-cols-2">
      <AuthScenery />

      {/* ── Left cinematic brand panel (desktop) ── */}
      <div className="relative hidden overflow-hidden lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={AUTH_IMG} alt="" className="absolute inset-0 h-full w-full object-cover" />
        {/* Explicit dark overlay + light text — independent of theme (image is always dark). */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
        <div className="relative z-10 flex h-full flex-col justify-between p-12 xl:p-16">
          <Link href="/" className="flex w-fit items-center gap-2 font-serif text-2xl tracking-tightest text-white">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-aurora/60 text-[14px] text-aurora">和</span>
            Vela
          </Link>
          <div>
            <p className="mb-5 flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/65">
              <span className="h-px w-8 bg-aurora/70" />
              Премиальные путешествия
            </p>
            <h2 className="max-w-md font-serif text-4xl leading-[1.08] tracking-tightest text-white xl:text-5xl [text-shadow:0_2px_24px_rgba(0,0,0,0.5)]">
              Каждый маршрут начинается с честного плана.
            </h2>
            <ul className="mt-8 space-y-3">
              {POINTS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-white/80">
                  <span className="mt-1.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-aurora/25 text-aurora">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="relative z-10 flex items-center justify-center px-5 py-12">
        <div className="auth-card-enter w-full max-w-md">
          <div className="rounded-[1.75rem] glass p-8 shadow-[0_30px_80px_-40px_rgba(40,30,20,0.5)] sm:p-10">
            <Link
              href="/"
              className="mx-auto mb-8 flex w-fit items-center gap-2 font-serif text-2xl tracking-tightest lg:hidden"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full border border-aurora/40 text-[13px] text-aurora">和</span>
              Vela
            </Link>

            <h1 className="text-center font-serif text-3xl tracking-tightest sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-3 text-center text-paper-dim">{subtitle}</p>}

            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-card-enter {
          animation: auth-rise 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes auth-rise {
          from { opacity: 0; transform: translateY(14px) scale(0.985); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .auth-card-enter { animation: none; }
        }
      `}</style>
    </main>
  );
}
