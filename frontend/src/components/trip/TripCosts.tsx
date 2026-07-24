'use client';

import { useState } from 'react';
import { TravelPlanner } from '@/components/trip/TravelPlanner';
import { SpendEstimator } from '@/components/trip/SpendEstimator';

/**
 * Связка «Перелёт и даты» → «Примерные траты»: лучшая реальная цена билетов
 * из планировщика подставляется в расчёт полной стоимости поездки, поэтому
 * итог честно зависит от выбранных дат и города вылета.
 */
export function TripCosts({ slug, durationDays }: { slug: string; durationDays: number }) {
  const [flightPrice, setFlightPrice] = useState<number | null>(null);

  return (
    <div className="space-y-16">
      <TravelPlanner slug={slug} durationDays={durationDays} onBestPrice={setFlightPrice} />
      <SpendEstimator slug={slug} flightPrice={flightPrice} />
    </div>
  );
}
