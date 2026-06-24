'use client';

import { authHeaders } from './auth';

export interface SupportMessage {
  id: string;
  text: string;
  fromSupport: boolean;
  createdAt: string;
  userId: string;
  authorId?: string | null;
}
export interface SupportThread {
  user: { id: string; email: string; name?: string | null };
  lastText: string;
  lastAt: string | null;
  fromSupport: boolean;
  count: number;
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

export const support = {
  // User side (own thread)
  myThread: (since?: string) =>
    req<SupportMessage[]>(`/support/thread${since ? `?since=${encodeURIComponent(since)}` : ''}`),
  post: (text: string) => req<SupportMessage>(`/support/thread`, { method: 'POST', body: JSON.stringify({ text }) }),

  // Admin side (SUPER_ADMIN)
  threads: () => req<SupportThread[]>(`/support/threads`),
  threadMessages: (userId: string, since?: string) =>
    req<SupportMessage[]>(`/support/threads/${userId}${since ? `?since=${encodeURIComponent(since)}` : ''}`),
  reply: (userId: string, text: string) =>
    req<SupportMessage>(`/support/threads/${userId}`, { method: 'POST', body: JSON.stringify({ text }) }),
};
