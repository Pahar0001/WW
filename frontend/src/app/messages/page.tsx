'use client';

/**
 * Мессенджер: личные и групповые чаты.
 *
 * Desktop — две панели (список + переписка), mobile — по очереди (список ⇄ чат).
 * Новые сообщения приходят поллингом: активный чат — каждые 4 с (?after=),
 * список — каждые 12 с. Групповой чат создаётся из друзей; владелец может
 * переименовать группу и добавить участников. Дальше сюда лягут голосовые и
 * кружки — kind у сообщений уже поддерживает VOICE/VIDEO_NOTE.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { auth, type AuthUser } from '@/lib/auth';
import { network } from '@/lib/network';
import type { SocialUser } from '@/lib/social';
import {
  chat,
  chatPeer,
  chatTitle,
  type ChatFull,
  type ChatMessage,
  type ChatSummary,
} from '@/lib/chat';
import { Avatar } from '@/components/social/Avatar';
import { SocialTabs } from '@/components/social/SocialTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toaster';

const EASE = [0.22, 1, 0.36, 1] as const;

const isOnline = (iso?: string | null) =>
  Boolean(iso && Date.now() - new Date(iso).getTime() < 5 * 60 * 1000);

const timeShort = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
};

export default function MessagesPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  // ?chat=… читаем из location, а не useSearchParams — иначе Next требует
  // Suspense-границу при пререндере клиентской страницы.
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    setActiveId(new URLSearchParams(window.location.search).get('chat'));
    auth.me().then((u) => {
      if (!u) {
        window.location.href = '/login';
        return;
      }
      setMe(u);
    });
  }, []);

  const refreshList = useCallback(() => {
    chat.list().then(setChats).catch(() => setChats((c) => c ?? []));
  }, []);

  useEffect(() => {
    if (!me) return;
    refreshList();
    const id = setInterval(refreshList, 12000);
    return () => clearInterval(id);
  }, [me, refreshList]);

  if (me === undefined || me === null) {
    return (
      <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">
        Загрузка…
      </main>
    );
  }

  return (
    <main className="container-vela min-h-screen py-8 pb-28 md:pb-12">
      <SocialTabs />
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
            <span className="h-px w-8 bg-aurora/60" />
            Сообщения
          </p>
          <h1 className="font-serif display-2">Мессенджер</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="glow-gold shrink-0 rounded-full bg-aurora px-5 py-2.5 text-sm font-medium text-aurora-fg transition-transform hover:-translate-y-0.5"
        >
          + Группа
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-[320px_1fr]">
        {/* Список чатов: на мобиле скрывается, когда открыт чат */}
        <aside className={activeId ? 'hidden md:block' : ''}>
          <ChatList
            meId={me.id}
            chats={chats}
            activeId={activeId}
            onOpen={(id) => setActiveId(id)}
          />
        </aside>

        {/* Активный чат */}
        <section className={activeId ? '' : 'hidden md:block'}>
          {activeId ? (
            <ChatWindow
              key={activeId}
              meId={me.id}
              chatId={activeId}
              onBack={() => {
                setActiveId(null);
                refreshList();
              }}
              onChanged={refreshList}
            />
          ) : (
            <div className="flex min-h-[50vh] items-center justify-center rounded-2xl border border-ink-line bg-ink-soft/30 text-paper-faint">
              Выберите чат или начните новый
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {creating && (
          <NewGroupModal
            onClose={() => setCreating(false)}
            onCreated={(id) => {
              setCreating(false);
              setActiveId(id);
              refreshList();
            }}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

/* ── Список чатов ── */

function ChatList({
  meId,
  chats,
  activeId,
  onOpen,
}: {
  meId: string;
  chats: ChatSummary[] | null;
  activeId: string | null;
  onOpen: (id: string) => void;
}) {
  if (!chats) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    );
  }
  if (chats.length === 0) {
    return (
      <div className="rounded-2xl border border-ink-line bg-ink-soft/30 p-6 text-sm text-paper-dim">
        Пока пусто. Найдите человека в разделе{' '}
        <Link href="/network" className="text-aurora hover:underline">
          Люди
        </Link>{' '}
        и нажмите «Написать» — или соберите группу.
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      {chats.map((c) => {
        const peer = chatPeer(c, meId);
        const last = c.lastMessage;
        return (
          <button
            key={c.id}
            onClick={() => onOpen(c.id)}
            className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
              c.id === activeId
                ? 'border-aurora/50 bg-aurora/10'
                : 'border-ink-line bg-ink-soft/30 hover:border-aurora/30'
            }`}
          >
            <div className="relative shrink-0">
              {c.isGroup ? (
                <span className="grid h-11 w-11 place-items-center rounded-full border border-aurora/40 bg-aurora/10 text-aurora">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11a3 3 0 100-6 3 3 0 000 6zM2 20a7 7 0 0114 0M17 11a3 3 0 100-6M16 20a7 7 0 016-6" /></svg>
                </span>
              ) : (
                <>
                  <Avatar user={peer?.user ?? null} size={44} />
                  {isOnline(peer?.user.lastSeenAt) && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink bg-emerald-400" />
                  )}
                </>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-paper">{chatTitle(c, meId)}</span>
                {last && <span className="shrink-0 text-[11px] text-paper-faint">{timeShort(last.createdAt)}</span>}
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <span className="truncate text-sm text-paper-faint">
                  {last
                    ? `${last.authorId === meId ? 'Вы: ' : c.isGroup && last.author ? `${last.author.name || last.author.email}: ` : ''}${last.text ?? ''}`
                    : 'Нет сообщений'}
                </span>
                {c.unread > 0 && (
                  <span className="inline-grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-aurora px-1.5 text-[11px] font-semibold text-aurora-fg">
                    {c.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Окно переписки ── */

function ChatWindow({
  meId,
  chatId,
  onBack,
  onChanged,
}: {
  meId: string;
  chatId: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const [info, setInfo] = useState<ChatFull | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTs = useRef<string | null>(null);

  // Первая загрузка: шапка + история, отметить прочитанным.
  useEffect(() => {
    let alive = true;
    Promise.all([chat.get(chatId), chat.messages(chatId)])
      .then(([c, msgs]) => {
        if (!alive) return;
        setInfo(c);
        setMessages(msgs);
        lastTs.current = msgs[msgs.length - 1]?.createdAt ?? new Date(0).toISOString();
        chat.markRead(chatId).catch(() => {});
      })
      .catch((e) => toast.error((e as Error).message));
    return () => {
      alive = false;
    };
  }, [chatId]);

  // Поллинг новых сообщений.
  useEffect(() => {
    const id = setInterval(async () => {
      if (!lastTs.current) return;
      try {
        const fresh = await chat.messages(chatId, { after: lastTs.current });
        if (fresh.length > 0) {
          setMessages((m) => {
            const known = new Set((m ?? []).map((x) => x.id));
            const add = fresh.filter((x) => !known.has(x.id));
            return add.length ? [...(m ?? []), ...add] : m;
          });
          lastTs.current = fresh[fresh.length - 1].createdAt;
          chat.markRead(chatId).catch(() => {});
        }
      } catch {
        /* сеть мигнула — следующая попытка через интервал */
      }
    }, 4000);
    return () => clearInterval(id);
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages?.length]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput('');
    try {
      const msg = await chat.send(chatId, text);
      setMessages((m) => [...(m ?? []), msg]);
      lastTs.current = msg.createdAt;
      onChanged();
    } catch (e) {
      setInput(text);
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function loadOlder() {
    if (!messages || messages.length === 0) return;
    try {
      const older = await chat.messages(chatId, { before: messages[0].createdAt });
      if (older.length) setMessages((m) => [...older, ...(m ?? [])]);
    } catch {
      /* ignore */
    }
  }

  const title = info ? chatTitle(info, meId) : '…';
  const peer = info ? chatPeer(info, meId) : null;
  const isOwner = info?.members.some((m) => m.userId === meId && m.role === 'OWNER');

  return (
    <div className="flex h-[72vh] flex-col overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/30">
      {/* Шапка чата */}
      <div className="flex items-center gap-3 border-b border-ink-line px-4 py-3">
        <button onClick={onBack} aria-label="Назад" className="rounded-lg p-1.5 text-paper-dim hover:text-paper md:hidden">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
        </button>
        {info && !info.isGroup ? (
          <Link href={peer ? `/u/${peer.userId}` : '#'} className="flex min-w-0 items-center gap-3">
            <Avatar user={peer?.user ?? null} size={38} />
            <div className="min-w-0">
              <div className="truncate text-paper">{title}</div>
              <div className="text-[11px] text-paper-faint">
                {isOnline(peer?.user.lastSeenAt) ? 'онлайн' : 'не в сети'}
              </div>
            </div>
          </Link>
        ) : (
          <button onClick={() => setShowMembers((v) => !v)} className="flex min-w-0 items-center gap-3 text-left">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-aurora/40 bg-aurora/10 text-aurora">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11a3 3 0 100-6 3 3 0 000 6zM2 20a7 7 0 0114 0M17 11a3 3 0 100-6M16 20a7 7 0 016-6" /></svg>
            </span>
            <div className="min-w-0">
              <div className="truncate text-paper">{title}</div>
              <div className="text-[11px] text-paper-faint">
                {info ? `${info.members.length} участников · подробнее` : ''}
              </div>
            </div>
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          {info?.isGroup && isOwner && (
            <button
              onClick={async () => {
                const t = prompt('Название группы', info.title ?? '');
                if (t == null) return;
                try {
                  const r = await chat.rename(chatId, t);
                  setInfo((i) => (i ? { ...i, title: r.title } : i));
                  onChanged();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              aria-label="Переименовать"
              className="rounded-lg p-2 text-paper-faint hover:text-aurora"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
            </button>
          )}
          <button
            onClick={async () => {
              if (!confirm('Выйти из чата?')) return;
              try {
                await chat.leave(chatId);
                onBack();
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
            aria-label="Выйти из чата"
            className="rounded-lg p-2 text-paper-faint hover:text-red-400"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          </button>
        </div>
      </div>

      {/* Участники группы */}
      <AnimatePresence>
        {showMembers && info?.isGroup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden border-b border-ink-line"
          >
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              {info.members.map((m) => (
                <Link
                  key={m.userId}
                  href={`/u/${m.userId}`}
                  className="flex items-center gap-2 rounded-full border border-ink-line px-2.5 py-1 text-sm text-paper-dim hover:border-aurora/40 hover:text-paper"
                >
                  <Avatar user={m.user} size={20} />
                  <span className="max-w-[140px] truncate">{m.user.name || m.user.email}</span>
                  {m.role === 'OWNER' && <span className="text-[10px] uppercase text-aurora">влад.</span>}
                </Link>
              ))}
              {isOwner && <AddMemberButton chatId={chatId} members={info.members.map((m) => m.userId)} onAdded={() => chat.get(chatId).then(setInfo)} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Сообщения */}
      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
        {messages === null ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-1/2 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-2/5 rounded-2xl" />
            <Skeleton className="h-14 w-3/5 rounded-2xl" />
          </div>
        ) : (
          <>
            {messages.length >= 50 && (
              <button onClick={loadOlder} className="mx-auto block rounded-full border border-ink-line px-4 py-1.5 text-xs text-paper-faint hover:text-paper">
                Показать более ранние
              </button>
            )}
            {messages.map((m, i) => {
              const mine = m.authorId === meId;
              const prev = messages[i - 1];
              const showAuthor = Boolean(info?.isGroup) && !mine && (!prev || prev.authorId !== m.authorId);
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: EASE }}
                  className={mine ? 'flex justify-end' : 'flex items-end gap-2'}
                >
                  {!mine && info?.isGroup && (
                    <span className="w-6 shrink-0">
                      {showAuthor || !prev || prev.authorId !== m.authorId ? (
                        <Avatar user={m.author} size={24} />
                      ) : null}
                    </span>
                  )}
                  <div className={`max-w-[78%] ${mine ? '' : ''}`}>
                    {showAuthor && (
                      <div className="mb-0.5 pl-1 text-[11px] text-aurora/90">
                        {m.author?.name || m.author?.email}
                      </div>
                    )}
                    <div
                      className={`whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-[15px] leading-relaxed ${
                        mine
                          ? 'rounded-br-md bg-aurora text-aurora-fg'
                          : 'rounded-bl-md border border-ink-line bg-ink text-paper'
                      }`}
                    >
                      {m.text}
                      <span className={`ml-2 align-baseline text-[10px] ${mine ? 'text-aurora-fg/60' : 'text-paper-faint'}`}>
                        {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Ввод */}
      <div className="border-t border-ink-line p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Сообщение…"
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-ink-line bg-ink px-3.5 py-2.5 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            aria-label="Отправить"
            className="glow-gold grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-aurora text-aurora-fg transition-transform hover:-translate-y-0.5 disabled:opacity-40"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Добавление участника ── */

function AddMemberButton({
  chatId,
  members,
  onAdded,
}: {
  chatId: string;
  members: string[];
  onAdded: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState<SocialUser[] | null>(null);

  useEffect(() => {
    if (open && friends === null) {
      network.friends().then((f) => setFriends(f.friends)).catch(() => setFriends([]));
    }
  }, [open, friends]);

  const candidates = useMemo(
    () => (friends ?? []).filter((f) => !members.includes(f.id)),
    [friends, members],
  );

  return (
    <span className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-dashed border-aurora/50 px-2.5 py-1 text-sm text-aurora hover:bg-aurora/10"
      >
        + Добавить
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="absolute left-0 top-full z-20 mt-2 max-h-56 w-64 overflow-y-auto rounded-xl border border-ink-line bg-ink p-2 shadow-soft-lg"
          >
            {friends === null ? (
              <div className="p-3 text-sm text-paper-faint">Загрузка…</div>
            ) : candidates.length === 0 ? (
              <div className="p-3 text-sm text-paper-faint">Все друзья уже в чате.</div>
            ) : (
              candidates.map((f) => (
                <button
                  key={f.id}
                  onClick={async () => {
                    try {
                      await chat.addMember(chatId, f.id);
                      setOpen(false);
                      onAdded();
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-paper-dim hover:bg-ink-soft hover:text-paper"
                >
                  <Avatar user={f} size={24} />
                  <span className="truncate">{f.name || f.email}</span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

/* ── Модалка создания группы ── */

function NewGroupModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [friends, setFriends] = useState<SocialUser[] | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    network.friends().then((f) => setFriends(f.friends)).catch(() => setFriends([]));
  }, []);

  function toggle(id: string) {
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function create() {
    if (busy) return;
    setBusy(true);
    try {
      const r = await chat.createGroup(title, Array.from(picked));
      onCreated(r.id);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.3, ease: EASE }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-ink-line bg-ink p-6 shadow-soft-lg"
      >
        <h2 className="font-serif text-2xl tracking-tightest">Новая группа</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название группы"
          className="mt-4 w-full rounded-xl border border-ink-line bg-ink-soft/40 px-4 py-3 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60"
        />
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-paper-faint">Участники (из друзей)</p>
        <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
          {friends === null ? (
            <div className="py-3 text-sm text-paper-faint">Загрузка…</div>
          ) : friends.length === 0 ? (
            <div className="py-3 text-sm text-paper-faint">
              Сначала добавьте друзей в разделе{' '}
              <Link href="/network" className="text-aurora hover:underline">
                Люди
              </Link>
              .
            </div>
          ) : (
            friends.map((f) => (
              <label
                key={f.id}
                className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-ink-soft"
              >
                <input
                  type="checkbox"
                  checked={picked.has(f.id)}
                  onChange={() => toggle(f.id)}
                  className="h-4 w-4 accent-[hsl(39,44%,47%)]"
                />
                <Avatar user={f} size={28} />
                <span className="truncate text-sm text-paper">{f.name || f.email}</span>
              </label>
            ))
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-paper-dim hover:text-paper">
            Отмена
          </button>
          <button
            onClick={create}
            disabled={busy || !title.trim() || picked.size === 0}
            className="glow-gold rounded-full bg-aurora px-5 py-2 text-sm font-medium text-aurora-fg disabled:opacity-40"
          >
            Создать
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
