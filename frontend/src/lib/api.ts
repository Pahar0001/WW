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
  visibility?: 'PUBLIC' | 'PRIVATE';
  status?: 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
  country: { name: string; nameLocal?: string | null; slug?: string };
  variants: RouteVariant[];
  scores?: TripScore | null;
  opinions: TripOpinion[];
  hotels?: Hotel[];
  _count?: { members: number };
  rating?: { avg: number; count: number; mine: number | null };
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

export type Comfort = 'BUDGET' | 'STANDARD' | 'COMFORT';

export interface SpendEstimate {
  currency: 'RUB';
  comfort: Comfort;
  comfortIndex: number;
  travelers: number;
  durationDays: number;
  nights: number;
  cities: number;
  transfers: number;
  flight: { perPerson: number; source: 'aviasales'; dataStatus: DataStatus } | null;
  perPerson: {
    categories: { category: string; amount: number | null; dataStatus: DataStatus }[];
    total: number;
    low: number;
    high: number;
  };
  group: { total: number; low: number; high: number };
  dataStatus: DataStatus;
  assumptions: {
    note: string;
    baseRatesEconomy: Record<string, number>;
    comfortIndex: number;
    reserveRate: number;
    band: number;
  };
}

/** Automatic spend estimate for a trip. Browser-only (sends token if present). */
export async function getTripEstimate(
  slug: string,
  params: { travelers?: number; comfort?: Comfort; flightRub?: number | null },
): Promise<SpendEstimate | null> {
  const qs = new URLSearchParams();
  if (params.travelers) qs.set('travelers', String(params.travelers));
  if (params.comfort) qs.set('comfort', params.comfort);
  if (params.flightRub != null) qs.set('flightRub', String(params.flightRub));
  const suffix = qs.toString() ? `?${qs}` : '';
  try {
    const res = await fetch(`${BROWSER_BASE}/trips/${slug}/estimate${suffix}`, {
      headers: authHeader(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as SpendEstimate;
  } catch {
    return null;
  }
}

// ── Перелёт и даты (реальные цены Aviasales через Travelpayouts) ──

export interface FlightOffer {
  price: number; // руб., туда-обратно на человека
  airline: string;
  flightNumber: string;
  departureAt: string;
  returnAt: string | null;
  transfers: number;
  returnTransfers: number;
  durationMin: number;
  originAirport: string;
  destinationAirport: string;
  link: string; // абсолютная ссылка на выдачу Aviasales
}

export interface TravelPlan {
  configured: boolean;
  origin: { iata: string; city: string };
  destination: { iata: string; city: string } | null;
  depart: string;
  return: string;
  nights: number;
  flights: FlightOffer[];
  hotelLinks: { city: string; booking: string; yandex: string; ostrovok: string }[];
  dataStatus: DataStatus;
  fetchedAt: string;
}

/** Реальные цены перелёта + отельные ссылки под даты. Browser-only. */
export async function getTravelPlan(
  slug: string,
  params: { origin: string; depart: string; ret: string },
): Promise<TravelPlan | null> {
  const qs = new URLSearchParams({
    origin: params.origin,
    depart: params.depart,
    return: params.ret,
  });
  try {
    const res = await fetch(`${BROWSER_BASE}/travel/plan/${slug}?${qs}`, {
      headers: authHeader(),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as TravelPlan;
  } catch {
    return null;
  }
}

// ── Заказ путешествия (пожелание → ИИ-бриф → админ) ──

export type TripOrderStatus = 'NEW' | 'IN_PROGRESS' | 'DONE' | 'DECLINED';

export interface TripOrder {
  id: string;
  wish: string;
  brief?: string | null;
  status: TripOrderStatus;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string; name?: string | null };
}

async function post<T>(path: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${BROWSER_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: (data as any)?.message ?? 'Ошибка запроса' };
    return { ok: true, data: data as T };
  } catch {
    return { ok: false, error: 'Сеть недоступна. Попробуйте ещё раз.' };
  }
}

/** ИИ-конкретизация пожелания (предпросмотр брифа, без сохранения). */
export const refineOrder = (wish: string) =>
  post<{ brief: string | null; configured: boolean }>('/orders/refine', { wish });

/** Отправить заявку админу. */
export const createOrder = (wish: string, brief?: string | null) =>
  post<TripOrder>('/orders', { wish, brief });

/** Мои заявки. Browser-only. */
export async function listMyOrders(): Promise<TripOrder[]> {
  try {
    const res = await fetch(`${BROWSER_BASE}/orders/mine`, { headers: authHeader(), cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as TripOrder[];
  } catch {
    return [];
  }
}

/** Все заявки (админка). */
export async function adminListOrders(): Promise<TripOrder[]> {
  try {
    const res = await fetch(`${BROWSER_BASE}/orders`, { headers: authHeader(), cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as TripOrder[];
  } catch {
    return [];
  }
}

/** Обновить статус/комментарий заявки (админка). */
export async function adminUpdateOrder(
  id: string,
  patch: { status?: TripOrderStatus; adminNote?: string },
): Promise<boolean> {
  try {
    const res = await fetch(`${BROWSER_BASE}/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Trips the logged-in user belongs to (incl. private). Browser-only (uses token). */
export async function listMyTrips(): Promise<Trip[]> {
  try {
    const res = await fetch(`${BROWSER_BASE}/trips/mine`, { headers: authHeader(), cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Trip[];
  } catch {
    return [];
  }
}

/** All trips for the admin panel (incl. private / archived). Browser-only. */
export async function adminListTrips(params?: {
  search?: string;
  status?: string;
  visibility?: string;
}): Promise<Trip[]> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);
  if (params?.visibility) qs.set('visibility', params.visibility);
  const suffix = qs.toString() ? `?${qs}` : '';
  try {
    const res = await fetch(`${BROWSER_BASE}/admin/trips${suffix}`, { headers: authHeader(), cache: 'no-store' });
    if (!res.ok) return [];
    return (await res.json()) as Trip[];
  } catch {
    return [];
  }
}

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
  pace?: 'CALM' | 'BALANCED' | 'ACTIVE';
  seasonLabel?: string;
  startWindow?: string;
  endWindow?: string;
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

/** Copy a public trip into the current user's own private copy. */
export async function copyTrip(
  slug: string,
): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  try {
    const res = await fetch(`${BROWSER_BASE}/trips/${slug}/copy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader() },
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
  // When provided, replaces the whole itinerary / hotel list.
  days?: CreateTripPayload['days'];
  hotels?: CreateTripPayload['hotels'];
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

/** Submit a 1–5 star rating for a trip; returns the fresh aggregate. */
export async function rateTrip(
  slug: string,
  stars: number,
): Promise<{ avg: number; count: number; mine: number | null }> {
  const res = await fetch(`${BROWSER_BASE}/trips/${slug}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ stars }),
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json();
}
