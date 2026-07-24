'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { auth, logout, type AuthUser } from '@/lib/auth';
import { support, type SupportThread, type SupportMessage } from '@/lib/support';

export default function AdminSupportPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  useEffect(() => {
    auth.me().then((u) => {
      if (!u || u.role !== 'SUPER_ADMIN') { window.location.href = '/login'; return; }
      setMe(u);
    });
  }, []);

  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [active, setActive] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadThreads = () => support.threads().then(setThreads).catch(() => {});
  useEffect(() => { if (me) loadThreads(); /* eslint-disable-next-line */ }, [me]);

  // Poll the selected thread.
  useEffect(() => {
    if (!active) return;
    let stop = false;
    const tick = () => support.threadMessages(active.user.id).then((m) => { if (!stop) setMessages(m); }).catch(() => {});
    tick();
    const id = setInterval(tick, 5000);
    return () => { stop = true; clearInterval(id); };
  }, [active]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  async function reply(e: React.FormEvent) {
    e.preventDefault();
    if (!active || !text.trim()) return;
    setSending(true);
    try {
      const msg = await support.reply(active.user.id, text.trim());
      setMessages((m) => [...m, msg]);
      setText('');
      loadThreads();
    } finally { setSending(false); }
  }

  if (me === undefined) {
    return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Проверка доступа…</main>;
  }

  return (
    <main className="container-vela min-h-screen py-10">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/" data-magnetic className="font-serif text-xl tracking-tightest">Vela</Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/admin" className="text-paper-dim hover:text-paper">Поездки</Link>
          <Link href="/admin/users" className="text-paper-dim hover:text-paper">Пользователи</Link>
          <span className="text-paper-faint">{me?.email}</span>
          <button onClick={() => logout()} className="rounded-full border border-ink-line px-3 py-1 text-paper-dim hover:text-paper">Выйти</button>
        </div>
      </header>

      <p className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
        <span className="h-px w-8 bg-aurora/60" />
        Админка
      </p>
      <h1 className="font-serif display-2">Чат поддержки</h1>
      <p className="mt-3 text-lg text-paper-dim">Обращения пользователей. Выберите диалог и ответьте.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[320px_1fr]">
        {/* Threads list */}
        <div className="space-y-2">
          {threads.length === 0 && <p className="text-paper-faint">Обращений пока нет.</p>}
          {threads.map((t) => (
            <button
              key={t.user.id}
              onClick={() => { setActive(t); setMessages([]); }}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${active?.user.id === t.user.id ? 'border-aurora/60 bg-aurora/5' : 'border-ink-line hover:border-aurora/30'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-paper">{t.user.name || t.user.email}</span>
                <span className="text-xs text-paper-faint">{t.lastAt ? new Date(t.lastAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''}</span>
              </div>
              <div className="mt-1 truncate text-sm text-paper-dim">{t.fromSupport ? 'Вы: ' : ''}{t.lastText}</div>
            </button>
          ))}
        </div>

        {/* Conversation */}
        <div className="flex h-[64vh] flex-col rounded-2xl border border-ink-line bg-ink-soft/40">
          {!active ? (
            <div className="flex flex-1 items-center justify-center text-paper-faint">Выберите обращение слева</div>
          ) : (
            <>
              <div className="border-b border-ink-line p-4">
                <div className="text-paper">{active.user.name || active.user.email}</div>
                <div className="text-xs text-paper-faint">{active.user.email}</div>
              </div>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.fromSupport ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${m.fromSupport ? 'bg-aurora/15 text-paper' : 'border border-ink-line bg-ink text-paper'}`}>
                      <div className="text-xs text-paper-faint">{m.fromSupport ? 'Поддержка' : (active.user.name || active.user.email)} · {new Date(m.createdAt).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</div>
                      <div className="mt-0.5 whitespace-pre-wrap">{m.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={reply} className="flex gap-2 border-t border-ink-line p-3">
                <input
                  className="flex-1 rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60"
                  placeholder="Ответ…" value={text} onChange={(e) => setText(e.target.value)}
                />
                <button disabled={sending || !text.trim()} className="rounded-full bg-aurora px-5 py-2 text-sm font-medium text-aurora-fg disabled:opacity-50">Отправить</button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
