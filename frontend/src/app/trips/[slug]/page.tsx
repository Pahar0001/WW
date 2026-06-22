import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { TripExperience } from '@/components/trip/TripExperience';
import { Reveal } from '@/components/ui/Reveal';

export default async function TripPage({ params }: { params: { slug: string } }) {
  const trip = await api.getTrip(params.slug);
  if (!trip) notFound();

  const scoreRows: { label: string; value: number }[] = trip.scores
    ? [
        { label: 'Комфорт', value: trip.scores.comfort },
        { label: 'Красота', value: trip.scores.beauty },
        { label: 'История', value: trip.scores.history },
        { label: 'Природа', value: trip.scores.nature },
        { label: 'Уникальность', value: trip.scores.uniqueness },
        { label: 'Цена/качество', value: trip.scores.valueRatio },
        { label: 'Нагрузка', value: trip.scores.load },
      ]
    : [];

  return (
    <main className="relative min-h-screen pb-32">
      <header className="container-vela flex items-center justify-between py-7">
        <Link href="/" data-magnetic className="font-serif text-xl tracking-tightest">
          Vela
        </Link>
        <Link href="/" data-cursor="hover" className="text-sm text-paper-dim hover:text-paper">
          ← All trips
        </Link>
      </header>

      {/* Hero */}
      <section className="container-vela pb-16 pt-10">
        <Reveal>
          <p className="text-sm uppercase tracking-[0.3em] text-paper-faint">
            {trip.country.name} · {trip.durationDays} days · {trip.seasonLabel}
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[1.05] tracking-tightest text-balance md:text-6xl">
            {trip.title}
          </h1>
        </Reveal>
        {trip.summary && (
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-2xl text-lg text-paper-dim text-balance">
              {trip.summary}
            </p>
          </Reveal>
        )}

        {/* Scores */}
        {trip.scores && (
          <Reveal delay={0.24}>
            <div className="mt-12 grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-1">
                <div className="font-serif text-5xl text-aurora">
                  {trip.scores.overall}
                </div>
                <div className="text-sm text-paper-faint">Общий рейтинг</div>
              </div>
              {scoreRows.map((s) => (
                <div key={s.label}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-paper-dim">{s.label}</span>
                    <span className="text-sm text-paper">{s.value}</span>
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-ink-line">
                    <div
                      className="h-full rounded-full bg-aurora/70"
                      style={{ width: `${s.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        )}
      </section>

      {/* Interactive experience */}
      <section className="container-vela">
        <TripExperience trip={trip} />
      </section>

      {/* Honest opinions */}
      {trip.opinions.length > 0 && (
        <section className="container-vela mt-24">
          <h2 className="mb-8 font-serif text-3xl tracking-tightest">
            Честное мнение
          </h2>
          <p className="mb-10 max-w-2xl text-paper-dim">
            Шесть точек зрения. Оценки не завышаются искусственно — слабые места
            названы прямо.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            {trip.opinions.map((o, i) => (
              <Reveal key={i} delay={i * 0.05}>
                <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.25em] text-paper-faint">
                      {o.persona}
                    </span>
                    {o.rating != null && (
                      <span className="text-sm text-paper">{o.rating}</span>
                    )}
                  </div>
                  <p className="mt-4 text-paper-dim">{o.verdict}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
