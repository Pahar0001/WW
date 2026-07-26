'use client';

/**
 * Мобильная навигация: плавающая бургер-кнопка вместо нижнего бара с иконками
 * (шесть значков в ряд сливались и наезжали друг на друга).
 *
 * Кнопка живёт справа внизу; по тапу снизу выезжает шторка со всеми разделами,
 * плюс входы в ИИ-консьерж и поддержку (их плавающие кнопки на мобильных
 * скрыты — см. AssistantWidget/SupportWidget). Только mobile (md:hidden).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { auth } from '@/lib/auth';
import { network } from '@/lib/network';
import { chat } from '@/lib/chat';

const EASE = [0.22, 1, 0.36, 1] as const;

const I = {
  routes: 'M3 7l9-4 9 4-9 4-9-4zM3 7v10l9 4 9-4V7M12 11v10',
  order: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z',
  feed: 'M4 6h16M4 12h16M4 18h10',
  news: 'M4 5h16v14H4zM8 9h8M8 13h5',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18M3.5 9h17M3.5 15h17M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18',
  people: 'M9 11a3 3 0 100-6 3 3 0 000 6zM2 20a7 7 0 0114 0M17 11a3 3 0 100-6',
  chat: 'M21 12a8 8 0 01-8 8H4l2.2-3.3A8 8 0 1121 12z',
  bell: 'M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 21h4',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  spark: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z',
  support: 'M4 5h16v11H7l-3 3V5z',
  login: 'M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3',
};

function Icon({ d, size = 19 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d={d} />
    </svg>
  );
}

// Обвязку не показываем на самодостаточных экранах.
const HIDDEN = ['/welcome'];

export function BottomNav() {
  const path = usePathname() || '/';
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    auth.me().then((u) => {
      setLoggedIn(!!u);
      if (u) {
        network.notifications().then((n) => setUnread(n.unread)).catch(() => {});
        chat.unreadCount().then((c) => setUnreadChats(c.unread)).catch(() => {});
      }
    });
  }, [path]);

  // Смена страницы закрывает шторку.
  useEffect(() => setOpen(false), [path]);

  // Пока шторка открыта, страница под ней не скроллится.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (loggedIn === null || HIDDEN.some((p) => path === p || path.startsWith(p + '/'))) return null;

  const badgeTotal = unread + unreadChats;

  const item = (href: string, label: string, icon: string, badge = 0) => {
    const active = path === href || path.startsWith(href + '/');
    return (
      <Link
        key={href}
        href={href}
        className={`relative flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3.5 text-center text-[12px] leading-tight transition-colors ${
          active
            ? 'border-aurora/50 bg-aurora/10 text-paper'
            : 'border-ink-line bg-ink-soft/40 text-paper-dim active:bg-ink-soft'
        }`}
      >
        <span className={active ? 'text-aurora' : 'text-aurora/70'}>
          <Icon d={icon} />
        </span>
        {label}
        {badge > 0 && (
          <span className="absolute right-2 top-2 inline-grid h-4 min-w-[16px] place-items-center rounded-full bg-aurora px-1 text-[10px] font-semibold text-aurora-fg">
            {badge}
          </span>
        )}
      </Link>
    );
  };

  const action = (label: string, icon: string, onClick: () => void) => (
    <button
      key={label}
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className="flex items-center gap-3 rounded-2xl border border-ink-line bg-ink-soft/40 px-4 py-3.5 text-left text-sm text-paper-dim active:bg-ink-soft"
    >
      <span className="text-aurora/80">
        <Icon d={icon} />
      </span>
      {label}
    </button>
  );

  return (
    <div className="md:hidden">
      {/* Бургер-кнопка */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Закрыть меню' : 'Меню'}
        aria-expanded={open}
        className="glow-gold fixed bottom-5 right-4 z-[9100] grid h-14 w-14 place-items-center rounded-full border border-aurora/40 bg-[#171310]/95 text-aurora shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
      >
        <span className="relative block h-[14px] w-5">
          <span
            className={`absolute left-0 top-0 h-[1.8px] w-full rounded bg-current transition-transform duration-300 ${open ? 'translate-y-[6px] rotate-45' : ''}`}
          />
          <span
            className={`absolute left-0 top-[6px] h-[1.8px] w-full rounded bg-current transition-opacity duration-200 ${open ? 'opacity-0' : ''}`}
          />
          <span
            className={`absolute left-0 top-[12px] h-[1.8px] w-full rounded bg-current transition-transform duration-300 ${open ? '-translate-y-[6px] -rotate-45' : ''}`}
          />
        </span>
        {!open && badgeTotal > 0 && (
          <span className="absolute -right-0.5 -top-0.5 inline-grid h-5 min-w-[20px] place-items-center rounded-full bg-red-500 px-1 text-[11px] font-semibold text-white">
            {badgeTotal}
          </span>
        )}
      </button>

      {/* Шторка меню */}
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              aria-label="Закрыть меню"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[9000] bg-black/55 backdrop-blur-sm"
            />
            <motion.nav
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.4, ease: EASE }}
              className="fixed inset-x-0 bottom-0 z-[9050] max-h-[82vh] overflow-y-auto rounded-t-3xl border-t border-aurora/25 bg-ink pb-[calc(env(safe-area-inset-bottom)+88px)] shadow-[0_-24px_70px_rgba(0,0,0,0.5)]"
            >
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-ink-line" />
              <div className="px-5 pt-5">
                <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.26em] text-paper-faint">
                  <span className="h-px w-6 bg-aurora/60" />
                  Разделы
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2.5">
                  {item('/#dream-trips', 'Маршруты', I.routes)}
                  {item('/order', 'Заказать', I.order)}
                  {item('/community', 'Страны', I.globe)}
                  {loggedIn && item('/feed', 'Лента', I.feed)}
                  {loggedIn && item('/news', 'Новости', I.news)}
                  {loggedIn && item('/network', 'Люди', I.people)}
                  {loggedIn && item('/messages', 'Чаты', I.chat, unreadChats)}
                  {loggedIn && item('/notifications', 'Уведомл.', I.bell, unread)}
                  {loggedIn && item('/profile', 'Профиль', I.user)}
                </div>

                <p className="mt-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.26em] text-paper-faint">
                  <span className="h-px w-6 bg-aurora/60" />
                  Помощь
                </p>
                <div className="mt-3 grid grid-cols-1 gap-2.5">
                  {action('ИИ-консьерж: маршруты, визы, сборы', I.spark, () =>
                    window.dispatchEvent(new Event('vela:open-assistant')),
                  )}
                  {action('Поддержка Vela', I.support, () =>
                    window.dispatchEvent(new Event('vela:open-support')),
                  )}
                  {!loggedIn && (
                    <Link
                      href="/login"
                      className="flex items-center gap-3 rounded-2xl bg-aurora px-4 py-3.5 text-sm font-medium text-aurora-fg"
                    >
                      <Icon d={I.login} />
                      Войти или зарегистрироваться
                    </Link>
                  )}
                </div>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
