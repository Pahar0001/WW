'use client';

// Сессия на клиенте.
//
// Токен живёт в httpOnly-cookie `vela_token`, которую ставит обработчик
// `app/api/auth/[action]/route.ts`; странице он недоступен. Здесь остаётся
// только отметка `vela_session` — «сессия есть», без самого токена, — и чтение
// старого localStorage для тех, кто вошёл до перехода на cookie.
const TOKEN_KEY = 'vela_token';
const SESSION_MARKER = 'vela_session';

export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'ORGANIZER' | 'MEMBER';

/** Виды согласий — те же, что в enum ConsentKind на бэкенде. */
export type ConsentKind =
  | 'TERMS'
  | 'PRIVACY'
  | 'MARKETING'
  | 'COOKIE_ANALYTICS'
  | 'COOKIE_MARKETING';

export interface ConsentEntry {
  kind: ConsentKind;
  granted: boolean;
  /** Редакция документа, которую человек видел на экране. */
  version: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  bio?: string | null;
  role: Role;
  status: string;
  emailVerified: boolean;
  termsAcceptedAt?: string | null;
  /**
   * Обязательные согласия, которых не хватает: их нет вовсе или они даны по
   * устаревшей редакции документа. Непустой список = показать окно-гейт.
   */
  pendingConsents?: ConsentKind[];
}

/**
 * Токен из localStorage — ТОЛЬКО СТАРЫЕ СЕССИИ.
 *
 * Новый вход токен сюда не кладёт: он уезжает в httpOnly-cookie, которую
 * выставляет обработчик `app/api/auth/[action]/route.ts`, и странице недоступен.
 * Функция остаётся ради тех, кто вошёл до этого изменения, — их сессии обязаны
 * дожить до истечения, а не оборваться на деплое.
 */
export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/**
 * Есть ли сессия. Спрашивать надо это, а не `getToken()`: у новых сессий токена
 * на странице нет вовсе, и проверка «есть токен» считала бы вошедшего гостем.
 */
export function hasSession(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(TOKEN_KEY)) return true; // старая сессия
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${SESSION_MARKER}=`));
}

/** Сообщить постоянно висящим слушателям (гейт, меню), что сессия сменилась. */
export function sessionChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('vela:auth-changed'));
}

export function logout() {
  // Сначала чистим старое хранилище, затем просим сервер погасить cookie:
  // httpOnly-cookie из JavaScript не удаляется, это может сделать только он.
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* приватный режим */
  }
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  fetch('/api/auth/logout', { method: 'POST' })
    .catch(() => {
      /* даже если не вышло — уводим на главную, там гость */
    })
    .finally(() => {
      window.location.href = '/';
    });
}

/**
 * Заголовок авторизации. Для новых сессий пуст — и это правильно: cookie уходит
 * с запросом сама (одинаковый origin), а бэкенд читает и заголовок, и cookie.
 */
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
  /**
   * Регистрация. Согласия уходят ВМЕСТЕ с данными, а не отдельным запросом
   * следом: иначе между созданием аккаунта и записью согласия есть окно, в
   * котором данные уже обработаны без основания, а при обрыве связи оно
   * становится постоянным. Без обязательных согласий сервер откажет.
   */
  async register(email: string, password: string, name: string | undefined, consents: ConsentEntry[]) {
    // Токена в ответе нет: обработчик /api/auth/[action] снял его и положил в
    // httpOnly-cookie. Здесь остаётся только сообщить об этом интерфейсу.
    const r = await post<{ user: AuthUser }>('/auth/register', { email, password, name, consents });
    sessionChanged();
    return r.user;
  },
  async login(email: string, password: string) {
    const r = await post<{ user: AuthUser }>('/auth/login', { email, password });
    sessionChanged();
    return r.user;
  },
  forgot: (email: string) => post('/auth/forgot-password', { email }),
  reset: (token: string, password: string) => post('/auth/reset-password', { token, password }),
  verifyEmail: (email: string, code: string) =>
    post<{ ok: boolean; alreadyVerified?: boolean }>('/auth/verify-email', { email, code }),
  resendVerification: () => post<{ ok: boolean; alreadyVerified?: boolean }>('/auth/resend-verification', {}),
  acceptTerms: () => post<{ ok: boolean; termsAcceptedAt: string }>('/auth/accept-terms', {}),
  async me(): Promise<AuthUser | null> {
    if (!hasSession()) {
      meCache = null;
      return null;
    }
    // Dedupe: many components ask for the session on mount. Share one request
    // for a short window instead of hammering the (slow, free-tier) backend.
    const now = Date.now();
    if (meCache && now - meCache.ts < ME_TTL) return meCache.promise;
    const promise = (async () => {
      const res = await fetch('/api/auth/me', { headers: authHeaders(), cache: 'no-store' });
      if (!res.ok) {
        meCache = null;
        return null;
      }
      return (await res.json()) as AuthUser;
    })();
    meCache = { ts: now, promise };
    return promise;
  },
};

// Short-lived shared session cache (invalidated on login/logout below).
const ME_TTL = 15000;
let meCache: { ts: number; promise: Promise<AuthUser | null> } | null = null;
if (typeof window !== 'undefined') {
  window.addEventListener('vela:auth-changed', () => {
    meCache = null;
  });
}

export const isAdminRole = (r?: Role) => r === 'ADMIN' || r === 'SUPER_ADMIN';
