'use client';

// Client-side auth: token in localStorage, sent as Bearer through the /api proxy.
const TOKEN_KEY = 'vela_token';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'ORGANIZER' | 'MEMBER';
export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
  status: string;
  emailVerified: boolean;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  // Also a cookie so Server Components can read it (e.g. private trips).
  document.cookie = `${TOKEN_KEY}=${token}; path=/; max-age=${7 * 24 * 3600}; samesite=lax`;
}
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  if (typeof window !== 'undefined') window.location.href = '/';
}
export function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(extractError(data) || `Ошибка ${res.status}`);
  return data as T;
}

function extractError(data: any): string | null {
  if (!data) return null;
  if (typeof data.message === 'string') return data.message;
  if (data.fieldErrors || data.formErrors) {
    const f = [...(data.formErrors ?? []), ...Object.values(data.fieldErrors ?? {}).flat()];
    return f.join(', ') || null;
  }
  return data.error ?? null;
}

export const auth = {
  async register(email: string, password: string, name?: string) {
    const r = await post<{ token: string; user: AuthUser }>('/auth/register', { email, password, name });
    setToken(r.token);
    return r.user;
  },
  async login(email: string, password: string) {
    const r = await post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    setToken(r.token);
    return r.user;
  },
  forgot: (email: string) => post('/auth/forgot-password', { email }),
  reset: (token: string, password: string) => post('/auth/reset-password', { token, password }),
  verifyEmail: (email: string, code: string) =>
    post<{ ok: boolean; alreadyVerified?: boolean }>('/auth/verify-email', { email, code }),
  resendVerification: () => post<{ ok: boolean; alreadyVerified?: boolean }>('/auth/resend-verification', {}),
  async me(): Promise<AuthUser | null> {
    if (!getToken()) return null;
    const res = await fetch('/api/auth/me', { headers: authHeaders(), cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as AuthUser;
  },
};

export const isAdminRole = (r?: Role) => r === 'ADMIN' || r === 'SUPER_ADMIN';
