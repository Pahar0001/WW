'use client';

/**
 * Раздел ИИ-консьержа с историей диалогов.
 *
 * Отличие от плавающего виджета: здесь переписка хранится в аккаунте (БД), так
 * что диалог можно продолжить с другого устройства. Слева — список диалогов
 * (переименование, удаление), справа — лента сообщений и поле ввода.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { auth, type AuthUser } from '@/lib/auth';
import { assistant, type StoredMessage, type ThreadSummary } from '@/lib/assistant';
import { Spark, Typewriter, renderRich, suggestionsFor } from '@/components/assistant/parts';
import { Skeleton } from '@/components/ui/Skeleton';

const EASE = [0.22, 1, 0.36, 1] as const;

const STARTERS = suggestionsFor('/');

export default function AssistantPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<StoredMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [typingId, setTypingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false); // мобильная шторка со списком
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    auth
      .me()
      .then((u) => {
        setMe(u);
        if (u) assistant.threads().then(setThreads).catch(() => setThreads([]));
      })
      .catch(() => setMe(null));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const openThread = useCallback(async (id: string) => {
    setActiveId(id);
    setListOpen(false);
    setLoadingThread(true);
    setError(null);
    try {
      const t = await assistant.thread(id);
      setMessages(t.messages);
    } catch (e) {
      setError((e as Error).message);
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  }, []);

  function startNew() {
    setActiveId(null);
    setMessages([]);
    setError(null);
    setListOpen(false);
  }

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setInput('');

    // Оптимистично показываем свою реплику — ожидание ответа не выглядит зависанием.
    const optimistic: StoredMessage = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);

    try {
      let id = activeId;
      if (!id) {
        const t = await assistant.createThread();
        id = t.id;
        setActiveId(t.id);
        setThreads((list) => [t, ...(list ?? [])]);
      }
      const r = await assistant.send(id, text);
      setMessages((m) => [...m.filter((x) => x.id !== optimistic.id), r.userMessage, r.message]);
      setTypingId(r.message.id);
      // Диалог поднимается наверх списка, а его название — первый вопрос.
      setThreads((list) => {
        const rest = (list ?? []).filter((t) => t.id !== r.thread.id);
        const prev = (list ?? []).find((t) => t.id === r.thread.id);
        return [
          {
            ...r.thread,
            createdAt: prev?.createdAt ?? r.thread.updatedAt,
            _count: { messages: (prev?._count?.messages ?? 0) + 2 },
          },
          ...rest,
        ];
      });
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
      setInput(text);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm('Удалить диалог? Историю восстановить нельзя.')) return;
    try {
      await assistant.deleteThread(id);
      setThreads((l) => (l ?? []).filter((t) => t.id !== id));
      if (activeId === id) startNew();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function rename(t: ThreadSummary) {
    const title = prompt('Название диалога', t.title);
    if (title == null) return;
    try {
      const updated = await assistant.renameThread(t.id, title.trim() || t.title);
      setThreads((l) => (l ?? []).map((x) => (x.id === t.id ? { ...x, title: updated.title } : x)));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (me === undefined) {
    return (
      <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">
        Загрузка…
      </main>
    );
  }

  if (me === null) {
    return (
      <main className="container-vela flex min-h-screen flex-col items-center justify-center gap-5 text-center">
        <Spark size={54} />
        <h1 className="font-serif display-2">Консьерж Vela</h1>
        <p className="max-w-md text-paper-dim">
          Маршруты, визы, документы и сборы — с сохранением истории диалогов в вашем аккаунте.
        </p>
        <Link
          href="/login"
          className="glow-gold rounded-full bg-aurora px-6 py-3 text-sm font-medium text-aurora-fg"
        >
          Войти
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-28">
      <header className="container-vela flex items-center justify-between py-7">
        <Link href="/" data-magnetic className="font-serif text-xl tracking-tightest">
          Vela
        </Link>
        <Link href="/" data-cursor="hover" className="text-sm text-paper-dim hover:text-paper">
          ← На главную
        </Link>
      </header>

      <section className="container-vela">
        <p className="flex items-center gap-3 text-sm uppercase tracking-[0.28em] text-paper-faint">
          <span className="h-px w-8 bg-aurora/60" />
          ИИ-консьерж
        </p>
        <h1 className="mt-4 font-serif display-2 tracking-tightest">Спросите о путешествии</h1>
        <p className="mt-4 max-w-2xl text-paper-dim">
          Помогу с маршрутом, визами, документами и сборами. Диалоги сохраняются — можно вернуться
          к разговору позже.
        </p>
      </section>

      <section className="container-vela mt-10 grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* ── Список диалогов ── */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center gap-2">
            <button
              onClick={startNew}
              className="glow-gold flex-1 rounded-xl bg-aurora px-4 py-2.5 text-sm font-medium text-aurora-fg transition-transform hover:-translate-y-0.5"
            >
              + Новый диалог
            </button>
            <button
              onClick={() => setListOpen((v) => !v)}
              className="rounded-xl border border-ink-line px-3 py-2.5 text-sm text-paper-dim lg:hidden"
            >
              {listOpen ? 'Скрыть' : 'История'}
            </button>
          </div>

          <div className={`mt-3 space-y-1.5 ${listOpen ? '' : 'hidden lg:block'}`}>
            {threads === null ? (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-xl" />
                ))}
              </div>
            ) : threads.length === 0 ? (
              <p className="px-1 py-3 text-sm text-paper-faint">
                Пока нет сохранённых диалогов. Задайте первый вопрос — он появится здесь.
              </p>
            ) : (
              threads.map((t) => (
                <div
                  key={t.id}
                  className={`group flex items-center gap-1 rounded-xl border px-3 py-2.5 transition-colors ${
                    t.id === activeId
                      ? 'border-aurora/50 bg-aurora/10'
                      : 'border-ink-line bg-ink-soft/30 hover:border-aurora/30'
                  }`}
                >
                  <button
                    onClick={() => openThread(t.id)}
                    className="min-w-0 flex-1 text-left"
                    title={t.title}
                  >
                    <span className="block truncate text-sm text-paper">{t.title}</span>
                    <span className="block text-[11px] text-paper-faint">
                      {formatDate(t.updatedAt)}
                      {t._count ? ` · ${t._count.messages} реплик` : ''}
                    </span>
                  </button>
                  <button
                    onClick={() => rename(t)}
                    aria-label="Переименовать"
                    className="rounded-lg p-1.5 text-paper-faint opacity-0 transition-opacity hover:text-aurora focus:opacity-100 group-hover:opacity-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
                  </button>
                  <button
                    onClick={() => remove(t.id)}
                    aria-label="Удалить"
                    className="rounded-lg p-1.5 text-paper-faint opacity-0 transition-opacity hover:text-red-400 focus:opacity-100 group-hover:opacity-100"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" /></svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* ── Лента диалога ── */}
        <div className="flex min-h-[60vh] flex-col rounded-2xl border border-ink-line bg-ink-soft/30">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 sm:p-7">
            {loadingThread ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-2/3 rounded-2xl" />
                <Skeleton className="ml-auto h-12 w-1/2 rounded-2xl" />
                <Skeleton className="h-24 w-3/4 rounded-2xl" />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-6">
                <div className="flex items-center gap-3">
                  <Spark size={40} />
                  <div>
                    <div className="font-serif text-xl tracking-tightest">Консьерж Vela</div>
                    <div className="text-xs uppercase tracking-[0.18em] text-paper-faint">
                      маршруты · визы · документы
                    </div>
                  </div>
                </div>
                <p className="mt-5 text-paper-dim">С чего начнём?</p>
                <div className="mt-4 grid gap-2 sm:max-w-lg">
                  {STARTERS.map((s, i) => (
                    <motion.button
                      key={s}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.07 * i, duration: 0.35, ease: EASE }}
                      onClick={() => send(s)}
                      className="rounded-xl border border-ink-line bg-ink px-4 py-3 text-left text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className={m.role === 'user' ? 'flex justify-end' : 'flex items-start gap-3'}
                  >
                    {m.role === 'assistant' && <Spark size={28} />}
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap break-words leading-relaxed ${
                        m.role === 'user'
                          ? 'rounded-2xl rounded-br-md bg-aurora px-4 py-2.5 text-aurora-fg'
                          : 'rounded-2xl rounded-tl-md border border-ink-line bg-ink px-4 py-3 text-paper-dim'
                      }`}
                    >
                      {m.role === 'assistant' ? (
                        m.id === typingId ? (
                          <Typewriter text={m.content} onDone={() => setTypingId(null)} />
                        ) : (
                          renderRich(m.content)
                        )
                      ) : (
                        m.content
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            {busy && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                <Spark size={28} thinking />
                <div className="flex gap-1.5 rounded-2xl rounded-tl-md border border-ink-line bg-ink px-4 py-3">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-aurora/80"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {error && (
              <p className="rounded-xl border border-red-400/30 bg-red-500/5 px-4 py-3 text-sm text-red-400">
                {error}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Ввод */}
          <div className="border-t border-ink-line p-4">
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
                placeholder="Спросите о путешествии…"
                className="max-h-40 min-h-[48px] flex-1 resize-none rounded-xl border border-ink-line bg-ink px-4 py-3 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60"
              />
              <button
                onClick={() => send()}
                disabled={busy || !input.trim()}
                aria-label="Отправить"
                className="glow-gold grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-aurora text-aurora-fg transition-transform hover:-translate-y-0.5 disabled:opacity-40"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-paper-faint">
              Ответы ИИ могут содержать неточности — визовые правила проверяйте на официальных
              источниках (посольство, визовый центр, перевозчик).
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
