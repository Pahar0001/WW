'use client';

import { useEffect, useRef, useState } from 'react';
import { auth, type AuthUser } from '@/lib/auth';
import { support, type SupportMessage } from '@/lib/support';

/**
 * Floating support chat — lets any logged-in user reach the super admins.
 * Hidden for guests and for super admins themselves (they reply from /admin/support).
 */
export function SupportWidget() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const lastRef = useRef('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    auth.me().then((u) => setMe(u));
  }, []);

  // Poll the user's own thread while the panel is open.
  useEffect(() => {
    if (!open || !me || me.role === 'SUPER_ADMIN') return;
    let stop = false;
    const tick = async () => {
      try {
        const batch = await support.myThread(lastRef.current || undefined);
        if (!stop && batch.length) {
          lastRef.current = batch[batch.length - 1].createdAt;
          setMessages((m) => [...m, ...batch]);
        }
      } catch { /* ignore */ }
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => { stop = true; clearInterval(id); };
  }, [open, me]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, open]);

  if (!me || me.role === 'SUPER_ADMIN') return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const msg = await support.post(text.trim());
      lastRef.current = msg.createdAt;
      setMessages((m) => [...m, msg]);
      setText('');
    } finally { setSending(false); }
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        data-cursor="hover"
        aria-label="Поддержка"
        className="fixed bottom-20 right-5 z-[9000] flex h-14 w-14 items-center justify-center rounded-full bg-aurora text-aurora-fg shadow-lg transition-transform hover:scale-105 md:bottom-5"
      >
        {open ? '✕' : (
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden>
            <path d="M4 5h16v11H7l-3 3V5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {open && (
        <div className="fixed bottom-40 right-5 z-[9000] flex h-[60vh] max-h-[520px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl border border-ink-line bg-ink shadow-2xl md:bottom-24">
          <div className="border-b border-ink-line p-4">
            <div className="font-serif text-lg tracking-tightest text-paper">Поддержка Vela</div>
            <div className="text-xs text-paper-faint">Напишите нам — ответит администратор.</div>
          </div>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && <p className="text-sm text-paper-faint">Чем можем помочь? Опишите вопрос 👋</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.fromSupport ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm ${m.fromSupport ? 'border border-ink-line bg-ink-soft/60 text-paper' : 'bg-aurora/15 text-paper'}`}>
                  <div className="text-[10px] uppercase tracking-wider text-paper-faint">{m.fromSupport ? 'Поддержка' : 'Вы'} · {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="mt-0.5 whitespace-pre-wrap">{m.text}</div>
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-ink-line p-3">
            <input
              className="flex-1 rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60"
              placeholder="Сообщение…" value={text} onChange={(e) => setText(e.target.value)}
            />
            <button disabled={sending || !text.trim()} className="rounded-full bg-aurora px-4 py-2 text-sm font-medium text-aurora-fg disabled:opacity-50">→</button>
          </form>
        </div>
      )}
    </>
  );
}
