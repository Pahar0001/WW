'use client';

import Link from 'next/link';
import { Constellation, RoutePath } from '@/components/decor/TravelDecor';

export const inp =
  'w-full rounded-lg border border-ink-line bg-ink px-4 py-3 text-paper placeholder:text-paper-faint outline-none transition-colors focus:border-aurora/60';
export const btn =
  'w-full rounded-full bg-paper px-6 py-3 text-sm font-medium text-ink transition-transform duration-500 ease-smooth hover:scale-[1.02] disabled:opacity-50';

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
    <main className="relative flex min-h-screen items-center justify-center px-6">
      {/* Ambient art — decorative, in the corners, behind the form. */}
      <Constellation className="pointer-events-none absolute right-8 top-10 hidden w-36 text-aurora/40 sm:block" />
      <RoutePath className="pointer-events-none absolute -left-10 bottom-10 hidden w-[420px] text-aurora/25 md:block" />
      <div className="relative z-10 w-full max-w-sm">
        <Link href="/" className="mb-10 block text-center font-serif text-2xl tracking-tightest">Vela</Link>
        <h1 className="font-serif text-3xl tracking-tightest">{title}</h1>
        {subtitle && <p className="mt-2 text-paper-dim">{subtitle}</p>}
        <div className="mt-8">{children}</div>
      </div>
    </main>
  );
}
