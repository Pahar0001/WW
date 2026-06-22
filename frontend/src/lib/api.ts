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
  dataStatus: DataStatus;
  source?: string | null;
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
  summary?: string | null;
  durationDays: number;
  seasonLabel?: string | null;
  budgetMinRub?: number | null;
  budgetMaxRub?: number | null;
  country: { name: string; nameLocal?: string | null };
  variants: RouteVariant[];
  scores?: TripScore | null;
  opinions: TripOpinion[];
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
