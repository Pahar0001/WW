'use client';

import { authHeaders } from './auth';

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
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
      if (j?.message) msg = typeof j.message === 'string' ? j.message : msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

/** Сохранённый диалог (раздел /assistant). */
export interface ThreadSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface Thread extends ThreadSummary {
  messages: StoredMessage[];
}

export const assistant = {
  status: () => req<{ configured: boolean }>(`/assistant/status`),
  chat: (messages: AssistantMessage[]) =>
    req<{ reply: string }>(`/assistant/chat`, { method: 'POST', body: JSON.stringify({ messages }) }),

  // ── Диалоги с историей ──
  threads: () => req<ThreadSummary[]>(`/assistant/threads`),
  createThread: (title?: string) =>
    req<ThreadSummary>(`/assistant/threads`, {
      method: 'POST',
      body: JSON.stringify({ title: title ?? null }),
    }),
  thread: (id: string) => req<Thread>(`/assistant/threads/${id}`),
  renameThread: (id: string, title: string) =>
    req<ThreadSummary>(`/assistant/threads/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) }),
  deleteThread: (id: string) => req<{ ok: boolean }>(`/assistant/threads/${id}`, { method: 'DELETE' }),
  send: (id: string, content: string) =>
    req<{ thread: ThreadSummary; userMessage: StoredMessage; message: StoredMessage }>(
      `/assistant/threads/${id}/messages`,
      { method: 'POST', body: JSON.stringify({ content }) },
    ),
};
