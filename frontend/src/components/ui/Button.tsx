import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'gold' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

const base =
  'group relative inline-flex select-none items-center justify-center gap-2.5 overflow-hidden rounded-full font-medium tracking-wide transition-[transform,color,background-color,border-color,box-shadow] duration-500 ease-smooth disabled:pointer-events-none disabled:opacity-50';

const sizes: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

const variants: Record<ButtonVariant, string> = {
  // dark charcoal pill with cream text (primary CTA)
  primary: 'sheen glow-gold bg-paper text-ink shadow-soft-lg hover:-translate-y-0.5',
  // antique-gold fill
  gold: 'sheen glow-gold bg-aurora text-aurora-fg shadow-soft hover:-translate-y-0.5',
  // hairline outline
  outline: 'glow-gold border border-ink-line text-paper hover:border-aurora/50 hover:-translate-y-0.5',
  // text-only
  ghost: 'px-1 text-paper-dim hover:text-paper',
};

function Arrow() {
  return (
    <span className="relative grid h-8 w-8 place-items-center rounded-full bg-aurora text-aurora-fg transition-transform duration-500 ease-smooth group-hover:translate-x-0.5">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </span>
  );
}

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  withArrow?: boolean;
  magnetic?: boolean;
  className?: string;
  children: ReactNode;
};

/** Premium pill button. Arrow variants tuck the label left and add a gold arrow disc. */
export function Button({
  variant = 'primary',
  size = 'md',
  withArrow = false,
  magnetic = false,
  className,
  children,
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, sizes[size], variants[variant], withArrow && 'pr-2', className)}
      {...(magnetic ? { 'data-magnetic': '' } : {})}
      {...rest}
    >
      <span className="relative">{children}</span>
      {withArrow && <Arrow />}
    </button>
  );
}

/** Same visual language as <Button>, rendered as a Next <Link>. */
export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  withArrow = false,
  magnetic = false,
  className,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link
      href={href}
      className={cn(base, sizes[size], variants[variant], withArrow && 'pr-2', className)}
      {...(magnetic ? { 'data-magnetic': '' } : {})}
    >
      <span className="relative">{children}</span>
      {withArrow && <Arrow />}
    </Link>
  );
}
