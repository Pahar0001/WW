// Thin typed client for the Vela API.
//
// Important: in Docker, server components run INSIDE the `web` container, where
// `localhost` is the web container itself — not the backend. So on the server we
// must call the backend by its service name (API_INTERNAL_URL=http://backend:4000).
// In the browser we use the host-mapped NEXT_PUBLIC_API_URL (http://localhost:4000).
const BROWSER_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const SERVER_BASE =
  process.env.API_INTERNAL_URL ?? BROWSER_BASE;

// API origin without the /api suffix — used to build absolute URLs for uploaded
// images (which are served from /uploads, outside the /api prefix).
export const API_ORIGIN = BROWSER_BASE.replace(/\/api\/?$/, '');

/** Turn a stored image value into a displayable URL.
 *  Absolute URLs (Wikipedia, etc.) pass through; /uploads paths get the origin. */
export function imageUrl(value?: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  return `${API_ORIGIN}${value.startsWith('/') ? '' : '/'}${value}`;
}

function baseUrl(): string {
  return typeof window === 'undefined' ? SERVER_BASE : BROWSER_BASE;
}

export type DataStatus = 'VERIFIED' | 'ESTIMATED' | 'PENDING';
export type Pace = 'CALM' | 'BALANCED' | 'ACTIVE';

export interface Place {
  id: string;
  name: string;
  nameLocal?: string | null;
  kind?: string | null;
  lat?: number | null;
  lng?: number | null;
  description?: string | null;
  photoUrl?: string | null;
  photos?: string[];
  howToGet?: string | null;
  tips?: string | null;
  nearby?: string | null;
  dataStatus: DataStatus;
  source?: string | null;
}

export interface Hotel {
  id: string;
  cityLabel?: string | null;
  name: string;
  url?: string | null;
  area?: string | null;
  priceNote?: string | null;
  photoUrl?: string | null;
  rating?: number | null;
  dataStatus: DataStatus;
}

export interface TransportLeg {
  id: string;
  mode: string;
  fromLabel: string;
  toLabel: string;
  distanceKm?: number | null;
  durationMin?: number | null;
  dataStatus: DataStatus;
}

export interface Day {
  id: string;
  dayNumber: number;
  title?: string | null;
  baseCity?: string | null;
  loadIndex?: number | null;
  places: { id: string; order: number; place: Place }[];
  legs: TransportLeg[];
}

export interface BudgetLine {
  category: string;
  amount?: number | null;
  dataStatus: DataStatus;
}

export interface RouteVariant {
  id: string;
  pace: Pace;
  title?: string | null;
  days: Day[];
  budget?: { currency: string; lines: BudgetLine[] } | null;
}

export interface TripScore {
  comfort: number;
  beauty: number;
  history: number;
  load: number;
  valueRatio: number;
  uniqueness: number;
  nature: number;
  overall: number;
}

export interface TripOpinion {
  persona: string;
  verdict: string;
  rating?: number | null;
}

export interface Trip {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  heroImage?: string | null;
  summary?: string | null;
  longDescription?: string | null;
  highlights?: string[];
  bestTime?: string | null;
  visaNote?: string | null;
  durationDays: number;
  seasonLabel?: string | null;
  budgetMinRub?: number | null;
  budgetMaxRub?: number | null;
  country: { name: string; nameLocal?: string | null };
  variants: RouteVariant[];
  scores?: TripScore | null;
  opinions: TripOpinion[];
  hotels?: Hotel[];
}

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${baseUrl()}${path}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null; // API down -> caller renders a graceful empty state
  }
}

export const api = {
  listTrips: () => get<Trip[]>('/trips'),
  getTrip: (slug: string) => get<Trip>(`/trips/${slug}`),
};

// CMS create — called from the browser (client component), so it uses the
// browser base URL directly.
export interface CreateTripPayload {
  countryName: string;
  title: string;
  subtitle?: string;
  summary?: string;
  longDescription?: string;
  highlights?: string[];
  bestTime?: string;
  visaNote?: string;
  heroImage?: string;
  seasonLabel?: string;
  durationDays: number;
  budgetMinRub?: number;
  budgetMaxRub?: number;
  hotels?: Array<{
    cityLabel?: string;
    name: string;
    url?: string;
    area?: string;
    priceNote?: string;
    photoUrl?: string;
  }>;
  days: Array<{
    title?: string;
    baseCity?: string;
    notes?: string;
    places: Array<{
      name: string;
      nameLocal?: string;
      lat?: number;
      lng?: number;
      description?: string;
      photoUrl?: string;
      photos?: string[];
      howToGet?: string;
      tips?: string;
      nearby?: string;
    }>;
  }>;
}

export async function createTrip(
  payload: CreateTripPayload,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${BROWSER_BASE}/trips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${detail.slice(0, 300)}` };
    }
    const data = (await res.json()) as { slug: string };
    return { ok: true, slug: data.slug };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Delete a trip by slug (admin). */
export async function deleteTrip(
  slug: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BROWSER_BASE}/trips/${slug}`, { method: 'DELETE' });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Upload an image file; returns an absolute URL on success. */
export async function uploadImage(
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${BROWSER_BASE}/uploads`, { method: 'POST', body: fd });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${t.slice(0, 200)}` };
    }
    const data = (await res.json()) as { path: string };
    return { ok: true, url: imageUrl(data.path)! };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
