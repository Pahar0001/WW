import Link from 'next/link';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { api, imageUrl, type Trip } from '@/lib/api';
import { TripExperience } from '@/components/trip/TripExperience';
import { TripCosts } from '@/components/trip/TripCosts';
import { PlanLink } from '@/components/trip/PlanLink';
import { EditTripLink } from '@/components/trip/EditTripLink';
import { CopyTripLink } from '@/components/trip/CopyTripLink';
import { PrivateTripGate } from '@/components/trip/PrivateTripGate';
import { TripRating } from '@/components/trip/TripRating';
import { TripViewBeacon } from '@/components/trip/TripViewBeacon';
import { TripWeather } from '@/components/trip/TripWeather';
import { SaveOfflineButton } from '@/components/trip/SaveOfflineButton';
import { InviteTripLink } from '@/components/trip/InviteTripLink';
import { Reveal } from '@/components/ui/Reveal';
import { Card } from '@/components/ui/Card';
import { pluralize } from '@/lib/plural';

/**
 * SEO: заголовок, описание и карточка для соцсетей строятся из самого маршрута.
 * Картинка ссылки генерируется в opengraph-image.tsx (фирменная карточка со
 * страной, длительностью и фото маршрута). Приватные маршруты из индекса
 * исключаются.
 */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const trip = await api.getTrip(params.slug);
  if (!trip) {
    return { title: 'Маршрут — Vela', robots: { index: false, follow: false } };
  }
  const title = `${trip.title} — маршрут по ${trip.country.name}`;
  const description =
    trip.summary?.trim() ||
    `Маршрут на ${pluralize(trip.durationDays, 'день', 'дня', 'дней')} по стране ${trip.country.name}: план по дням, места, карта и честные данные о тратах.`;
  const isPrivate = trip.visibility === 'PRIVATE';
  return {
    title,
    description,
    alternates: { canonical: `/trips/${trip.slug}` },
    robots: isPrivate ? { index: false, follow: false } : undefined,
    openGraph: {
      type: 'article',
      title,
      description,
      url: `/trips/${trip.slug}`,
      siteName: 'Vela',
      locale: 'ru_RU',
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

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

  return (
    <main className="relative min-h-screen pb-32">
      {/* Аналитика посещений (анонимно, дедуп на бэкенде) */}
      <TripViewBeacon slug={params.slug} />
      <header className="container-vela flex items-center justify-between py-7">
        <Link href="/" data-magnetic className="font-serif text-xl tracking-tightest">
          Vela
        </Link>
        <div className="flex items-center gap-4">
          <CopyTripLink slug={params.slug} visibility={trip.visibility} />
          <InviteTripLink slug={params.slug} visibility={trip.visibility} />
          <EditTripLink slug={params.slug} />
          <PlanLink slug={params.slug} />
          <Link
            href={`/trips/${params.slug}/logistics`}
            data-cursor="hover"
            title="Как добраться, транспорт, отели у аэропорта, таймлайн"
            className="text-sm text-paper-dim hover:text-paper"
          >
            Логистика
          </Link>
          <Link
            href={`/trips/${params.slug}/print`}
            data-cursor="hover"
            title="Печатный документ поездки (PDF)"
            className="text-sm text-paper-dim hover:text-paper"
          >
            PDF
          </Link>
          <SaveOfflineButton slug={params.slug} assets={offlineAssets(trip)} />
          <Link href="/" data-cursor="hover" className="text-sm text-paper-dim hover:text-paper">
            ← Все маршруты
          </Link>
        </div>
      </header>

      {/* ── Кинематографичный герой ── */}
      {imageUrl(trip.heroImage) ? (
        <section className="relative mb-16">
          <div className="relative h-[62vh] min-h-[440px] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(trip.heroImage)!}
              alt={trip.title}
              className="h-full w-full object-cover"
            />
            {/* Explicit dark overlay + light text (image is always dark).
                Двойной скрим: общий градиент + локальная виньетка за текстом —
                текст читается на любом фото, включая светлые участки. */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/15" />
            <div className="absolute inset-0 bg-[radial-gradient(85%_65%_at_18%_88%,rgba(0,0,0,0.62),transparent_72%)]" />
            <div className="absolute inset-x-0 bottom-0">
              <div className="container-vela pb-12">
                <Reveal>
                  <p className="flex items-center gap-3 text-sm uppercase tracking-[0.28em] text-white/85 [text-shadow:0_1px_12px_rgba(0,0,0,0.7)]">
                    <span className="h-px w-8 bg-aurora/80" />
                    {trip.country.name} · {pluralize(trip.durationDays, 'день', 'дня', 'дней')}{trip.seasonLabel ? ` · ${trip.seasonLabel}` : ''}
                  </p>
                </Reveal>
                <Reveal delay={0.08}>
                  <h1 className="mt-5 max-w-4xl font-serif display-2 text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.75),0_10px_50px_rgba(0,0,0,0.5)]">
                    {trip.title}
                  </h1>
                </Reveal>
                {trip.summary && (
                  <Reveal delay={0.16}>
                    <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/95 text-balance [text-shadow:0_1px_10px_rgba(0,0,0,0.8),0_4px_28px_rgba(0,0,0,0.55)]">
                      {trip.summary}
                    </p>
                  </Reveal>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="container-vela relative pb-10 pt-10">
          <Reveal>
            <p className="flex items-center gap-3 text-sm uppercase tracking-[0.28em] text-paper-faint">
              <span className="h-px w-8 bg-aurora/60" />
              {trip.country.name} · {pluralize(trip.durationDays, 'день', 'дня', 'дней')}{trip.seasonLabel ? ` · ${trip.seasonLabel}` : ''}
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-5 max-w-4xl font-serif display-2 text-balance">{trip.title}</h1>
          </Reveal>
          {trip.summary && (
            <Reveal delay={0.16}>
              <p className="mt-6 max-w-2xl text-lg text-paper-dim text-balance">{trip.summary}</p>
            </Reveal>
          )}
        </section>
      )}

      {/* Quick facts */}
      <section className="container-vela pb-16">
        <Reveal>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 rounded-2xl border border-ink-line bg-ink-soft/40 p-6 sm:grid-cols-4 sm:p-8">
            <Fact label="Длительность" value={pluralize(trip.durationDays, 'день', 'дня', 'дней')} />
            <Fact label="Сезон" value={trip.seasonLabel ?? '—'} />
            <Fact
              label="Бюджет (цель)"
              value={
                trip.budgetMinRub && trip.budgetMaxRub
                  ? `${fmt(trip.budgetMinRub)}–${fmt(trip.budgetMaxRub)} ₽`
                  : '—'
              }
            />
            <Fact label="Вариантов темпа" value={trip.variants.length > 0 ? String(trip.variants.length) : '—'} />
          </div>
        </Reveal>
      </section>

      {/* Погода по городам маршрута (Open-Meteo, VERIFIED) */}
      <TripWeather slug={params.slug} />

      {/* Оценки пользователей (звёзды) */}
      <section className="container-vela pb-16">
        <Reveal>
          <TripRating slug={params.slug} initial={trip.rating} />
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
                <div className="card-lux mt-8 rounded-xl p-5">
                  <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">
                    Когда ехать
                  </div>
                  <p className="mt-2 text-paper-dim">{trip.bestTime}</p>
                </div>
              )}
              {trip.visaNote && (
                <div className="card-lux mt-4 rounded-xl p-5">
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

      {/* Interactive experience (карта по дням / весь маршрут внутри) */}
      <section className="container-vela">
        <TripExperience trip={trip} />
      </section>

      {/* Логистика — ПОСЛЕ маршрута и ПЕРЕД бюджетом: сначала человек понимает,
          что увидит, потом как туда добраться, и только потом считает деньги.
          Сам раздел живёт отдельной страницей: он зависит от города вылета и
          дат, и разворачивать его прямо здесь значит утопить страницу. */}
      <section className="container-vela mt-16">
        <Link
          href={`/trips/${params.slug}/logistics`}
          className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-line bg-ink-soft/40 p-7 transition-colors hover:border-aurora/40"
        >
          <span>
            <span className="block font-serif text-2xl tracking-tightest text-paper">
              Логистика путешествия
            </span>
            <span className="mt-1.5 block text-sm text-paper-dim">
              Как добраться, чем ехать внутри страны, где ночевать перед вылетом и в первую ночь
            </span>
          </span>
          <span className="text-sm text-aurora transition-transform group-hover:translate-x-1">
            Открыть →
          </span>
        </Link>
      </section>

      {/* Перелёт под даты (реальные цены Aviasales) + полный расчёт трат */}
      <section className="container-vela mt-16">
        <TripCosts slug={params.slug} durationDays={trip.durationDays} countrySlug={trip.country.slug} />
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
                <Card variant="lux" className="h-full p-7">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.25em] text-paper-faint">
                      {o.persona}
                    </span>
                    {o.rating != null && (
                      <span className="font-serif text-lg text-aurora">{o.rating}</span>
                    )}
                  </div>
                  <p className="mt-4 text-paper-dim">{o.verdict}</p>
                </Card>
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
      <div className="text-xs uppercase tracking-[0.22em] text-paper-faint">
        {label}
      </div>
      <div className="mt-2 font-serif text-xl tracking-tightest text-paper">{value}</div>
    </div>
  );
}

function fmt(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n);
}

/**
 * Картинки маршрута для офлайн-кэша: обложка и фото мест. Ограничиваем список,
 * чтобы «Сохранить офлайн» не тянуло десятки мегабайт на мобильном интернете.
 */
function offlineAssets(trip: Trip): string[] {
  const urls: string[] = [];
  const push = (v?: string | null) => {
    const u = imageUrl(v);
    if (u && !urls.includes(u)) urls.push(u);
  };
  push(trip.heroImage);
  for (const variant of trip.variants) {
    for (const day of variant.days) {
      for (const dp of day.places) push(dp.place.photoUrl);
    }
  }
  for (const h of trip.hotels ?? []) push(h.photoUrl);
  return urls.slice(0, 40);
}
