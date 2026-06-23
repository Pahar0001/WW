import type { ReactNode } from 'react';

/** Consistent empty state: an icon, a title, a hint, and an optional action. */
export function EmptyState({
  icon = '✦',
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
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-ink-line text-lg text-aurora">
        {icon}
      </div>
      <p className="font-serif text-xl tracking-tightest text-paper">{title}</p>
      {hint && <p className="mt-2 max-w-sm text-sm text-paper-dim">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
