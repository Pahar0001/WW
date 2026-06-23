// Shimmer placeholder for loading states.
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-ink-line/50 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-paper/10 to-transparent" />
    </div>
  );
}

/** A card-shaped skeleton used while trips/lists load. */
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/40">
      <Skeleton className="h-52 w-full rounded-none" />
      <div className="space-y-3 p-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
