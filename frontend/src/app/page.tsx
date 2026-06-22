import Link from 'next/link';
import { api } from '@/lib/api';
import { Reveal } from '@/components/ui/Reveal';

export default async function HomePage() {
  const trips = (await api.listTrips()) ?? [];

  return (
    <main className="relative min-h-screen">
      {/* Nav */}
      <header className="container-vela flex items-center justify-between py-7">
        <span className="font-serif text-xl tracking-tightest" data-magnetic>
          Vela
        </span>
        <nav className="flex items-center gap-8 text-sm text-paper-dim">
          <a href="#dream-trips" data-cursor="hover" className="transition-colors hover:text-paper">
            Dream Trips
          </a>
          <a href="#builder" data-cursor="hover" className="transition-colors hover:text-paper">
            Builder
          </a>
          <a href="#data" data-cursor="hover" className="transition-colors hover:text-paper">
            Honest data
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="container-vela flex min-h-[78vh] flex-col justify-center">
        <Reveal>
          <p className="mb-6 text-sm uppercase tracking-[0.3em] text-paper-faint">
            Premium travel planning
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="max-w-4xl font-serif text-5xl leading-[1.05] tracking-tightest text-balance md:text-7xl">
            Plan journeys
            <br />
            worth <span className="text-aurora">remembering.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-paper-dim text-balance">
            Browse curated routes, build your own day by day, see every step on the
            map, and understand your budget — with data we never fake.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-10 flex items-center gap-5">
            <Link
              href="/trips/china-floating-mountains"
              data-magnetic
              className="rounded-full bg-paper px-7 py-3.5 text-sm font-medium text-ink transition-transform duration-500 ease-smooth hover:scale-[1.03]"
            >
              Explore China 2027
            </Link>
            <a href="#dream-trips" data-cursor="hover" className="text-sm text-paper-dim hover:text-paper">
              See all trips →
            </a>
          </div>
        </Reveal>
      </section>

      {/* Dream Trips */}
      <section id="dream-trips" className="container-vela py-24">
        <Reveal>
          <div className="mb-12 flex items-end justify-between border-b border-ink-line pb-6">
            <h2 className="font-serif text-3xl tracking-tightest md:text-4xl">
              Путешествия моей мечты
            </h2>
            <span className="text-sm text-paper-faint">{trips.length} curated</span>
          </div>
        </Reveal>

        {trips.length === 0 ? (
          <p className="text-paper-dim">
            No trips yet, or the API is unavailable. Start the backend and run the
            seed to see <span className="text-paper">China — The Floating Mountains</span>.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {trips.map((t, i) => (
              <Reveal key={t.id} delay={i * 0.06}>
                <Link
                  href={`/trips/${t.slug}`}
                  data-magnetic
                  className="group block overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/60 p-8 transition-colors duration-500 hover:border-aurora/40"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs uppercase tracking-[0.25em] text-paper-faint">
                      {t.country.name}
                    </span>
                    <span className="text-xs text-paper-faint">{t.durationDays} days</span>
                  </div>
                  <h3 className="mt-5 font-serif text-2xl tracking-tightest md:text-3xl">
                    {t.title}
                  </h3>
                  {t.subtitle && (
                    <p className="mt-2 text-paper-dim">{t.subtitle}</p>
                  )}
                  <div className="mt-8 flex items-center gap-3 text-sm text-paper-faint">
                    {t.seasonLabel && <span>{t.seasonLabel}</span>}
                    <span className="text-aurora opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      Open →
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* Honest data band */}
      <section id="data" className="container-vela py-24">
        <Reveal>
          <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-10">
            <h2 className="font-serif text-2xl tracking-tightest md:text-3xl">
              We never invent your trip.
            </h2>
            <p className="mt-4 max-w-2xl text-paper-dim">
              Prices, distances, travel times and weather come from real sources or
              are clearly marked <span className="text-aurora">data pending</span>.
              Every figure carries its origin, trust level and date — so you always
              know what you can rely on.
            </p>
          </div>
        </Reveal>
      </section>

      <footer className="container-vela border-t border-ink-line py-10 text-sm text-paper-faint">
        <div className="flex items-center justify-between">
          <span className="font-serif tracking-tightest">Vela</span>
          <span>Reference build · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </main>
  );
}
