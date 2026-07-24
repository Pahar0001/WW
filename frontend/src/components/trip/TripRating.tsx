'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { rateTrip } from '@/lib/api';
import { toast } from '@/components/ui/Toaster';

function Star({ filled, half }: { filled: boolean; half?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" className="shrink-0">
      <defs>
        <linearGradient id="halfstar">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 17.4l-5.81 3.06 1.11-6.47-4.7-4.58 6.5-.95L12 2.5z"
        fill={filled ? 'currentColor' : half ? 'url(#halfstar)' : 'transparent'}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Trip star rating: shows the average, lets a logged-in user rate 1–5. */
export function TripRating({
  slug,
  initial,
}: {
  slug: string;
  initial?: { avg: number; count: number; mine: number | null };
}) {
  const [avg, setAvg] = useState(initial?.avg ?? 0);
  const [count, setCount] = useState(initial?.count ?? 0);
  const [mine, setMine] = useState<number | null>(initial?.mine ?? null);
  const [hover, setHover] = useState(0);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    auth.me().then((u) => setAuthed(!!u)).catch(() => setAuthed(false));
  }, []);

  async function submit(stars: number) {
    if (busy) return;
    setBusy(true);
    const prevMine = mine;
    setMine(stars);
    try {
      const r = await rateTrip(slug, stars);
      setAvg(r.avg);
      setCount(r.count);
      setMine(r.mine);
      toast.success('Спасибо за оценку!');
    } catch (e) {
      setMine(prevMine);
      toast.error((e as Error).message || 'Не удалось сохранить оценку');
    } finally {
      setBusy(false);
    }
  }

  const shown = hover || mine || 0;

  return (
    <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6 shadow-soft sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-serif text-4xl tracking-tightest text-paper">
              {avg ? avg.toFixed(1) : '—'}
            </span>
            <div className="flex text-aurora">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} filled={avg >= n} half={avg >= n - 0.5 && avg < n} />
              ))}
            </div>
          </div>
          <p className="mt-1.5 text-sm text-paper-faint">
            {count > 0 ? `${count} ${plural(count)}` : 'Оценок пока нет — будьте первым'}
          </p>
        </div>

        {authed === false ? (
          <a href="/login" className="text-sm text-aurora hover:opacity-80">
            Войдите, чтобы оценить →
          </a>
        ) : authed ? (
          <div className="text-right">
            <div className="mb-1.5 text-xs uppercase tracking-[0.2em] text-paper-faint">
              {mine ? 'Ваша оценка' : 'Оцените маршрут'}
            </div>
            <div className="flex text-aurora" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={busy}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => submit(n)}
                  aria-label={`Оценка ${n}`}
                  className="p-0.5 transition-transform hover:scale-110 disabled:opacity-50"
                >
                  <Star filled={shown >= n} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function plural(n: number): string {
  const a = n % 100;
  const b = n % 10;
  if (a > 10 && a < 20) return 'оценок';
  if (b === 1) return 'оценка';
  if (b >= 2 && b <= 4) return 'оценки';
  return 'оценок';
}
