import { cookies } from 'next/headers';
import Link from 'next/link';
import type { Metadata } from 'next';
import { api, imageUrl, type Day, type RouteVariant, type Trip } from '@/lib/api';
import { PrintControls } from '@/components/trip/PrintControls';
import { plural, pluralize } from '@/lib/plural';

/**
 * Печатная версия маршрута — фирменный документ поездки.
 *
 * Открывается по «Скачать PDF» со страницы маршрута; PDF получается через
 * системный диалог печати (вектор, живые ссылки, работает офлайн). Содержит
 * обложку, ключевые факты, план по дням с описаниями мест, переезды, отели и
 * чек-листы сборов.
 *
 * Real Data Policy: в документ попадает только то, что есть в маршруте —
 * никаких «примерных» цен или расстояний, которых нет в базе.
 */

export const metadata: Metadata = { robots: { index: false, follow: false } };

const PACE_RU: Record<string, string> = {
  CALM: 'спокойный темп',
  BALANCED: 'сбалансированный темп',
  ACTIVE: 'активный темп',
};

// Соответствует enum TransportMode в схеме БД.
const MODE_RU: Record<string, string> = {
  WALK: 'пешком',
  HIGH_SPEED_RAIL: 'скоростной поезд',
  TRAIN: 'поезд',
  FLIGHT: 'перелёт',
  CAR: 'автомобиль',
  BUS: 'автобус',
  CABLE_CAR: 'канатная дорога',
  FERRY: 'паром',
};

// Как на странице маршрута (TripExperience) — документ говорит тем же языком.
const CATEGORY_RU: Record<string, string> = {
  FLIGHTS: 'Перелёты',
  HOTELS: 'Отели',
  TRANSPORT: 'Транспорт',
  FOOD: 'Питание',
  ACTIVITIES: 'Развлечения',
  RESERVE: 'Резерв',
};

const CURRENCY_RU: Record<string, string> = { RUB: '₽', USD: '$', EUR: '€' };

const DOCS_CHECKLIST = [
  'Загранпаспорт (срок действия — с запасом)',
  'Виза или разрешение на въезд, если требуется',
  'Распечатка брони жилья',
  'Билеты туда и обратно',
  'Медицинская страховка',
  'Банковская карта, работающая в стране поездки',
  'Наличные на первый день',
  'Копии документов отдельно от оригиналов',
];

const PACK_CHECKLIST = [
  'Одежда по погоде и удобная обувь',
  'Аптечка: личные лекарства, пластыри, средство от расстройства желудка',
  'Зарядки, павербанк, переходник под местные розетки',
  'Дождевик или зонт',
  'Солнцезащитный крем и очки',
  'Многоразовая бутылка для воды',
];

function pickVariant(trip: Trip, pace?: string): RouteVariant | null {
  if (trip.variants.length === 0) return null;
  if (pace) {
    const exact = trip.variants.find((v) => v.pace === pace);
    if (exact) return exact;
  }
  return trip.variants.find((v) => v.pace === 'BALANCED') ?? trip.variants[0];
}

export default async function TripPrintPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { pace?: string };
}) {
  const token = cookies().get('vela_token')?.value;
  const trip = await api.getTrip(params.slug, token);

  if (!trip) {
    return (
      <main id="print-root" className="container-vela min-h-screen py-20">
        <PrintControls slug={params.slug} title="Маршрут" />
        <p className="text-paper-dim">
          Маршрут не найден или доступен только участникам.{' '}
          <Link href={`/trips/${params.slug}`} className="text-aurora hover:underline">
            Открыть страницу маршрута
          </Link>
          .
        </p>
      </main>
    );
  }

  const variant = pickVariant(trip, searchParams?.pace);
  const days: Day[] = variant?.days ?? [];
  const hotels = trip.hotels ?? [];
  const budgetLines = variant?.budget?.lines?.filter((l) => l.amount != null) ?? [];
  const printedAt = new Date().toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <main id="print-root" className="container-vela min-h-screen py-10">
      <PrintControls slug={params.slug} title={trip.title} />

      {/* ── Обложка ── */}
      <header className="print-avoid-break border-b border-ink-line pb-8">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-serif text-2xl tracking-tightest">Vela</span>
          <span className="text-xs uppercase tracking-[0.28em] text-paper-faint">
            План путешествия
          </span>
        </div>

        <h1 className="mt-8 font-serif text-4xl leading-tight tracking-tightest sm:text-5xl">
          {trip.title}
        </h1>
        <p className="mt-3 text-sm uppercase tracking-[0.24em] text-paper-faint">
          {trip.country.name} · {pluralize(trip.durationDays, 'день', 'дня', 'дней')}
          {trip.seasonLabel ? ` · ${trip.seasonLabel}` : ''}
          {variant ? ` · ${PACE_RU[variant.pace] ?? ''}` : ''}
        </p>
        {trip.summary && (
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-paper-dim">{trip.summary}</p>
        )}

        {imageUrl(trip.heroImage) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl(trip.heroImage)!}
            alt=""
            className="mt-7 h-56 w-full rounded-xl object-cover"
          />
        )}
      </header>

      {/* ── Ключевые факты ── */}
      <section className="print-avoid-break mt-8 grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
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
        <Fact label="Городов в плане" value={String(baseCities(days).length || '—')} />
      </section>

      {(trip.bestTime || trip.visaNote) && (
        <section className="print-avoid-break mt-8 grid gap-4 sm:grid-cols-2">
          {trip.bestTime && <Note title="Когда ехать" body={trip.bestTime} />}
          {trip.visaNote && <Note title="Виза" body={trip.visaNote} />}
        </section>
      )}

      {trip.highlights && trip.highlights.length > 0 && (
        <section className="print-avoid-break mt-8">
          <h2 className="font-serif text-2xl tracking-tightest">Главное</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {trip.highlights.map((h, i) => (
              <li key={i} className="flex items-start gap-2.5 text-paper-dim">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-aurora" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── План по дням ── */}
      {days.length > 0 && (
        <section className="print-page-break mt-12">
          <h2 className="font-serif text-3xl tracking-tightest">План по дням</h2>
          <p className="mt-2 text-sm text-paper-faint">
            {pluralize(days.length, 'день', 'дня', 'дней')}
            {variant?.title ? ` · вариант «${variant.title}»` : ''}
          </p>

          <div className="mt-8 space-y-8">
            {days.map((d) => (
              <article key={d.id} className="print-avoid-break border-t border-ink-line pt-5">
                <div className="flex items-baseline gap-4">
                  <span className="font-serif text-3xl text-aurora">
                    {String(d.dayNumber).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-serif text-xl tracking-tightest">
                      {d.title || `День ${d.dayNumber}`}
                    </h3>
                    {d.baseCity && (
                      <p className="text-xs uppercase tracking-[0.2em] text-paper-faint">
                        база: {d.baseCity}
                      </p>
                    )}
                  </div>
                </div>

                {d.places.length > 0 && (
                  <ol className="mt-4 space-y-3.5">
                    {d.places
                      .slice()
                      .sort((a, b) => a.order - b.order)
                      .map((p, i) => (
                        <li key={p.id} className="flex gap-3">
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-aurora/50 text-[11px] text-aurora">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-paper">
                              {p.place.name}
                              {p.place.nameLocal && (
                                <span className="text-paper-faint"> · {p.place.nameLocal}</span>
                              )}
                            </div>
                            {p.place.description && (
                              <p className="mt-1 text-sm leading-relaxed text-paper-dim">
                                {p.place.description}
                              </p>
                            )}
                            {p.place.howToGet && (
                              <p className="mt-1 text-sm text-paper-dim">
                                <span className="text-paper-faint">Как добраться: </span>
                                {p.place.howToGet}
                              </p>
                            )}
                            {p.place.tips && (
                              <p className="mt-1 text-sm text-paper-dim">
                                <span className="text-paper-faint">Совет: </span>
                                {p.place.tips}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                  </ol>
                )}

                {d.legs.length > 0 && (
                  <ul className="mt-4 space-y-1.5 border-l border-ink-line pl-4">
                    {d.legs.map((l) => (
                      <li key={l.id} className="text-sm text-paper-dim">
                        <span className="text-paper-faint">{MODE_RU[l.mode] ?? l.mode}: </span>
                        {l.fromLabel} → {l.toLabel}
                        {l.distanceKm != null && ` · ${l.distanceKm} км`}
                        {l.durationMin != null && ` · ${formatMinutes(l.durationMin)}`}
                        {l.dataStatus !== 'VERIFIED' && (
                          <span className="text-paper-faint"> (оценка)</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Жильё ── */}
      {hotels.length > 0 && (
        <section className="print-avoid-break mt-12">
          <h2 className="font-serif text-2xl tracking-tightest">Где остановиться</h2>
          <ul className="mt-5 space-y-4">
            {hotels.map((h) => (
              <li key={h.id} className="print-avoid-break border-t border-ink-line pt-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-paper">{h.name}</span>
                  {h.cityLabel && (
                    <span className="shrink-0 text-xs uppercase tracking-[0.2em] text-paper-faint">
                      {h.cityLabel}
                    </span>
                  )}
                </div>
                {h.area && <p className="mt-1 text-sm text-paper-dim">Район: {h.area}</p>}
                {h.address && <p className="mt-1 text-sm text-paper-dim">{h.address}</p>}
                {h.priceNote && <p className="mt-1 text-sm text-paper-dim">{h.priceNote}</p>}
                {h.url && (
                  <p className="mt-1 break-all text-xs text-paper-faint">{h.url}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Бюджет из маршрута (только то, что есть в базе) ── */}
      {budgetLines.length > 0 && (
        <section className="print-avoid-break mt-12">
          <h2 className="font-serif text-2xl tracking-tightest">Бюджет маршрута</h2>
          <table className="mt-4 w-full text-sm">
            <tbody>
              {budgetLines.map((l, i) => (
                <tr key={i} className="border-t border-ink-line">
                  <td className="py-2 text-paper-dim">{CATEGORY_RU[l.category] ?? l.category}</td>
                  <td className="py-2 text-right text-paper">
                    {fmt(l.amount!)}{' '}
                    {CURRENCY_RU[variant?.budget?.currency ?? 'RUB'] ??
                      variant?.budget?.currency ??
                      '₽'}
                  </td>
                  <td className="w-24 py-2 text-right text-xs text-paper-faint">
                    {l.dataStatus === 'VERIFIED' ? 'проверено' : 'оценка'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-paper-faint">
            Актуальные цены билетов и трат считаются на странице маршрута — они зависят от дат.
          </p>
        </section>
      )}

      {/* ── Чек-листы ── */}
      <section className="print-page-break mt-12">
        <h2 className="font-serif text-3xl tracking-tightest">Чек-листы</h2>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          <Checklist title="Документы и деньги" items={DOCS_CHECKLIST} />
          <Checklist title="Сборы" items={PACK_CHECKLIST} />
        </div>
        <div className="mt-8">
          <h3 className="text-xs uppercase tracking-[0.22em] text-paper-faint">Заметки</h3>
          <div className="mt-3 space-y-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="border-b border-ink-line" />
            ))}
          </div>
        </div>
      </section>

      {/* ── Подвал ── */}
      <footer className="print-avoid-break mt-12 border-t border-ink-line pt-5 text-xs text-paper-faint">
        <p>
          Vela · velatrips.ru/trips/{trip.slug} · документ сформирован {printedAt}
        </p>
        <p className="mt-1">
          Данные о местах — из открытых источников с указанием провенанса на сайте. Визовые правила
          и расписания проверяйте на официальных источниках перед поездкой.
        </p>
      </footer>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] text-paper-faint">{label}</div>
      <div className="mt-1.5 font-serif text-lg tracking-tightest text-paper">{value}</div>
    </div>
  );
}

function Note({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-ink-line p-4">
      <div className="text-[10px] uppercase tracking-[0.22em] text-paper-faint">{title}</div>
      <p className="mt-1.5 text-sm leading-relaxed text-paper-dim">{body}</p>
    </div>
  );
}

function Checklist({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="print-avoid-break">
      <h3 className="text-xs uppercase tracking-[0.22em] text-paper-faint">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((it) => (
          <li key={it} className="flex items-start gap-2.5 text-sm text-paper-dim">
            <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[3px] border border-paper-faint/60" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function baseCities(days: Day[]): string[] {
  return Array.from(new Set(days.map((d) => d.baseCity).filter(Boolean) as string[]));
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} мин`;
  return m === 0 ? `${h} ${plural(h, 'час', 'часа', 'часов')}` : `${h} ч ${m} мин`;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n);
}
