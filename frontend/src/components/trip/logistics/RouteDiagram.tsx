import type { FlightOffer } from '@/lib/api';

/**
 * Схема перелёта: откуда, куда, сколько пересадок и сколько часов в воздухе.
 *
 * Раньше это была строка списка «SVO → CAI · 1 пересадка · 2S». Ради ответа на
 * этот вопрос человек и открывает раздел, поэтому он разворачивается в схему:
 * коды аэропортов крупно по краям, между ними линия с точками пересадок, под
 * линией — время в пути. Читается за полсекунды, не вчитываясь.
 */
export function RouteDiagram({ offer }: { offer: FlightOffer }) {
  // Aviasales отдаёт суммарное время за оба плеча; показываем его как есть и
  // подписываем честно, а не делим пополам, выдавая догадку за факт.
  const h = Math.floor(offer.durationMin / 60);
  const m = offer.durationMin % 60;
  const duration = offer.durationMin > 0 ? `${h} ч${m ? ` ${m} мин` : ''}` : null;

  return (
    <div className="flex items-center gap-4 sm:gap-6">
      <Endpoint code={offer.originAirport} />

      <div className="relative flex-1 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="h-px flex-1 bg-gradient-to-r from-aurora/25 to-aurora/60" />
          {offer.transfers > 0 ? (
            Array.from({ length: Math.min(offer.transfers, 3) }).map((_, i) => (
              <span key={i} className="h-1.5 w-1.5 shrink-0 rounded-full bg-aurora/80" />
            ))
          ) : (
            <span className="shrink-0 text-[11px] uppercase tracking-[0.2em] text-aurora/90">
              прямой
            </span>
          )}
          <span className="h-px flex-1 bg-gradient-to-r from-aurora/60 to-aurora/25" />
          <span aria-hidden className="shrink-0 text-aurora/90">
            ✈
          </span>
        </div>
        <p className="mt-2 text-center text-[11px] leading-tight text-paper-faint">
          {offer.transfers > 0 && (
            <>
              {offer.transfers === 1 ? '1 пересадка' : `${offer.transfers} пересадки`}
              {duration ? ' · ' : ''}
            </>
          )}
          {duration && <>{duration} в воздухе, туда и обратно</>}
        </p>
      </div>

      <Endpoint code={offer.destinationAirport} align="right" />
    </div>
  );
}

function Endpoint({ code, align = 'left' }: { code: string; align?: 'left' | 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <p className="font-serif text-2xl leading-none tracking-tightest text-paper sm:text-3xl">
        {code}
      </p>
    </div>
  );
}
