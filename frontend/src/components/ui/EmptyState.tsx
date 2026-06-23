import type { ReactNode } from 'react';
import { CompassRose } from '@/components/decor/TravelDecor';

/** Consistent empty state: an icon, a title, a hint, and an optional action.
 *  Defaults to a calm compass-rose — on-brand for an empty/undiscovered screen. */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink-line bg-ink-soft/30 px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-ink-line text-aurora">
        {icon ?? <CompassRose className="w-8 text-aurora/80" />}
      </div>
      <p className="font-serif text-xl tracking-tightest text-paper">{title}</p>
      {hint && <p className="mt-2 max-w-sm text-sm text-paper-dim">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
