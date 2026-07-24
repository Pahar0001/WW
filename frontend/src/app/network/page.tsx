'use client';

import { useEffect, useState } from 'react';
import { auth, type AuthUser } from '@/lib/auth';
import { network, type DirectoryUser, type FriendsOverview, type Relationship } from '@/lib/network';
import type { SocialUser } from '@/lib/social';
import { SocialTabs } from '@/components/social/SocialTabs';
import { Avatar } from '@/components/social/Avatar';

export default function NetworkPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [friends, setFriends] = useState<FriendsOverview | null>(null);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [search, setSearch] = useState('');

  const loadFriends = () => network.friends().then(setFriends).catch(() => {});
  const loadUsers = (q?: string) => network.users(q).then(setUsers).catch(() => {});
  const reload = () => { loadFriends(); loadUsers(search); };

  useEffect(() => {
    auth.me().then((u) => {
      if (!u) { window.location.href = '/login'; return; }
      setMe(u);
      loadFriends(); loadUsers();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search.
  useEffect(() => {
    if (me === undefined) return;
    const id = setTimeout(() => loadUsers(search), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  if (me === undefined) return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Загрузка…</main>;

  return (
    <main className="container-vela min-h-screen py-8 pb-28 md:pb-12">
      <SocialTabs />
      <p className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
        <span className="h-px w-8 bg-aurora/60" />
        Люди
      </p>
      <h1 className="font-serif display-2">Люди</h1>
      <p className="mt-4 max-w-2xl text-lg text-paper-dim">
        Находите попутчиков и друзей, отправляйте заявки.
      </p>

      {friends && friends.incoming.length > 0 && (
        <Section title={`Входящие заявки (${friends.incoming.length})`}>
          {friends.incoming.map((u) => <UserRow key={u.id} user={u} rel="incoming" onChange={reload} />)}
        </Section>
      )}
      {friends && friends.outgoing.length > 0 && (
        <Section title={`Исходящие заявки (${friends.outgoing.length})`}>
          {friends.outgoing.map((u) => <UserRow key={u.id} user={u} rel="outgoing" onChange={reload} />)}
        </Section>
      )}
      {friends && friends.friends.length > 0 && (
        <Section title={`Друзья (${friends.friends.length})`}>
          {friends.friends.map((u) => <UserRow key={u.id} user={u} rel="friends" onChange={reload} />)}
        </Section>
      )}

      <Section title="Все пользователи">
        <input
          className="mb-3 w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60"
          placeholder="Поиск по имени или email…" value={search} onChange={(e) => setSearch(e.target.value)}
        />
        {users.length === 0 && <p className="text-paper-faint">Никого не найдено.</p>}
        {users.map((u) => <UserRow key={u.id} user={u} rel={u.relationship} onChange={reload} />)}
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm uppercase tracking-[0.2em] text-paper-faint">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function UserRow({ user, rel, onChange }: { user: SocialUser & { bio?: string | null }; rel: Relationship; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); onChange(); } finally { setBusy(false); } };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink-line bg-ink-soft/40 p-3 shadow-soft transition-colors hover:border-aurora/30">
      <Avatar user={user} size={40} link />
      <div className="min-w-0 flex-1">
        <div className="truncate text-paper">{user.name || user.email}</div>
        {user.bio ? <div className="truncate text-xs text-paper-faint">{user.bio}</div> : <div className="truncate text-xs text-paper-faint">{user.email}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {rel === 'none' && <Btn onClick={() => act(() => network.request(user.id))} busy={busy}>+ В друзья</Btn>}
        {rel === 'outgoing' && <Ghost onClick={() => act(() => network.remove(user.id))} busy={busy}>Отменить</Ghost>}
        {rel === 'incoming' && (
          <>
            <Btn onClick={() => act(() => network.accept(user.id))} busy={busy}>Принять</Btn>
            <Ghost onClick={() => act(() => network.remove(user.id))} busy={busy}>Отклонить</Ghost>
          </>
        )}
        {rel === 'friends' && <Ghost onClick={() => act(() => network.remove(user.id))} busy={busy}>В друзьях ✓</Ghost>}
      </div>
    </div>
  );
}

function Btn({ children, onClick, busy }: { children: React.ReactNode; onClick: () => void; busy: boolean }) {
  return <button disabled={busy} onClick={onClick} className="rounded-full bg-aurora px-4 py-1.5 text-sm font-medium text-aurora-fg disabled:opacity-50">{children}</button>;
}
function Ghost({ children, onClick, busy }: { children: React.ReactNode; onClick: () => void; busy: boolean }) {
  return <button disabled={busy} onClick={onClick} className="rounded-full border border-ink-line px-4 py-1.5 text-sm text-paper-dim hover:text-paper disabled:opacity-50">{children}</button>;
}
