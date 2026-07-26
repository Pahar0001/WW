'use client';

/**
 * Клиент мессенджера (личные и групповые чаты).
 * Доставка новых сообщений — поллингом (см. /messages), задел под голосовые
 * и кружки: kind у сообщения уже есть, файл поедет в Upload.
 */

import { authHeaders } from './auth';
import type { SocialUser } from './social';

export type ChatMessageKind = 'TEXT' | 'VOICE' | 'VIDEO_NOTE';

export interface ChatMember {
  userId: string;
  role: 'OWNER' | 'MEMBER' | string;
  lastReadAt: string;
  user: SocialUser & { lastSeenAt?: string | null };
}

export interface ChatMessage {
  id: string;
  authorId: string | null;
  kind: ChatMessageKind;
  text: string | null;
  uploadId: string | null;
  createdAt: string;
  author: SocialUser | null;
}

export interface ChatSummary {
  id: string;
  isGroup: boolean;
  title: string | null;
  image: string | null;
  updatedAt: string;
  members: ChatMember[];
  lastMessage: ChatMessage | null;
  unread: number;
}

export interface ChatFull {
  id: string;
  isGroup: boolean;
  title: string | null;
  image: string | null;
  members: ChatMember[];
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init.headers || {}) },
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (typeof j?.message === 'string') msg = j.message;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const chat = {
  list: () => req<ChatSummary[]>(`/chats`),
  unreadCount: () => req<{ unread: number }>(`/chats/unread-count`),
  direct: (userId: string) =>
    req<{ id: string; created: boolean }>(`/chats/direct`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    }),
  createGroup: (title: string, memberIds: string[]) =>
    req<{ id: string; created: boolean }>(`/chats/group`, {
      method: 'POST',
      body: JSON.stringify({ title, memberIds }),
    }),
  get: (id: string) => req<ChatFull>(`/chats/${id}`),
  messages: (id: string, opts: { before?: string; after?: string } = {}) => {
    const qs = new URLSearchParams();
    if (opts.before) qs.set('before', opts.before);
    if (opts.after) qs.set('after', opts.after);
    const suffix = qs.toString() ? `?${qs}` : '';
    return req<ChatMessage[]>(`/chats/${id}/messages${suffix}`);
  },
  send: (id: string, text: string, media?: { kind: 'VOICE' | 'VIDEO_NOTE'; uploadId: string }) =>
    req<ChatMessage>(`/chats/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, ...(media ?? {}) }),
    }),
  markRead: (id: string) => req<{ ok: boolean }>(`/chats/${id}/read`, { method: 'PATCH' }),
  rename: (id: string, title: string) =>
    req<{ ok: boolean; title: string }>(`/chats/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  addMember: (id: string, userId: string) =>
    req<{ ok: boolean }>(`/chats/${id}/members`, { method: 'POST', body: JSON.stringify({ userId }) }),
  leave: (id: string) => req<{ ok: boolean }>(`/chats/${id}/members/me`, { method: 'DELETE' }),
};

/** Имя чата для списка: у группы — title, у 1:1 — имя собеседника. */
export function chatTitle(c: { isGroup: boolean; title: string | null; members: ChatMember[] }, meId: string): string {
  if (c.isGroup) return c.title || 'Группа';
  const other = c.members.find((m) => m.userId !== meId);
  return other?.user.name || other?.user.email || 'Диалог';
}

/** Собеседник в 1:1 (для аватара и онлайн-точки). */
export function chatPeer(c: { isGroup: boolean; members: ChatMember[] }, meId: string) {
  if (c.isGroup) return null;
  return c.members.find((m) => m.userId !== meId) ?? null;
}
