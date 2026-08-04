'use client';

import type { Trip } from '@/lib/api';
import { imageUrl } from '@/lib/api';

/**
 * "Где остановиться". Two honest sources, no invented data:
 *  1) Curated hotels added in the admin panel (real links the editor provided).
 *  2) Auto per-city search links to aggregators (real deep links, no API key) —
 *     so users always have a way to pick real hotels, even with zero curated ones.
 */
export function HotelsSection({
  trip,
  variant,
}: {
  trip: Trip;
  variant: Trip['variants'][number];
}) {
  const hotels = trip.hotels ?? [];

  // Distinct cities in this itinerary, in order of first appearance.
  const cities: string[] = [];
  for (const d of variant.days) {
    const c = d.baseCity?.trim();
    if (c && !cities.includes(c)) cities.push(c);
  }

  /**
   * ⚠️ Здесь стояли ссылки на Booking (`searchresults?ss=`) и Яндекс
   * Путешествия (`/hotels/?text=`), и ОБЕ были мёртвыми: Booking сбрасывает
   * запрос на главную, Яндекс открывает пустую форму. Комментарий над ними
   * уверял, что адрес живой, — уверенности в комментарии оказалось больше, чем
   * проверки. Ни один сервис бронирования не принимает поиск по тексту ссылкой;
   * разбор и список проверенных форматов — в `backend/src/common/place-links.ts`.
   *
   * Поиск по карте отдаёт живой список отелей города с рейтингами и ценами.
   * Проверено в браузере: у SPA код ответа 200 приходит и на мёртвый адрес.
   */
  const mapSearchUrl = (city: string) =>
    `https://yandex.ru/maps/?text=${encodeURIComponent(`отели, ${city}`)}`;

  return (
    <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-7">
      <h3 className="font-serif text-2xl tracking-tightest">Где остановиться</h3>

      {/* Curated hotels */}
      {hotels.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {hotels.map((h) => {
            const photo = imageUrl(h.photoUrl);
            return (
              <div key={h.id} className="overflow-hidden rounded-xl border border-ink-line">
                {photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt={h.name} className="h-36 w-full object-cover" />
                )}
                <div className="p-4">
                  {h.cityLabel && (
                    <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">
                      {h.cityLabel}
                    </div>
                  )}
                  <div className="mt-1 text-paper">{h.name}</div>
                  {h.area && <div className="mt-0.5 text-sm text-paper-dim">{h.area}</div>}
                  <div className="mt-3 flex items-center justify-between">
                    {h.priceNote ? (
                      <span className="text-sm text-paper">{h.priceNote}</span>
                    ) : (
                      <span className="text-xs text-paper-faint">цена уточняется</span>
                    )}
                    {h.url && (
                      <a
                        href={h.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-cursor="hover"
                        className="rounded-full border border-aurora/40 px-4 py-1.5 text-sm text-aurora transition-colors hover:bg-aurora/10"
                      >
                        Открыть →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Per-city search links */}
      {cities.length > 0 && (
        <div className="mt-6">
          <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">
            Подобрать отели по городам маршрута
          </div>
          <div className="mt-3 space-y-2">
            {cities.map((c) => (
              <div
                key={c}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-line px-4 py-3"
              >
                <span className="text-paper">{c}</span>
                <a
                  href={mapSearchUrl(c)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="hover"
                  className="rounded-full border border-ink-line px-4 py-1.5 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper"
                >
                  Отели на карте →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-5 text-xs leading-relaxed text-paper-faint">
        Конкретные отели — это реальные ссылки, добавленные вручную. Цены не
        выдумываются: они показываются только если указаны явно. Ссылки «по городам»
        ведут в поиск агрегаторов без API-ключей.
      </p>
    </div>
  );
}
