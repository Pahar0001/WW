import Link from 'next/link';
import { getCountryGuide } from '@/lib/country-guides';

/**
 * Ознакомительный гид по стране — короткое «знакомство»: чем известна страна,
 * что посмотреть и когда лучше ехать (общие сведения, без выдуманной конкретики).
 * Ведёт к готовым путешествиям и конструктору маршрута.
 */
export function CountryIntro({ code, countryName, flag }: { code: string; countryName: string; flag?: string }) {
  const guide = getCountryGuide(code);
  if (!guide) return null;

  return (
    <section className="card-lux mt-6 overflow-hidden rounded-2xl p-6 sm:p-8">
      <div className="ambient-glow -left-16 -top-16 h-52 w-52 opacity-70" />

      <p className="relative flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-paper-faint">
        <span className="h-px w-7 bg-aurora/60" />
        Знакомство со страной
      </p>
      <h2 className="relative mt-2 flex items-center gap-3 font-serif text-2xl tracking-tightest text-paper">
        {flag && <span aria-hidden>{flag}</span>}
        {countryName} — для ознакомления
      </h2>

      <p className="relative mt-4 max-w-2xl text-lg leading-relaxed text-paper-dim">{guide.intro}</p>

      <div className="relative mt-6 flex flex-wrap gap-2">
        {guide.highlights.map((h) => (
          <span
            key={h}
            className="rounded-full border border-ink-line bg-ink-soft/50 px-3.5 py-1.5 text-sm text-paper-dim"
          >
            {h}
          </span>
        ))}
      </div>

      <div className="relative mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-ink-line pt-5">
        <div>
          <div className="text-xs uppercase tracking-[0.18em] text-paper-faint">Когда ехать</div>
          <div className="mt-1 text-paper">{guide.bestSeason}</div>
        </div>
        <div className="flex flex-wrap gap-3 sm:ml-auto">
          <Link
            href="/#dream-trips"
            className="inline-flex items-center gap-2 rounded-full border border-ink-line px-5 py-2.5 text-sm text-paper transition-colors hover:border-aurora/50"
          >
            Готовые маршруты
          </Link>
          <Link
            href="/trips/new"
            className="inline-flex items-center gap-2 rounded-full bg-aurora px-5 py-2.5 text-sm font-medium text-aurora-fg transition-transform hover:-translate-y-0.5"
          >
            Собрать поездку →
          </Link>
        </div>
      </div>
    </section>
  );
}
