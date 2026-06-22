import Link from 'next/link';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { api, imageUrl } from '@/lib/api';
import { TripExperience } from '@/components/trip/TripExperience';
import { PlanLink } from '@/components/trip/PlanLink';
import { EditTripLink } from '@/components/trip/EditTripLink';
import { TripRouteMap, type MapPoint } from '@/components/trip/TripRouteMap';
import { PrivateTripGate } from '@/components/trip/PrivateTripGate';
import { Reveal } from '@/components/ui/Reveal';

export default async function TripPage({ params }: { params: { slug: string } }) {
  const token = cookies().get('vela_token')?.value;
  const trip = await api.getTrip(params.slug, token);
  // null may mean "not found" OR "private, no access". Show a gate that lets a
  // logged-in member load it client-side; otherwise it offers login.
  if (!trip) return <PrivateTripGate slug={params.slug} />;

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

  // Whole-route map points: attractions across the balanced variant + hotels.
  const balanced = trip.variants.find((v) => v.pace === 'BALANCED') ?? trip.variants[0];
  const seen = new Set<string>();
  const routePlaces: MapPoint[] = [];
  for (const d of balanced?.days ?? []) {
    for (const dp of d.places) {
      const p = dp.place;
      if (p.lat != null && p.lng != null && !seen.has(p.name)) {
        seen.add(p.name);
        routePlaces.push({ name: p.name, lat: p.lat, lng: p.lng });
      }
    }
  }
  const hotelPoints: MapPoint[] = (trip.hotels ?? [])
    .filter((h) => h.lat != null && h.lng != null)
    .map((h) => ({ name: h.name, lat: h.lat as number, lng: h.lng as number }));

  return (
    <main className="relative min-h-screen pb-32">
      <header className="container-vela flex items-center justify-between py-7">
        <Link href="/" data-magnetic className="font-serif text-xl tracking-tightest">
          Vela
        </Link>
        <div className="flex items-center gap-4">
          <EditTripLink slug={params.slug} />
          <PlanLink slug={params.slug} />
          <Link href="/" data-cursor="hover" className="text-sm text-paper-dim hover:text-paper">
            ← Все маршруты
          </Link>
        </div>
      </header>

      {/* Заглавное изображение */}
      {imageUrl(trip.heroImage) && (
        <div className="container-vela">
          <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-ink-line md:h-96">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(trip.heroImage)!}
              alt={trip.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="container-vela pb-16 pt-10">
        <Reveal>
          <p className="text-sm uppercase tracking-[0.3em] text-paper-faint">
            {trip.country.name} · {trip.durationDays} дней · {trip.seasonLabel}
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

        {/* Quick facts */}
        <Reveal delay={0.2}>
          <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-y border-ink-line py-5 text-sm">
            <Fact label="Длительность" value={`${trip.durationDays} дней`} />
            <Fact label="Сезон" value={trip.seasonLabel ?? '—'} />
            <Fact
              label="Бюджет (цель)"
              value={
                trip.budgetMinRub && trip.budgetMaxRub
                  ? `${fmt(trip.budgetMinRub)}–${fmt(trip.budgetMaxRub)} ₽`
                  : '—'
              }
            />
            <Fact label="Вариантов темпа" value={String(trip.variants.length)} />
          </div>
        </Reveal>
      </section>

      {/* Description + highlights */}
      {(trip.longDescription || (trip.highlights && trip.highlights.length > 0)) && (
        <section className="container-vela grid gap-12 pb-16 lg:grid-cols-[1.5fr_1fr]">
          {trip.longDescription && (
            <Reveal>
              <h2 className="mb-5 font-serif text-2xl tracking-tightest">
                О путешествии
              </h2>
              <p className="whitespace-pre-line text-lg leading-relaxed text-paper-dim">
                {trip.longDescription}
              </p>
              {trip.bestTime && (
                <div className="mt-8 rounded-xl border border-ink-line bg-ink-soft/40 p-5">
                  <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">
                    Когда ехать
                  </div>
                  <p className="mt-2 text-paper-dim">{trip.bestTime}</p>
                </div>
              )}
              {trip.visaNote && (
                <div className="mt-4 rounded-xl border border-ink-line bg-ink-soft/40 p-5">
                  <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">
                    Виза
                  </div>
                  <p className="mt-2 text-paper-dim">{trip.visaNote}</p>
                </div>
              )}
            </Reveal>
          )}
          {trip.highlights && trip.highlights.length > 0 && (
            <Reveal delay={0.08}>
              <h2 className="mb-5 font-serif text-2xl tracking-tightest">
                Главное
              </h2>
              <ul className="space-y-3">
                {trip.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-3 text-paper-dim">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aurora" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </section>
      )}

      {/* Scores */}
      {trip.scores && (
        <section className="container-vela pb-16">
          <Reveal>
            <div className="grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
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
        </section>
      )}

      {/* Whole-route map */}
      {routePlaces.length > 0 && (
        <section className="container-vela pb-16">
          <Reveal>
            <h2 className="mb-5 font-serif text-2xl tracking-tightest">Карта маршрута</h2>
            <TripRouteMap places={routePlaces} hotels={hotelPoints} />
            <p className="mt-3 text-sm text-paper-faint">
              Достопримечательности соединены линией маршрута; 🏨 — отели (если заданы координаты).
            </p>
          </Reveal>
        </section>
      )}

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

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">
        {label}
      </div>
      <div className="mt-1 text-paper">{value}</div>
    </div>
  );
}

function fmt(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n);
}
