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
export interface Hotel {
  id: string; name: string; cityLabel?: string | null; address?: string | null;
  lat?: number | null; lng?: number | null; checkIn?: string | null; checkOut?: string | null;
  url?: string | null; area?: string | null; priceNote?: string | null; notes?: string | null;
  photoUrl?: string | null; photos?: string[];
}
export interface ChatMessage {
  id: string; text: string; createdAt: string;
  user: { id: string; name?: string | null; email: string };
}
export interface PlanningOverview {
  tickets: Ticket[]; documents: TripDocument[]; events: CalendarEvent[]; hotels: Hotel[];
}

// ── Expenses (shared-cost calculator) ──
export interface Expense {
  id: string; description: string; amount: number /* kopecks */; currency: string;
  date: string; paidById: string; participants: string[]; shares: number[]; createdAt: string;
}
export interface ExpenseMember { id: string; name?: string | null; email: string }
export interface Settlement {
  balances: { userId: string; net: number }[];
  transfers: { from: string; to: string; amount: number }[];
}
export interface ExpensesOverview {
  members: ExpenseMember[];
  expenses: Expense[];
  settlement: Settlement;
  byDay: { date: string; total: number; settlement: Settlement }[];
}
export interface ExpenseInput {
  description: string; amount: number; currency?: string; date: string;
  paidById?: string; participants?: string[]; shares?: number[];
}

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
  createHotel: (slug: string, data: Partial<Hotel>) => req<Hotel>(`/trips/${slug}/hotels`, { method: 'POST', body: JSON.stringify(data) }),
  deleteHotel: (id: string) => req(`/hotels/${id}`, { method: 'DELETE' }),
  chat: (slug: string, since?: string) => req<ChatMessage[]>(`/trips/${slug}/chat${since ? `?since=${encodeURIComponent(since)}` : ''}`),
  postChat: (slug: string, text: string) => req<ChatMessage>(`/trips/${slug}/chat`, { method: 'POST', body: JSON.stringify({ text }) }),

  // Members
  members: (slug: string) => req<Member[]>(`/trips/${slug}/members`),
  invite: (slug: string, email: string) => req<Member & { invited: boolean }>(`/trips/${slug}/members`, { method: 'POST', body: JSON.stringify({ email }) }),
  removeMember: (slug: string, userId: string) => req(`/trips/${slug}/members/${userId}`, { method: 'DELETE' }),
  setMemberRole: (slug: string, userId: string, role: 'ORGANIZER' | 'MEMBER') =>
    req(`/trips/${slug}/members/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),

  // Expenses
  expenses: (slug: string) => req<ExpensesOverview>(`/trips/${slug}/expenses`),
  createExpense: (slug: string, data: ExpenseInput) => req<Expense>(`/trips/${slug}/expenses`, { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id: string) => req(`/expenses/${id}`, { method: 'DELETE' }),

  // Memories
  memories: (slug: string) => req<MemoriesOverview>(`/trips/${slug}/memories`),
  timeline: (slug: string) => req<TimelineItem[]>(`/trips/${slug}/timeline`),
  createAlbum: (slug: string, title: string) => req<Album>(`/trips/${slug}/albums`, { method: 'POST', body: JSON.stringify({ title }) }),
  deleteAlbum: (id: string) => req(`/albums/${id}`, { method: 'DELETE' }),
  addPhoto: (albumId: string, data: { url: string; caption?: string }) => req<Photo>(`/albums/${albumId}/photos`, { method: 'POST', body: JSON.stringify(data) }),
  deletePhoto: (id: string) => req(`/photos/${id}`, { method: 'DELETE' }),
  createMemory: (slug: string, data: { title: string; text: string; date: string; location?: string; photos?: string[] }) =>
    req<Memory>(`/trips/${slug}/memories`, { method: 'POST', body: JSON.stringify(data) }),
  deleteMemory: (id: string) => req(`/memories/${id}`, { method: 'DELETE' }),
};

export interface Member { id: string; role: string; user: { id: string; email: string; name?: string | null; role: string } }
export interface Photo { id: string; url: string; caption?: string | null; takenAt?: string | null }
export interface Album { id: string; title: string; coverUrl?: string | null; photos: Photo[] }
export interface Memory { id: string; title: string; text: string; date: string; location?: string | null; photos: string[] }
export interface MemoriesOverview { albums: Album[]; memories: Memory[] }
export type TimelineItem =
  | { kind: 'memory'; date: string; title: string; text: string; location?: string | null; photos: string[] }
  | { kind: 'photo'; date: string; title: string; url: string }
  | { kind: 'event'; date: string; title: string; type: string; location?: string | null };

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
