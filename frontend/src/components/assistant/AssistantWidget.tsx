'use client';

/**
 * ИИ-консьерж Vela (Groq) — премиум-виджет.
 *
 * Дизайн: стеклянная панель с золотой каймой в фирменном стиле, пульсирующая
 * «искра»-аватар, плавные появления сообщений (framer-motion), типинг-индикатор,
 * ответ «печатается» по буквам, режим «на весь экран».
 *
 * Информативность: подсказки зависят от страницы (на маршруте — вопросы про
 * поездку, в сообществе — про визы), лёгкое форматирование ответов
 * (**жирный**, списки) без сторонних markdown-библиотек.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { getToken } from '@/lib/auth';
import { Spark, Typewriter, renderRich, suggestionsFor } from './parts';
import { assistant, type AssistantMessage } from '@/lib/assistant';

const EASE = [0.22, 1, 0.36, 1] as const;

export function AssistantWidget() {
  const path = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  // Индекс последнего ответа, который ещё «печатается».
  const [typingIdx, setTypingIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const suggestions = useMemo(() => suggestionsFor(path), [path]);
  // Знакомство (/welcome) и игровой мир (/vela) — без посторонних элементов.
  const hidden = path === '/welcome' || path === '/vela';

  useEffect(() => {
    setLoggedIn(!!getToken());
    const openIt = () => setOpen(true);
    window.addEventListener('vela:open-assistant', openIt);
    return () => window.removeEventListener('vela:open-assistant', openIt);
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open, busy, typingIdx]);

  async function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const r = await assistant.chat(next);
      setMessages((m) => {
        setTypingIdx(m.length); // новый ответ печатается по буквам
        return [...m, { role: 'assistant', content: r.reply }];
      });
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  if (hidden) return null;

  return (
    <>
      {/* Кнопка-лончер: искра + подпись при наведении */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: EASE }}
            onClick={() => setOpen(true)}
            aria-label="ИИ-консьерж"
            className="glow-gold group fixed bottom-6 left-4 z-[8500] hidden h-14 items-center gap-0 rounded-full border border-aurora/50 bg-[#171310]/90 pl-2.5 pr-2.5 text-aurora shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-500 hover:pr-5 md:flex"
          >
            <Spark size={36} />
            <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium text-white/90 transition-all duration-500 group-hover:ml-2.5 group-hover:max-w-[130px]">
              Спросить ИИ
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Панель консьержа */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.35, ease: EASE }}
            className={`fixed z-[8500] flex flex-col overflow-hidden rounded-3xl border border-aurora/25 bg-[#14100c]/95 text-white shadow-[0_30px_90px_rgba(0,0,0,0.6)] backdrop-blur-xl ${
              wide
                ? 'inset-4 md:inset-x-auto md:left-1/2 md:w-[min(94vw,720px)] md:-translate-x-1/2'
                : 'bottom-5 left-4 h-[70vh] max-h-[600px] w-[min(92vw,400px)] md:bottom-6'
            }`}
          >
            {/* Шапка */}
            <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3.5">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-aurora/10 to-transparent" />
              <div className="relative flex items-center gap-3">
                <Spark thinking={busy} />
                <div>
                  <div className="font-serif text-base tracking-tightest">Консьерж Vela</div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                    {busy ? 'печатает…' : 'маршруты · визы · документы'}
                  </div>
                </div>
              </div>
              <div className="relative flex items-center gap-1">
                {/* Переход в полноценный раздел: там диалоги сохраняются в аккаунте */}
                <Link
                  href="/assistant"
                  onClick={() => setOpen(false)}
                  title="Открыть раздел с историей диалогов"
                  className="rounded-lg px-2 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/50 transition-colors hover:text-aurora"
                >
                  История
                </Link>
                <button
                  onClick={() => setWide((w) => !w)}
                  aria-label={wide ? 'Свернуть' : 'На весь экран'}
                  className="hidden rounded-lg p-2 text-white/50 transition-colors hover:text-white md:block"
                >
                  {wide ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                  )}
                </button>
                <button onClick={() => setOpen(false)} aria-label="Закрыть" className="rounded-lg p-2 text-white/50 transition-colors hover:text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Лента сообщений */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {!loggedIn ? (
                <p className="text-sm text-white/70">
                  Чтобы задать вопрос консьержу,{' '}
                  <Link href="/login" className="text-aurora hover:underline">войдите</Link>.
                </p>
              ) : messages.length === 0 ? (
                <div className="text-sm text-white/70">
                  <p className="leading-relaxed">
                    Здравствуйте! Я помогу с маршрутом, визами и сборами. С чего начнём?
                  </p>
                  <div className="mt-4 space-y-2">
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={s}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.08 * i, duration: 0.35, ease: EASE }}
                        onClick={() => send(s)}
                        className="block w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-left text-white/75 transition-colors hover:border-aurora/40 hover:bg-aurora/5 hover:text-white"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE }}
                    className={m.role === 'user' ? 'flex justify-end' : 'flex items-start gap-2.5'}
                  >
                    {m.role === 'assistant' && <Spark size={26} />}
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap break-words text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'rounded-2xl rounded-br-md bg-aurora px-4 py-2.5 text-aurora-fg'
                          : 'rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-2.5 text-white/90'
                      }`}
                    >
                      {m.role === 'assistant' ? (
                        i === typingIdx ? (
                          <Typewriter text={m.content} onDone={() => setTypingIdx(null)} />
                        ) : (
                          renderRich(m.content)
                        )
                      ) : (
                        m.content
                      )}
                    </div>
                  </motion.div>
                ))
              )}

              {/* Типинг-индикатор */}
              {busy && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2.5">
                  <Spark size={26} thinking />
                  <div className="flex gap-1.5 rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-4 py-3">
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
              <div ref={bottomRef} />
            </div>

            {/* Ввод */}
            {loggedIn && (
              <div className="border-t border-white/10 p-3">
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
                    className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus:border-aurora/50"
                  />
                  <button
                    onClick={() => send()}
                    disabled={busy || !input.trim()}
                    aria-label="Отправить"
                    className="glow-gold grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-aurora text-aurora-fg transition-transform hover:-translate-y-0.5 disabled:opacity-40"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                  </button>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-white/35">
                  Ответы ИИ могут содержать неточности — визовые правила проверяйте на официальных источниках.
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
