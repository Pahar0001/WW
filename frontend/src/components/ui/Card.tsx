import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CardVariant = 'lux' | 'glass' | 'plain';

const variantClass: Record<CardVariant, string> = {
  // soft base + gold gradient edge + lift on hover (see .card-lux in globals.css)
  lux: 'card-lux',
  // frosted glass
  glass: 'glass shadow-soft',
  // flat hairline surface
  plain: 'border border-ink-line bg-ink-soft/50',
};

type BaseProps = {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
};

/**
 * Unified premium surface. Replaces the repeated
 * `rounded-2xl border border-ink-line bg-ink-soft/40 p-…` pattern.
 * Pass `href` to render an interactive card as a <Link>.
 */
export function Card({
  variant = 'lux',
  className,
  children,
  href,
}: BaseProps & { href?: string }) {
  const cls = cn('rounded-2xl', variantClass[variant], className);
  if (href) {
    return (
      <Link href={href} className={cn('block', cls)} data-magnetic>
        {children}
      </Link>
    );
  }
  return <div className={cls}>{children}</div>;
}
