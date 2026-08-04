'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { REGIONS, COUNTRY_NAME } from '@/components/game/regions';

/**
 * «Вы пришли из мира Vela».
 *
 * Замыкает круг, ради которого игра вообще стоит на сайте путешествий: игрок
 * открыл вымышленный регион, нажал «открыть настоящее путешествие» — и здесь
 * видит, где такой ландшафт существует на самом деле, прямо над формой
 * создания маршрута.
 *
 * ⚠️ Импортирует ТОЛЬКО данные регионов (`regions.ts` — обычный объект без
 * three.js), поэтому трёхмерный бандл игры сюда не тянется: он изолирован
 * маршрутом `/vela`, и утащить его на страницу создания поездки значило бы
 * добавить ей триста килобайт ради одного баннера.
 */
export function FromVelaBanner() {
  const regionId = useSearchParams().get('region');
  if (!regionId) return null;

  const region = REGIONS.find((r) => r.id === regionId);
  if (!region?.realWorld) return null;

  return (
    <div className="mt-8 rounded-2xl border border-aurora/25 bg-aurora/[0.04] p-6">
      <p className="text-xs uppercase tracking-[0.24em] text-paper-faint">Из мира Vela</p>
      <h2 className="mt-2 font-serif text-2xl tracking-tightest text-paper">
        {region.name} — {region.realWorld.theme}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper-dim">
        Вы нашли это место в игре. В настоящем мире похожие пейзажи есть здесь — загляните в
        сообщество страны за визами и правилами въезда, а маршрут соберите ниже.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {region.realWorld.countries.map((slug) => (
          <Link
            key={slug}
            href={`/community/${slug}`}
            className="rounded-full border border-ink-line px-4 py-1.5 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper"
          >
            {COUNTRY_NAME[slug] ?? slug}
          </Link>
        ))}
      </div>
      <Link
        href="/vela"
        className="mt-4 inline-block text-xs text-paper-faint transition-colors hover:text-paper"
      >
        ← Вернуться в мир Vela
      </Link>
    </div>
  );
}
