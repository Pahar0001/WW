'use client';

/**
 * PWA-обвязка: регистрация service worker'а, предложение установить приложение
 * и индикатор офлайна.
 *
 * Service worker регистрируется только в проде — в dev он мешал бы HMR.
 * Предложение установки показывается один раз: событие beforeinstallprompt
 * приходит только тогда, когда браузер сам счёл сайт устанавливаемым.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const DISMISS_KEY = 'vela_install_dismissed';
const EASE = [0.22, 1, 0.36, 1] as const;

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaProvider() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(false);

  // Регистрация SW.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // ── Разработка: не просто «не регистрируем», а СНИМАЕМ чужой ──
    //
    // Прод-сборка в докере поднимается на том же localhost:3000, регистрирует
    // service worker и оставляет его жить. Дальше на этот же адрес встаёт
    // dev-сервер — а в режиме разработки имена чанков БЕЗ хешей
    // (`/_next/static/chunks/app/vela/page.js`). Статика у нас отдаётся
    // cache-first, поэтому SW бесконечно подсовывает dev-серверу чанки от
    // докер-сборки, и страница падает с client-side exception. Симптом
    // выглядит как поломка приложения, хотя код в порядке.
    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations?.().then(
        (regs) => regs.forEach((r) => r.unregister()),
        () => undefined,
      );
      // Кэш сохранённых поездок не трогаем — это данные пользователя.
      if ('caches' in window) {
        caches.keys().then(
          (keys) =>
            keys
              .filter((k) => k.startsWith('vela-') && k !== 'vela-trips')
              .forEach((k) => caches.delete(k)),
          () => undefined,
        );
      }
      return;
    }

    const onLoad = () => {
      // Версия в адресе: при новом BUILD_ID браузер видит другой SW, ставит его
      // и в `activate` вычищает кэши предыдущей сборки (см. sw.js).
      const v = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';
      navigator.serviceWorker.register(`/sw.js?v=${encodeURIComponent(v)}`).catch(() => {
        /* офлайн-режим просто не включится — сайт работает как обычно */
      });
    };
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  // Предложение установки.
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      try {
        if (localStorage.getItem(DISMISS_KEY)) return;
      } catch {
        /* приватный режим — покажем предложение */
      }
      setDeferred(e as InstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', () => setDeferred(null));
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  // Индикатор соединения.
  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* не критично */
    }
    setDeferred(null);
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
  }

  return (
    <>
      <AnimatePresence>
        {offline && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="fixed inset-x-0 top-0 z-[9600] bg-[#14100c]/95 py-2 text-center text-xs uppercase tracking-[0.18em] text-aurora backdrop-blur"
          >
            Нет соединения · доступны сохранённые страницы
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deferred && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed bottom-36 right-4 z-[8600] w-[min(92vw,340px)] rounded-2xl border border-aurora/25 bg-[#14100c]/95 p-4 text-white shadow-[0_24px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl md:bottom-24"
          >
            <div className="flex items-start gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/icons/icon-192.png" alt="" className="h-11 w-11 rounded-xl" />
              <div className="min-w-0">
                <div className="font-serif text-base tracking-tightest">Vela на телефоне</div>
                <p className="mt-1 text-[13px] leading-relaxed text-white/65">
                  Установите приложение — быстрый запуск и доступ к своей поездке без интернета.
                </p>
              </div>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={dismiss}
                className="rounded-full px-3 py-1.5 text-sm text-white/50 transition-colors hover:text-white"
              >
                Не сейчас
              </button>
              <button
                onClick={install}
                className="glow-gold rounded-full bg-aurora px-4 py-1.5 text-sm font-medium text-aurora-fg"
              >
                Установить
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
