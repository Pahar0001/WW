'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { auth, type AuthUser } from '@/lib/auth';
import { community, type CommunityRoomData, type CommunityMessage, type CommunityThread } from '@/lib/community';
import { Avatar } from '@/components/social/Avatar';
import { toast } from '@/components/ui/Toaster';
import { EntryRequirements } from '@/components/community/EntryRequirements';
import { CountryIntro } from '@/components/community/CountryIntro';

const fmt = (s: string) => new Date(s).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

export default function CommunityRoomPage({ params }: { params: { country: string } }) {
  const country = params.country;
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [data, setData] = useState<CommunityRoomData | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = () =>
    community
      .room(country)
      .then(setData)
      .catch(() => setNotFound(true));

  useEffect(() => {
    auth.me().then((u) => setMe(u));
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country]);

  if (notFound) {
    return (
      <main className="container-vela flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <p className="text-paper-dim">Такой страны нет в сообществе.</p>
        <Link href="/community" className="text-aurora hover:underline">← Ко всем странам</Link>
      </main>
    );
  }

  return (
    <main className="container-vela min-h-screen py-8 pb-28 md:pb-12">
      <div className="flex items-center gap-2 text-sm text-paper-faint">
        <Link href="/community" className="hover:text-paper">← Сообщество</Link>
      </div>

      <header className="mt-4 flex items-center gap-4">
        <span className="text-4xl" aria-hidden>{data?.country.flag ?? '🌍'}</span>
        <div>
          <h1 className="font-serif text-3xl tracking-tightest md:text-4xl">{data?.country.name ?? '…'}</h1>
          <p className="text-sm text-paper-dim">Опыт по визам и документам · вопросы и ответы</p>
        </div>
      </header>

      {/* Ознакомительный гид по стране */}
      {data && <CountryIntro code={country} countryName={data.country.name} flag={data.country.flag} />}

      {/* Требования и ограничения по въезду/выезду (справочно) */}
      {data && <EntryRequirements code={country} countryName={data.country.name} />}

      {me === null && (
        <div className="mt-6 rounded-xl border border-aurora/30 bg-aurora/10 px-4 py-3 text-sm text-paper-dim">
          Чтобы задавать вопросы и отвечать,{' '}
          <Link href="/login" className="text-aurora hover:underline">войдите</Link>.
        </div>
      )}

      {me && <Composer country={country} onPosted={load} />}

      <div className="mt-8 space-y-5">
        {!data && <p className="text-paper-faint">Загрузка…</p>}
        {data && data.threads.length === 0 && (
          <p className="text-paper-faint">Пока нет вопросов. Будьте первым — поделитесь опытом или спросите.</p>
        )}
        {data?.threads.map((t) => (
          <ThreadCard key={t.id} thread={t} country={country} me={me ?? null} onChange={load} />
        ))}
      </div>
    </main>
  );
}

function Composer({ country, onPosted }: { country: string; onPosted: () => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await community.post(country, text.trim());
      setText('');
      onPosted();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-ink-line bg-ink-soft/40 p-5">
      <textarea
        className="min-h-[80px] w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60"
        placeholder="Задайте вопрос или поделитесь опытом по документам этой страны…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-3 flex justify-end">
        <button
          disabled={busy || !text.trim()}
          onClick={send}
          className="rounded-full bg-aurora px-5 py-2 text-sm font-medium text-aurora-fg disabled:opacity-50"
        >
          {busy ? 'Отправка…' : 'Опубликовать'}
        </button>
      </div>
    </div>
  );
}

function ThreadCard({
  thread,
  country,
  me,
  onChange,
}: {
  thread: CommunityThread;
  country: string;
  me: AuthUser | null;
  onChange: () => void;
}) {
  const [replying, setReplying] = useState(false);

  return (
    <article className="rounded-2xl border border-ink-line bg-ink-soft/40 p-5">
      <MessageRow msg={thread} me={me} onChange={onChange} />

      {thread.replies.length > 0 && (
        <div className="mt-4 space-y-3 border-l-2 border-ink-line pl-4">
          {thread.replies.map((r) => (
            <MessageRow key={r.id} msg={r} me={me} onChange={onChange} compact />
          ))}
        </div>
      )}

      {me && (
        <div className="mt-4">
          {replying ? (
            <ReplyBox
              country={country}
              parentId={thread.id}
              onDone={() => {
                setReplying(false);
                onChange();
              }}
              onCancel={() => setReplying(false)}
            />
          ) : (
            <button
              onClick={() => setReplying(true)}
              className="text-sm text-paper-dim hover:text-aurora"
            >
              Ответить
            </button>
          )}
        </div>
      )}
    </article>
  );
}

function MessageRow({
  msg,
  me,
  onChange,
  compact = false,
}: {
  msg: CommunityMessage;
  me: AuthUser | null;
  onChange: () => void;
  compact?: boolean;
}) {
  const canDelete = !!me && (msg.user.id === me.id || me.role === 'ADMIN' || me.role === 'SUPER_ADMIN');
  return (
    <div className="flex gap-3">
      <Avatar user={msg.user} size={compact ? 32 : 40} link />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-paper">{msg.user.name || msg.user.email}</span>
          <span className="text-xs text-paper-faint">{fmt(msg.createdAt)}</span>
          {canDelete && (
            <button
              onClick={() => community.remove(msg.id).then(onChange)}
              className="ml-auto text-xs text-paper-faint hover:text-red-300"
            >
              Удалить
            </button>
          )}
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words text-paper">{msg.text}</p>
      </div>
    </div>
  );
}

function ReplyBox({
  country,
  parentId,
  onDone,
  onCancel,
}: {
  country: string;
  parentId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => ref.current?.focus(), []);

  async function send() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await community.post(country, text.trim(), parentId);
      setText('');
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-ink-line bg-ink p-3">
      <textarea
        ref={ref}
        className="min-h-[60px] w-full rounded-lg border border-ink-line bg-ink-soft/40 px-3 py-2 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60"
        placeholder="Ваш ответ…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full px-4 py-1.5 text-sm text-paper-faint hover:text-paper">
          Отмена
        </button>
        <button
          disabled={busy || !text.trim()}
          onClick={send}
          className="rounded-full bg-aurora px-4 py-1.5 text-sm font-medium text-aurora-fg disabled:opacity-50"
        >
          {busy ? 'Отправка…' : 'Ответить'}
        </button>
      </div>
    </div>
  );
}
