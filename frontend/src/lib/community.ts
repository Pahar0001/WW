'use client';

import { authHeaders } from './auth';

export interface CommunityUser { id: string; name?: string | null; email: string; image?: string | null }

export interface CommunityRoom {
  code: string;
  name: string;
  flag: string;
  messages: number;
  lastActivity: string | null;
}

export interface CommunityMessage {
  id: string;
  country: string;
  text: string;
  parentId: string | null;
  createdAt: string;
  user: CommunityUser;
}

export interface CommunityThread extends CommunityMessage {
  replies: CommunityMessage[];
}

export interface CommunityRoomData {
  country: { code: string; name: string; flag: string };
  threads: CommunityThread[];
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

export const community = {
  rooms: () => req<CommunityRoom[]>(`/community/rooms`),
  room: (country: string) => req<CommunityRoomData>(`/community/${country}`),
  post: (country: string, text: string, parentId?: string) =>
    req<CommunityMessage>(`/community/${country}`, { method: 'POST', body: JSON.stringify({ text, parentId }) }),
  remove: (id: string) => req(`/community/messages/${id}`, { method: 'DELETE' }),
};
