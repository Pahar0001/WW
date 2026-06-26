'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { community, type CommunityRoom } from '@/lib/community';
import { SocialTabs } from '@/components/social/SocialTabs';

const fmtAgo = (s: string | null) => {
  if (!s) return 'нет сообщений';
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

export default function CommunityPage() {
  const [rooms, setRooms] = useState<CommunityRoom[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    community.rooms().then(setRooms).catch(() => setRooms([]));
  }, []);

  const filtered = useMemo(() => {
    if (!rooms) return [];
    const s = q.trim().toLowerCase();
    return s ? rooms.filter((r) => r.name.toLowerCase().includes(s)) : rooms;
  }, [rooms, q]);

  return (
    <main className="container-vela min-h-screen py-8 pb-28 md:pb-12">
      <SocialTabs />
      <h1 className="font-serif text-3xl tracking-tightest md:text-4xl">Сообщество по странам</h1>
      <p className="mt-2 max-w-2xl text-paper-dim">
        Общий чат с разделением по странам: делитесь опытом по визам и документам,
        задавайте вопросы и отвечайте другим путешественникам.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск страны…"
        className="mt-6 w-full max-w-sm rounded-full border border-ink-line bg-ink px-4 py-2.5 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60"
      />

      {!rooms ? (
        <p className="mt-8 text-paper-faint">Загрузка…</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Link
              key={r.code}
              href={`/community/${r.code}`}
              data-cursor="hover"
              className="group flex items-center gap-4 rounded-2xl border border-ink-line bg-ink-soft/40 p-4 transition-colors hover:border-aurora/40"
            >
              <span className="text-3xl" aria-hidden>{r.flag}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-paper group-hover:text-aurora">{r.name}</div>
                <div className="text-xs text-paper-faint">
                  {r.messages} {plural(r.messages)} · {fmtAgo(r.lastActivity)}
                </div>
              </div>
              <span className="text-paper-faint transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          ))}
          {filtered.length === 0 && <p className="text-paper-faint">Ничего не найдено.</p>}
        </div>
      )}
    </main>
  );
}

function plural(n: number): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return 'сообщений';
  if (b > 1 && b < 5) return 'сообщения';
  if (b === 1) return 'сообщение';
  return 'сообщений';
}
