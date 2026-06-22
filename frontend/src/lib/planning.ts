'use client';

import { authHeaders } from './auth';

export type TicketKind = 'FLIGHT' | 'TRAIN' | 'BUS' | 'FERRY' | 'OTHER';
export type EventType = 'FLIGHT' | 'HOTEL_CHECKIN' | 'HOTEL_CHECKOUT' | 'EXCURSION' | 'MEETING' | 'REMINDER' | 'OTHER';

export interface Ticket {
  id: string; kind: TicketKind; carrier?: string | null; code?: string | null;
  fromLocation?: string | null; toLocation?: string | null;
  departAt?: string | null; arriveAt?: string | null; seat?: string | null;
  notes?: string | null; fileUrl?: string | null;
}
export interface TripDocument {
  id: string; title: string; category?: string | null; fileUrl: string; mime?: string | null; createdAt: string;
}
export interface Reminder { id: string; offsetMinutes: number; channel: string; sent: boolean; }
export interface CalendarEvent {
  id: string; type: EventType; title: string; startAt: string; endAt?: string | null;
  location?: string | null; notes?: string | null; reminders: Reminder[];
}
export interface PlanningOverview { tickets: Ticket[]; documents: TripDocument[]; events: CalendarEvent[]; }

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init.headers || {}) },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const planning = {
  overview: (slug: string) => req<PlanningOverview>(`/trips/${slug}/planning`),
  createTicket: (slug: string, data: Partial<Ticket>) => req<Ticket>(`/trips/${slug}/tickets`, { method: 'POST', body: JSON.stringify(data) }),
  deleteTicket: (id: string) => req(`/tickets/${id}`, { method: 'DELETE' }),
  createDocument: (slug: string, data: { title: string; category?: string; fileUrl: string; mime?: string }) =>
    req<TripDocument>(`/trips/${slug}/documents`, { method: 'POST', body: JSON.stringify(data) }),
  deleteDocument: (id: string) => req(`/documents/${id}`, { method: 'DELETE' }),
  createEvent: (
    slug: string,
    data: { type?: EventType; title: string; startAt: string; endAt?: string; location?: string; notes?: string; reminders?: number[] },
  ) => req<CalendarEvent>(`/trips/${slug}/events`, { method: 'POST', body: JSON.stringify(data) }),
  deleteEvent: (id: string) => req(`/events/${id}`, { method: 'DELETE' }),
};

// Upload a file (image or PDF) via the authenticated uploads endpoint.
export async function uploadFile(file: File): Promise<{ ok: true; url: string; mime: string } | { ok: false; error: string }> {
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/uploads', { method: 'POST', body: fd, headers: authHeaders() });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { path: string };
    return { ok: true, url: data.path, mime: file.type };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
