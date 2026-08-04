'use client';

import { authHeaders, type ConsentEntry, type ConsentKind } from '@/lib/auth';

/**
 * Клиент разделов «Настройки аккаунта» и «Согласия».
 *
 * Отдельно от `lib/auth.ts`: там сессия, здесь — распоряжение своими данными
 * (согласия, уведомления, выгрузка, удаление). Разные причины меняться.
 */

export interface ConsentState {
  kind: ConsentKind;
  granted: boolean;
  version: string | null;
  at: string | null;
  /** Согласие есть, но по устаревшей редакции документа. */
  outdated: boolean;
}

export interface ConsentRecord {
  kind: ConsentKind;
  granted: boolean;
  version: string;
  source: string | null;
  createdAt: string;
}

export interface NotificationPrefs {
  notifyNews: boolean;
  notifyRoutes: boolean;
  notifyOffers: boolean;
  notifyReminders: boolean;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.message || `Ошибка ${res.status}`);
  return data as T;
}

export const account = {
  consents: () =>
    request<{ current: ConsentState[]; missing: ConsentKind[]; history: ConsentRecord[] }>(
      '/legal/consents',
    ),

  setConsents: (entries: ConsentEntry[], source = 'settings') =>
    request<{ ok: boolean; recorded: number }>('/legal/consent', {
      method: 'POST',
      body: JSON.stringify({ entries, source }),
    }),

  notifications: () => request<NotificationPrefs>('/account/notifications'),

  setNotifications: (patch: Partial<NotificationPrefs>) =>
    request<NotificationPrefs>('/account/notifications', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  exportData: () => request<Record<string, unknown>>('/account/export'),

  remove: (password: string) =>
    request<{ ok: boolean }>('/account', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
};

/**
 * Скачать выгрузку файлом. Собираем файл в браузере из обычного ответа API:
 * так запрос идёт тем же авторизованным путём, что и все остальные, и не нужны
 * одноразовые ссылки, которые пришлось бы хранить на сервере и протухать.
 */
export async function downloadExport(): Promise<void> {
  const data = await account.exportData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vela-данные-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Отзываем адрес не сразу: Safari успевает начать скачивание не мгновенно,
  // и отзыв в том же кадре обрывает его.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
