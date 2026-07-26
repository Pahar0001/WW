'use client';

/**
 * «Сохранить офлайн»: кладёт в кэш браузера страницу маршрута, её печатную
 * версию и фотографии мест — поездка открывается в самолёте и в роуминге, где
 * интернета нет.
 *
 * Список адресов собирается на сервере (см. вызов на странице маршрута) и
 * отправляется service worker'у, который и наполняет кэш.
 */

import { useEffect, useState } from 'react';

type State = 'idle' | 'saving' | 'saved' | 'unsupported' | 'error';

export function SaveOfflineButton({ slug, assets }: { slug: string; assets: string[] }) {
  const [state, setState] = useState<State>('idle');
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('caches' in window)) {
      setState('unsupported');
      return;
    }
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'TRIP_CACHED') {
        setState('saved');
        setNote(`сохранено ${e.data.saved} из ${e.data.total}`);
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, []);

  async function save() {
    setState('saving');
    setNote(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      if (!reg.active) throw new Error('Service worker не активен');
      reg.active.postMessage({
        type: 'CACHE_TRIP',
        urls: [`/trips/${slug}`, `/trips/${slug}/print`, ...assets],
      });
      // Страховка: если ответ не пришёл (например, SW обновляется) — не висим.
      setTimeout(() => setState((s) => (s === 'saving' ? 'saved' : s)), 8000);
    } catch {
      setState('error');
    }
  }

  if (state === 'unsupported') return null;

  return (
    <button
      onClick={save}
      disabled={state === 'saving'}
      data-cursor="hover"
      title="Сохранить маршрут для просмотра без интернета"
      className="text-sm text-paper-dim transition-colors hover:text-paper disabled:opacity-60"
    >
      {state === 'saving' && 'Сохраняю…'}
      {state === 'saved' && `Офлайн ✓${note ? ` · ${note}` : ''}`}
      {state === 'error' && 'Не удалось'}
      {state === 'idle' && 'Офлайн'}
    </button>
  );
}
