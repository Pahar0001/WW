'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { auth, type AuthUser } from '@/lib/auth';
import { network, type ProfileView, type Relationship } from '@/lib/network';
import { SocialTabs } from '@/components/social/SocialTabs';
import { Avatar } from '@/components/social/Avatar';

const fmt = (s: string) => new Date(s).toLocaleDateString('ru-RU', { dateStyle: 'medium' });

export default function PublicProfilePage() {
  const id = String(useParams().id);
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [data, setData] = useState<ProfileView | null>(null);
  const [rel, setRel] = useState<Relationship>('none');
  const [busy, setBusy] = useState(false);

  const load = () => network.profile(id).then((p) => { setData(p); setRel(p.relationship); }).catch(() => {});
  useEffect(() => {
    auth.me().then((u) => {
      if (!u) { window.location.href = '/login'; return; }
      setMe(u);
      load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const act = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); load(); } finally { setBusy(false); } };

  if (me === undefined || !data) return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Загрузка…</main>;

  return (
    <main className="container-vela min-h-screen py-8 pb-28 md:pb-12">
      <SocialTabs />
      <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6">
        <div className="flex items-center gap-4">
          <Avatar user={data.user} size={72} />
          <div className="flex-1">
            <h1 className="font-serif text-2xl tracking-tightest text-paper">{data.user.name || data.user.email}</h1>
            {data.user.bio && <p className="mt-1 text-paper-dim">{data.user.bio}</p>}
            <div className="mt-1 text-xs text-paper-faint">Друзей: {data.friendCount} · с {fmt(data.user.createdAt)}</div>
          </div>
          {rel !== 'self' && (
            <div className="shrink-0">
              {rel === 'none' && <button disabled={busy} onClick={() => act(() => network.request(id))} className="rounded-full bg-aurora px-4 py-2 text-sm font-medium text-aurora-fg disabled:opacity-50">+ В друзья</button>}
              {rel === 'outgoing' && <button disabled={busy} onClick={() => act(() => network.remove(id))} className="rounded-full border border-ink-line px-4 py-2 text-sm text-paper-dim">Отменить заявку</button>}
              {rel === 'incoming' && <button disabled={busy} onClick={() => act(() => network.accept(id))} className="rounded-full bg-aurora px-4 py-2 text-sm font-medium text-aurora-fg disabled:opacity-50">Принять заявку</button>}
              {rel === 'friends' && <button disabled={busy} onClick={() => act(() => network.remove(id))} className="rounded-full border border-ink-line px-4 py-2 text-sm text-paper-dim">В друзьях ✓</button>}
            </div>
          )}
        </div>
      </div>

      <h2 className="mt-8 font-serif text-2xl tracking-tightest">Посты</h2>
      <div className="mt-4 space-y-4">
        {data.posts.length === 0 && <p className="text-paper-faint">Постов пока нет.</p>}
        {data.posts.map((p) => (
          <div key={p.id} className="rounded-xl border border-ink-line p-4">
            <div className="text-xs text-paper-faint">{fmt(p.createdAt)}</div>
            <p className="mt-1 whitespace-pre-wrap text-paper">{p.text}</p>
            {p.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt="" className="mt-2 max-h-72 rounded-lg object-cover" />
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
