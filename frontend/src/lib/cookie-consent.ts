'use client';

import { DOCUMENT_VERSIONS } from '@/lib/legal/versions';

/**
 * Выбор пользователя в баннере cookie.
 *
 * Хранится в first-party cookie, а НЕ в localStorage, по двум причинам: cookie
 * доступна серверу (пригодится, когда решение понадобится при отрисовке на
 * сервере) и переживает переход между поддоменами. Сама эта cookie отнесена к
 * обязательным — без неё баннер спрашивал бы согласие при каждом заходе.
 */

export const CONSENT_COOKIE = 'vela_cookie_consent';
/** Идентификатор посетителя для обезличенной аналитики (см. TripViewBeacon). */
export const VISITOR_KEY = 'vela_visitor';
/** Событие для тех, кто должен отреагировать на смену решения немедленно. */
export const CONSENT_EVENT = 'vela:cookie-consent';

const MAX_AGE_DAYS = 365;

export interface CookieConsent {
  /** Редакция политики cookies, которую человек видел, принимая решение. */
  v: string;
  analytics: boolean;
  marketing: boolean;
  /** Когда принято решение, ISO. */
  at: string;
}

/**
 * Текущее решение или null, если его нет.
 *
 * Решение по УСТАРЕВШЕЙ редакции политики считается отсутствующим: состав
 * cookie мог измениться, и молча распространять старое согласие на новый
 * состав нельзя — это ровно то, за что согласие перестаёт быть согласием.
 */
export function readConsent(): CookieConsent | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${CONSENT_COOKIE}=`));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw.slice(CONSENT_COOKIE.length + 1)));
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed.v !== DOCUMENT_VERSIONS.COOKIES) return null;
    return {
      v: parsed.v,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      at: typeof parsed.at === 'string' ? parsed.at : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeConsent(choice: { analytics: boolean; marketing: boolean }): CookieConsent {
  const value: CookieConsent = {
    v: DOCUMENT_VERSIONS.COOKIES,
    analytics: choice.analytics,
    marketing: choice.marketing,
    at: new Date().toISOString(),
  };
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; secure' : '';
  document.cookie =
    `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}` +
    `; path=/; max-age=${MAX_AGE_DAYS * 24 * 3600}; samesite=lax${secure}`;

  // Отказ от аналитики должен вступать в силу немедленно, а не «со следующего
  // раза»: удаляем уже сохранённый идентификатор посетителя — ровно это
  // обещано в политике cookies.
  if (!choice.analytics) {
    try {
      localStorage.removeItem(VISITOR_KEY);
    } catch {
      /* приватный режим — хранилище недоступно, и удалять нечего */
    }
  }

  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  return value;
}

/** Разрешена ли аналитика прямо сейчас. Нет решения — считаем, что нет. */
export const analyticsAllowed = (): boolean => readConsent()?.analytics === true;
