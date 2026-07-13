'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/auth';
import { assistant, type AssistantMessage } from '@/lib/assistant';

/**
 * Floating AI travel consultant (Groq-backed). Bottom-left so it doesn't collide
 * with the support widget. Opens on its own button or the `vela:open-assistant`
 * event dispatched from the home-page menu.
 */
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoggedIn(!!getToken());
    const openIt = () => setOpen(true);
    window.addEventListener('vela:open-assistant', openIt);
    return () => window.removeEventListener('vela:open-assistant', openIt);
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    try {
      const r = await assistant.chat(next);
      setMessages((m) => [...m, { role: 'assistant', content: r.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="ИИ-консультант"
          className="fixed bottom-20 left-4 z-[8500] flex h-14 w-14 items-center justify-center rounded-full border border-aurora/40 bg-aurora text-aurora-fg shadow-xl transition-transform hover:scale-105 md:bottom-6"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a7 7 0 017 7c0 3-2 5-2 7H7c0-2-2-4-2-7a7 7 0 017-7zM9 21h6M10 10h.01M14 10h.01" />
          </svg>
        </button>
      )}

      {open && (
        <div className="fixed bottom-20 left-4 z-[8500] flex h-[70vh] max-h-[560px] w-[min(92vw,380px)] flex-col overflow-hidden rounded-2xl border border-ink-line bg-ink-soft shadow-2xl md:bottom-6">
          <div className="flex items-center justify-between border-b border-ink-line px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-aurora/15 text-aurora">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a7 7 0 017 7c0 3-2 5-2 7H7c0-2-2-4-2-7a7 7 0 017-7zM9 21h6" /></svg>
              </span>
              <div>
                <div className="text-sm text-paper">ИИ-консультант</div>
                <div className="text-[11px] text-paper-faint">Маршруты, визы, документы</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Закрыть" className="text-paper-faint hover:text-paper">✕</button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {!loggedIn ? (
              <p className="text-sm text-paper-dim">
                Чтобы задать вопрос ассистенту,{' '}
                <Link href="/login" className="text-aurora hover:underline">войдите</Link>.
              </p>
            ) : messages.length === 0 ? (
              <div className="text-sm text-paper-dim">
                <p>Привет! Спросите про маршрут, визу или документы. Например:</p>
                <div className="mt-3 space-y-2">
                  {[
                    'Какие документы нужны для визы в Грузию?',
                    'Составь план на 5 дней по Стамбулу',
                    'Что взять в поездку на Бали в сезон дождей?',
                  ].map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="block w-full rounded-lg border border-ink-line px-3 py-2 text-left text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm ${
                      m.role === 'user' ? 'bg-aurora text-aurora-fg' : 'border border-ink-line bg-ink text-paper'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {busy && <div className="text-sm text-paper-faint">Думаю…</div>}
            <div ref={bottomRef} />
          </div>

          {loggedIn && (
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
                  placeholder="Ваш вопрос…"
                  className="max-h-28 min-h-[40px] flex-1 resize-none rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60"
                />
                <button
                  onClick={send}
                  disabled={busy || !input.trim()}
                  className="rounded-lg bg-aurora px-4 py-2 text-sm font-medium text-aurora-fg disabled:opacity-50"
                >
                  →
                </button>
              </div>
              <p className="mt-2 text-[11px] text-paper-faint">
                Ответы ИИ могут содержать неточности — проверяйте визовые правила на официальных источниках.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
