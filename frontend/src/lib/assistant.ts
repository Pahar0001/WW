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

export const assistant = {
  status: () => req<{ configured: boolean }>(`/assistant/status`),
  chat: (messages: AssistantMessage[]) =>
    req<{ reply: string }>(`/assistant/chat`, { method: 'POST', body: JSON.stringify({ messages }) }),
};
