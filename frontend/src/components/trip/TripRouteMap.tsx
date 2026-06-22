'use client';

import { useEffect, useRef, useState } from 'react';

// Whole-trip overview map (OpenStreetMap + Leaflet, no key): all attractions
// (numbered, connected by a route line) + hotels (distinct markers).
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
    s.onerror = () => reject(new Error('Leaflet failed'));
    document.head.appendChild(s);
  });
  return window.__velaLeaflet;
}

export interface MapPoint { name: string; lat: number; lng: number }

export function TripRouteMap({ places, hotels }: { places: MapPoint[]; hotels: MapPoint[] }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then(() => {
      if (cancelled || !elRef.current || mapRef.current) { if (!cancelled) setReady(true); return; }
      const L = window.L;
      mapRef.current = L.map(elRef.current, { scrollWheelZoom: false }).setView([32.5, 114], 4);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18, attribution: '© OpenStreetMap, © CARTO',
      }).addTo(mapRef.current);
      setReady(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !mapRef.current || !window.L) return;
    const L = window.L;
    const all: [number, number][] = [];

    places.forEach((p, i) => {
      all.push([p.lat, p.lng]);
      const icon = L.divIcon({
        className: '',
        html: `<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#7fe3d0;color:#0a0b0d;font:600 11px/1 system-ui">${i + 1}</span>`,
        iconSize: [24, 24], iconAnchor: [12, 12],
      });
      L.marker([p.lat, p.lng], { icon }).addTo(mapRef.current).bindPopup(`<b>${i + 1}. ${p.name}</b>`);
    });
    if (places.length > 1) {
      L.polyline(places.map((p) => [p.lat, p.lng]), { color: '#7fe3d0', weight: 2, opacity: 0.8 }).addTo(mapRef.current);
    }
    hotels.forEach((h) => {
      all.push([h.lat, h.lng]);
      const icon = L.divIcon({
        className: '',
        html: `<span style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#f2d27a;color:#0a0b0d;font:600 12px/1 system-ui">🏨</span>`,
        iconSize: [24, 24], iconAnchor: [12, 12],
      });
      L.marker([h.lat, h.lng], { icon }).addTo(mapRef.current).bindPopup(`<b>🏨 ${h.name}</b>`);
    });

    if (all.length) {
      mapRef.current.fitBounds(L.latLngBounds(all).pad(0.15));
      setTimeout(() => mapRef.current?.invalidateSize(), 50);
    }
  }, [ready, places, hotels]);

  return <div ref={elRef} className="h-[420px] w-full overflow-hidden rounded-2xl border border-ink-line" />;
}
