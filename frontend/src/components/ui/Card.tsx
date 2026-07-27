'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { TILT_CLASS, useTilt, type TiltOptions } from '@/components/ui/Tilt';

type CardVariant = 'lux' | 'glass' | 'plain';

const variantClass: Record<CardVariant, string> = {
  // мягкая база + золотая градиентная кромка + подъём на hover (см. .card-lux)
  lux: 'card-lux edge-light',
  // матовое стекло
  glass: 'glass shadow-depth edge-light',
  // плоская поверхность с волосяной линией
  plain: 'border border-ink-line bg-ink-soft/50',
};

type BaseProps = {
  variant?: CardVariant;
  className?: string;
  children: ReactNode;
};

/**
 * Единая премиальная поверхность.
 *
 * Наклон и следящий блеск включены по умолчанию для `lux`/`glass` — так все
 * карточки сайта получают одну физику без правок каждой страницы. Поведение
 * вешается ХУКОМ на сам узел карточки: обёртка добавила бы лишний элемент и
 * сломала растяжение в grid.
 *
 * `tilt={false}` — для плотных списков и таблиц, где наклон читается как шум.
 */
export function Card({
  variant = 'lux',
  className,
  children,
  href,
  tilt,
}: BaseProps & { href?: string; tilt?: boolean | TiltOptions }) {
  const wants = tilt ?? variant !== 'plain';
  const opts: TiltOptions = typeof tilt === 'object' ? tilt : {};
  // Один и тот же хук обслуживает и <div>, и <a> — ref вешается на сам узел
  // карточки, поэтому клик по всей её площади (включая padding) сохраняется.
  const ref = useTilt<HTMLElement>({ ...opts, enabled: Boolean(wants) });

  const cls = cn('rounded-2xl', variantClass[variant], wants && TILT_CLASS, className);

  if (href) {
    return (
      <Link
        href={href}
        ref={ref as React.Ref<HTMLAnchorElement>}
        className={cn('block', cls)}
      >
        {children}
      </Link>
    );
  }
  return (
    <div ref={ref as React.Ref<HTMLDivElement>} className={cls}>
      {children}
    </div>
  );
}
