'use client';

/**
 * Маячок просмотра маршрута — сырьё для аналитики в админке.
 *
 * Ничего не рисует. Отправляет один запрос при открытии страницы; бэкенд сам
 * дедуплицирует повторы одного посетителя за 30 минут. Идентификатор посетителя
 * анонимный (случайный id в localStorage), из реферера сервер оставляет только
 * хост — персональные данные не собираются.
 *
 * ⚠️ Молчит, пока пользователь не разрешил аналитические cookie. Это
 * единственный потребитель категории «аналитические» в баннере согласия, и
 * обещание «отказ прекращает сбор» держится именно здесь.
 */

import { useEffect } from 'react';
import { VISITOR_KEY, analyticsAllowed, CONSENT_EVENT } from '@/lib/cookie-consent';

function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function TripViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    let sent = false;

    const send = () => {
      if (sent || !analyticsAllowed()) return;
      sent = true;
      const token = (() => {
        try {
          return localStorage.getItem('vela_token');
        } catch {
          return null;
        }
      })();
      fetch(`/api/trips/${encodeURIComponent(slug)}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ visitorId: visitorId(), referrer: document.referrer || null }),
        keepalive: true,
      }).catch(() => {
        /* аналитика не должна мешать просмотру страницы */
      });
    };

    send();
    // Согласие часто дают уже на открытой странице — тогда просмотр
    // засчитывается сразу, а не теряется до следующего захода.
    window.addEventListener(CONSENT_EVENT, send);
    return () => window.removeEventListener(CONSENT_EVENT, send);
  }, [slug]);

  return null;
}
