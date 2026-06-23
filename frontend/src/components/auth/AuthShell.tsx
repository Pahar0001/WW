'use client';

import Link from 'next/link';
import { AuthScenery } from '@/components/auth/AuthScenery';

export const inp =
  'w-full rounded-xl border border-ink-line bg-ink/60 px-4 py-3 text-paper placeholder:text-paper-faint outline-none transition-all duration-300 focus:border-aurora/70 focus:ring-2 focus:ring-aurora/20';
export const btn =
  'w-full rounded-full bg-aurora px-6 py-3 text-sm font-medium text-aurora-fg shadow-lg shadow-aurora/20 transition-all duration-300 hover:brightness-[1.06] hover:shadow-aurora/30 active:scale-[0.99] disabled:opacity-50';

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-12">
      <AuthScenery />

      <div className="auth-card-enter relative z-10 w-full max-w-md">
        <div className="rounded-[1.75rem] border border-ink-line/70 bg-ink-soft/70 p-8 shadow-[0_30px_80px_-40px_rgba(40,30,20,0.55)] backdrop-blur-xl sm:p-10">
          <Link
            href="/"
            className="mx-auto mb-8 flex w-fit items-center gap-2 font-serif text-2xl tracking-tightest"
          >
            {/* small seal-style mark */}
            <span className="grid h-7 w-7 place-items-center rounded-full border border-aurora/40 text-[13px] text-aurora">和</span>
            Vela
          </Link>

          <h1 className="text-center font-serif text-3xl tracking-tightest">{title}</h1>
          {subtitle && <p className="mt-2 text-center text-paper-dim">{subtitle}</p>}

          <div className="mt-8">{children}</div>
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
