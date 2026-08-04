'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

/**
 * Unified trip map (OpenStreetMap tiles via CARTO + Leaflet, NO API KEY).
 * Renders a set of points (numbered, optionally connected by a route line) and
 * optional hotels. Used both for a single day and for the whole route — the
 * parent switches the `points`/`fitKey`. Coordinates come from the backend;
 * nothing is fabricated. The Leaflet flag prefix in the attribution is removed.
 *
 * ⚠️ LEAFLET БЕРЁТСЯ ИЗ СВОЕГО БАНДЛА, НЕ С CDN. Раньше скрипт и стили
 * подгружались тегами с unpkg.com, и появление строгой CSP (`script-src 'self'`)
 * это молча убило: карта переставала грузиться на всех страницах маршрутов, а в
 * консоли оставалось только сообщение о блокировке. Возвращать CDN, дописав
 * unpkg в разрешённые источники, не надо — своя копия лучше по трём причинам:
 * CSP остаётся строгой, карта не зависит от чужого сервиса, и IP посетителя не
 * уходит в стороннюю сеть доставки, которой нет в политике обработки ПДн.
 *
 * Грузим динамическим импортом, а не обычным: Leaflet трогает `window` на
 * верхнем уровне модуля и на отрисовке на сервере падает.
 */
declare global {
  interface Window {
    L?: any;
    __velaLeaflet?: Promise<void>;
  }
}

function loadLeaflet(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.L) return Promise.resolve();
  if (window.__velaLeaflet) return window.__velaLeaflet;
  window.__velaLeaflet = import('leaflet').then((mod) => {
    // Остальной код компонента работает через `window.L` — оставляем как было.
    window.L = (mod as any).default ?? mod;
  });
  return window.__velaLeaflet;
}

export interface MapPoint {
  name: string;
  nameLocal?: string | null;
  lat: number;
  lng: number;
}

const GOLD = '#b8863b';

export function TripMap({
  points,
  hotels = [],
  connect = true,
  emptyNote = 'Нет фиксированных точек на карте.',
  fitKey,
}: {
  points: MapPoint[];
  hotels?: MapPoint[];
  connect?: boolean;
  emptyNote?: string;
  fitKey?: string;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  // Init the map once.
  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => {
        if (cancelled || !elRef.current || mapRef.current) {
          if (!cancelled) setState('ready');
          return;
        }
        const L = window.L;
        const dark =
          typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        mapRef.current = L.map(elRef.current, {
          zoomControl: true,
          scrollWheelZoom: false,
          attributionControl: true,
        }).setView([34.0, 110.0], 4);
        // Remove the Leaflet "🇺🇦 Leaflet" flag prefix from the attribution.
        mapRef.current.attributionControl.setPrefix(false);
        const tiles = dark
          ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        L.tileLayer(tiles, {
          maxZoom: 19,
          attribution: '© OpenStreetMap, © CARTO',
        }).addTo(mapRef.current);
        setState('ready');
      })
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, []);

  // Redraw markers + path when the point set changes.
  useEffect(() => {
    if (state !== 'ready' || !mapRef.current || !window.L) return;
    const L = window.L;

    if (layerRef.current) layerRef.current.remove();
    layerRef.current = L.layerGroup().addTo(mapRef.current);
    if (points.length === 0) return;

    const latlngs: [number, number][] = [];
    points.forEach((p, i) => {
      latlngs.push([p.lat, p.lng]);
      const icon = L.divIcon({
        className: 'vela-pin',
        html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:${GOLD};color:#fff;font:600 12px/1 system-ui;box-shadow:0 2px 8px rgba(0,0,0,.45)">${i + 1}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([p.lat, p.lng], { icon })
        .addTo(layerRef.current)
        .bindPopup(
          `<strong>${p.name}</strong>${p.nameLocal ? ` <span style="opacity:.6">${p.nameLocal}</span>` : ''}`,
        );
    });

    if (connect && latlngs.length > 1) {
      L.polyline(latlngs, { color: GOLD, weight: 2.5, opacity: 0.85 }).addTo(layerRef.current);
    }

    hotels.forEach((h) => {
      latlngs.push([h.lat, h.lng]);
      const icon = L.divIcon({
        className: '',
        html: `<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:7px;background:#3b342a;color:${GOLD};font:600 12px/1 system-ui;box-shadow:0 2px 8px rgba(0,0,0,.45)">🏨</span>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });
      L.marker([h.lat, h.lng], { icon }).addTo(layerRef.current).bindPopup(`<b>🏨 ${h.name}</b>`);
    });

    if (latlngs.length === 1) {
      mapRef.current.setView(latlngs[0], 10);
    } else {
      mapRef.current.fitBounds(L.latLngBounds(latlngs), { padding: [44, 44] });
    }
    setTimeout(() => mapRef.current?.invalidateSize(), 50);
  }, [fitKey, state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === 'error') {
    return <FallbackList points={points} note="Карта не загрузилась. Показываем точки списком." />;
  }

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-2xl border border-ink-line">
      <div ref={elRef} className="h-full w-full" />
      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink-soft/70 px-6 text-center text-sm text-paper-faint">
          {emptyNote}
        </div>
      )}
    </div>
  );
}

function FallbackList({ points, note }: { points: MapPoint[]; note: string }) {
  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-2xl border border-ink-line bg-ink-soft/60 p-6">
      <p className="text-sm text-paper-dim">{note}</p>
      <ul className="mt-4 space-y-2">
        {points.map((p, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-aurora text-[11px] font-semibold text-aurora-fg">
              {i + 1}
            </span>
            <span className="text-paper">{p.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
