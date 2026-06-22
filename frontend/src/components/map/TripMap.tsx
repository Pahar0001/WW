'use client';

import { useEffect, useRef, useState } from 'react';
import type { Day } from '@/lib/api';

declare global {
  interface Window {
    google?: any;
    __velaMapsLoading?: Promise<void>;
  }
}

const KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

function loadGoogleMaps(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject();
  if (window.google?.maps) return Promise.resolve();
  if (window.__velaMapsLoading) return window.__velaMapsLoading;
  window.__velaMapsLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}`;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Maps failed to load'));
    document.head.appendChild(s);
  });
  return window.__velaMapsLoading;
}

/**
 * Day-aware map. When a Google Maps key is configured, it plots the day's places
 * and draws the path between them, re-fitting on day change. Without a key (or on
 * failure) it renders a refined static fallback listing the geocoded points —
 * never a broken map, never fabricated coordinates.
 */
export function TripMap({ day }: { day: Day }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [status, setStatus] = useState<'idle' | 'ready' | 'fallback'>('idle');

  const points = day.places
    .map((p) => p.place)
    .filter((p) => p.lat != null && p.lng != null) as Array<{
    name: string;
    lat: number;
    lng: number;
  }>;

  useEffect(() => {
    if (!KEY) {
      setStatus('fallback');
      return;
    }
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = window.google;
        if (!mapRef.current) {
          mapRef.current = new g.maps.Map(ref.current, {
            center: points[0] ?? { lat: 34.0, lng: 110.0 },
            zoom: 5,
            disableDefaultUI: true,
            zoomControl: true,
            styles: DARK_STYLE,
          });
        }
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('fallback'));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render markers + path whenever the day changes.
  useEffect(() => {
    if (status !== 'ready' || !mapRef.current || !window.google) return;
    const g = window.google;
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];
    if (points.length === 0) return;

    const bounds = new g.maps.LatLngBounds();
    points.forEach((p, i) => {
      const marker = new g.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map: mapRef.current,
        label: { text: String(i + 1), color: '#0a0b0d', fontWeight: '600' },
        title: p.name,
      });
      overlaysRef.current.push(marker);
      bounds.extend(marker.getPosition());
    });
    if (points.length > 1) {
      const path = new g.maps.Polyline({
        path: points.map((p) => ({ lat: p.lat, lng: p.lng })),
        geodesic: true,
        strokeColor: '#7fe3d0',
        strokeOpacity: 0.9,
        strokeWeight: 2,
        map: mapRef.current,
      });
      overlaysRef.current.push(path);
    }
    mapRef.current.fitBounds(bounds, 80);
    if (points.length === 1) mapRef.current.setZoom(10);
  }, [day.id, status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'fallback') {
    return (
      <div className="flex h-full min-h-[320px] flex-col justify-between rounded-2xl border border-ink-line bg-ink-soft/60 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-paper-faint">
            Map preview
          </p>
          <p className="mt-2 text-sm text-paper-dim">
            Set <code className="text-aurora">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{' '}
            to enable the interactive map.
          </p>
        </div>
        <ul className="mt-6 space-y-2">
          {points.length === 0 ? (
            <li className="text-sm text-paper-faint">Travel / rest day — no fixed points.</li>
          ) : (
            points.map((p, i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-aurora text-[11px] font-semibold text-ink">
                  {i + 1}
                </span>
                <span className="text-paper">{p.name}</span>
                <span className="text-paper-faint">
                  {p.lat.toFixed(3)}, {p.lng.toFixed(3)}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>
    );
  }

  return <div ref={ref} className="h-full min-h-[320px] w-full rounded-2xl border border-ink-line" />;
}

const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#101216' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0b0d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#a7a39a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0b0d' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c1f26' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];
