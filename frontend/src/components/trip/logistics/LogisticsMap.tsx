'use client';

import { TripMap } from '@/components/map/TripMap';
import type { LogisticsMapPoint } from '@/lib/logistics';

/**
 * Карта перелёта: аэропорт вылета и аэропорты прилёта, соединённые линией.
 *
 * Переиспользует общую `TripMap` (Leaflet + плитки CARTO без ключа) — своей
 * карты у раздела нет и быть не должно: вторая реализация разъедется с первой
 * при первой же правке оформления.
 *
 * Координаты берутся из справочника аэропортов на бэкенде. Если их нет —
 * блок не рисуется вовсе: пустая карта хуже отсутствующей.
 */
export function LogisticsMap({ points }: { points: LogisticsMapPoint[] }) {
  if (points.length < 2) return null;

  return (
    <div className="h-[340px] sm:h-[420px]">
      <TripMap
        points={points.map((p) => ({ name: p.label, nameLocal: p.sub, lat: p.lat, lng: p.lng }))}
        connect
        fitKey={points.map((p) => p.lat.toFixed(2)).join(',')}
        emptyNote="Координат аэропортов для этого направления пока нет."
      />
    </div>
  );
}
