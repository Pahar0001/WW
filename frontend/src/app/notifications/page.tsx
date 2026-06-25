'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, type AuthUser } from '@/lib/auth';
import { network, type AppNotification } from '@/lib/network';
import { SocialTabs } from '@/components/social/SocialTabs';
import { Avatar } from '@/components/social/Avatar';

const fmt = (s: string) => new Date(s).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

function describe(n: AppNotification): { text: string; href: string } {
  const who = n.actor?.name || n.actor?.email || 'Кто-то';
  switch (n.type) {
    case 'FRIEND_REQUEST': return { text: `${who} отправил(а) заявку в друзья`, href: '/network' };
    case 'FRIEND_ACCEPT': return { text: `${who} принял(а) вашу заявку в друзья`, href: n.actorId ? `/u/${n.actorId}` : '/network' };
    case 'LIKE': return { text: `${who} оценил(а) ваш ${n.targetType === 'POST' ? 'пост' : 'маршрут'}`, href: n.targetType === 'POST' ? '/news' : '/feed' };
    case 'COMMENT': return { text: `${who} прокомментировал(а) ваш ${n.targetType === 'POST' ? 'пост' : 'маршрут'}`, href: n.targetType === 'POST' ? '/news' : '/feed' };
    case 'REPOST': return { text: `${who} репостнул(а) ваш маршрут`, href: '/feed' };
    default: return { text: 'Уведомление', href: '/feed' };
  }
}

export default function NotificationsPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [items, setItems] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    auth.me().then((u) => {
      if (!u) { window.location.href = '/login'; return; }
      setMe(u);
      network.notifications().then((n) => {
        setItems(n.items);
        if (n.unread > 0) network.markRead().catch(() => {});
      }).catch(() => setItems([]));
    });
  }, []);

  if (me === undefined) return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Загрузка…</main>;

  return (
    <main className="container-vela min-h-screen py-8 pb-28 md:pb-12">
      <SocialTabs />
      <h1 className="font-serif text-3xl tracking-tightest md:text-4xl">Уведомления</h1>

      <div className="mt-8 space-y-2">
        {!items && <p className="text-paper-faint">Загрузка…</p>}
        {items && items.length === 0 && <p className="text-paper-faint">Уведомлений пока нет.</p>}
        {items?.map((n) => {
          const d = describe(n);
          return (
            <Link key={n.id} href={d.href} className={`flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-aurora/40 ${n.read ? 'border-ink-line' : 'border-aurora/40 bg-aurora/5'}`}>
              <Avatar user={n.actor} size={38} />
              <div className="flex-1">
                <div className="text-sm text-paper">{d.text}</div>
                <div className="text-xs text-paper-faint">{fmt(n.createdAt)}</div>
              </div>
              {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-aurora" />}
            </Link>
          );
        })}
      </div>
    </main>
  );
}
