'use client';

import { useEffect, useRef, useState } from 'react';
import type { Day } from '@/lib/api';

/**
 * Day-aware map on OpenStreetMap + Leaflet — NO API KEY REQUIRED.
 * Leaflet is loaded from a CDN on the client (no extra npm dependency, no SSR
 * issues). It plots the selected day's places as numbered markers, draws the
 * path between them, fits the view, and re-renders when the day changes.
 * Markers are clickable (popups). Coordinates come straight from the backend;
 * nothing is fabricated. Days with no fixed points show a graceful note.
 */
declare global {
  interface Window {
    L?: any;
    __velaLeaflet?: Promise<void>;
  }
}

const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

function loadLeaflet(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.L) return Promise.resolve();
  if (window.__velaLeaflet) return window.__velaLeaflet;
  window.__velaLeaflet = new Promise<void>((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const s = document.createElement('script');
    s.src = LEAFLET_JS;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Leaflet failed to load'));
    document.head.appendChild(s);
  });
  return window.__velaLeaflet;
}

export function TripMap({ day }: { day: Day }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const points = day.places
    .map((dp) => dp.place)
    .filter((p) => p.lat != null && p.lng != null) as Array<{
    name: string;
    nameLocal?: string | null;
    lat: number;
    lng: number;
  }>;

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
        mapRef.current = L.map(elRef.current, {
          zoomControl: true,
          scrollWheelZoom: true,
          attributionControl: true,
        }).setView([34.0, 110.0], 4);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 18,
          attribution: '© OpenStreetMap contributors',
        }).addTo(mapRef.current);
        setState('ready');
      })
      .catch(() => !cancelled && setState('error'));
    return () => {
      cancelled = true;
    };
  }, []);

  // Redraw markers + path on day change.
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
        html: `<span style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#7fe3d0;color:#0a0b0d;font:600 12px/1 system-ui;box-shadow:0 2px 8px rgba(0,0,0,.5)">${i + 1}</span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });
      L.marker([p.lat, p.lng], { icon })
        .addTo(layerRef.current)
        .bindPopup(
          `<strong>${p.name}</strong>${p.nameLocal ? ` <span style="opacity:.6">${p.nameLocal}</span>` : ''}`,
        );
    });

    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: '#7fe3d0', weight: 2, opacity: 0.9 }).addTo(
        layerRef.current,
      );
    }

    const bounds = L.latLngBounds(latlngs);
    if (latlngs.length === 1) {
      mapRef.current.setView(latlngs[0], 10);
    } else {
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
    // Leaflet sometimes needs a nudge after layout/animation.
    setTimeout(() => mapRef.current?.invalidateSize(), 50);
  }, [day.id, state]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === 'error') {
    return (
      <FallbackList points={points} note="Карта не загрузилась. Показываем точки списком." />
    );
  }

  return (
    <div className="relative h-full min-h-[320px] w-full overflow-hidden rounded-2xl border border-ink-line">
      <div ref={elRef} className="h-full w-full" />
      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-ink-soft/70 text-sm text-paper-faint">
          День отдыха / переезд — без фиксированных точек.
        </div>
      )}
    </div>
  );
}

function FallbackList({
  points,
  note,
}: {
  points: Array<{ name: string; lat: number; lng: number }>;
  note: string;
}) {
  return (
    <div className="flex h-full min-h-[320px] flex-col rounded-2xl border border-ink-line bg-ink-soft/60 p-6">
      <p className="text-sm text-paper-dim">{note}</p>
      <ul className="mt-4 space-y-2">
        {points.map((p, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-aurora text-[11px] font-semibold text-ink">
              {i + 1}
            </span>
            <span className="text-paper">{p.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
