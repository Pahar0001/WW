'use client';

import { authHeaders, type Role } from './auth';

export interface AdminUser {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  status: 'ACTIVE' | 'BLOCKED';
  emailVerified: boolean;
  createdAt: string;
}
export interface AdminStats {
  users: number;
  trips: number;
  publishedTrips: number;
  memberships: number;
  recentUsers: AdminUser[];
}
export interface AuditRow {
  id: string;
  action: string;
  objectType?: string | null;
  objectId?: string | null;
  ip?: string | null;
  createdAt: string;
  user?: { email: string } | null;
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, {
    ...init,
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const admin = {
  stats: () => req<AdminStats>('/stats'),
  users: (search = '', role = '') =>
    req<AdminUser[]>(`/users?search=${encodeURIComponent(search)}&role=${role}`),
  setRole: (id: string, role: Role) => req<AdminUser>(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  block: (id: string) => req<AdminUser>(`/users/${id}/block`, { method: 'POST' }),
  unblock: (id: string) => req<AdminUser>(`/users/${id}/unblock`, { method: 'POST' }),
  verify: (id: string) => req<AdminUser>(`/users/${id}/verify`, { method: 'POST' }),
  resetPassword: (id: string) => req<{ tempPassword: string }>(`/users/${id}/reset-password`, { method: 'POST' }),
  remove: (id: string) => req<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' }),
  audit: () => req<AuditRow[]>('/audit?limit=100'),
};
