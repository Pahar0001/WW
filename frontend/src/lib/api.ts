// Thin typed client for the Vela API.
//
// The browser always calls the app's OWN origin ("/api") — Next.js proxies those
// to the backend at runtime (see src/app/api/[...path]/route.ts). This removes
// build-time API URLs and cross-origin CORS entirely.
// Server Components call the backend directly via BACKEND_URL (faster, no hop).
const BROWSER_BASE = '/api';

function serverBase(): string {
  const origin = process.env.BACKEND_URL?.replace(/\/$/, '') ?? 'http://localhost:4000';
  return `${origin}/api`;
}

/** Turn a stored image value into a displayable URL.
 *  Absolute URLs (Wikipedia, etc.) pass through; "/uploads/…" stay relative and
 *  are proxied to the backend by the Next.js server. */
export function imageUrl(value?: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  return value.startsWith('/') ? value : `/${value}`;
}

function baseUrl(): string {
  return typeof window === 'undefined' ? serverBase() : BROWSER_BASE;
}

// Bearer header for authenticated write calls (client-side only).
function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const t = localStorage.getItem('vela_token');
  return t ? { Authorization: `Bearer ${t}` } : {};
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
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  checkIn?: string | null;
  checkOut?: string | null;
  url?: string | null;
  area?: string | null;
  priceNote?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  photos?: string[];
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

async function get<T>(path: string, token?: string): Promise<T | null> {
  const url = `${baseUrl()}${path}`;
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  // Retry to ride out free-tier cold starts: a sleeping backend returns 502/503
  // for ~30–50s while it wakes. We poll instead of rendering an empty 404.
  const delays = [0, 1500, 3000, 5000, 7000, 9000];
  for (let i = 0; i < delays.length; i++) {
    if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
    try {
      const res = await fetch(url, {
        cache: 'no-store',
        signal: AbortSignal.timeout(25000),
        headers: authHeader,
      });
      if (res.ok) return (await res.json()) as T;
      if (res.status >= 400 && res.status < 500) return null; // genuine 4xx
      // 5xx (cold-start) -> retry
    } catch {
      // network error / timeout -> retry
    }
  }
  return null; // still down after retries -> graceful empty state
}

export const api = {
  listTrips: () => get<Trip[]>('/trips'),
  getTrip: (slug: string, token?: string) => get<Trip>(`/trips/${slug}`, token),
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
  visibility?: 'PUBLIC' | 'PRIVATE';
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
      headers: { 'Content-Type': 'application/json', ...authHeader() },
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

export interface UpdateTripPayload {
  title?: string;
  subtitle?: string;
  summary?: string;
  longDescription?: string;
  highlights?: string[];
  bestTime?: string;
  visaNote?: string;
  heroImage?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  seasonLabel?: string;
  durationDays?: number;
  budgetMinRub?: number | null;
  budgetMaxRub?: number | null;
}

/** Update trip-level fields (ORGANIZER+). */
export async function updateTrip(
  slug: string,
  payload: UpdateTripPayload,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BROWSER_BASE}/trips/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Delete a trip by slug (admin). */
export async function deleteTrip(
  slug: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BROWSER_BASE}/trips/${slug}`, { method: 'DELETE', headers: authHeader() });
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
    const res = await fetch(`${BROWSER_BASE}/uploads`, { method: 'POST', body: fd, headers: authHeader() });
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
