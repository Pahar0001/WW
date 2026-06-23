'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Minimal toast system — no extra dependency. Call toast.success/error/info
// from anywhere; <Toaster/> (mounted once in layout) renders them.
type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: ToastKind; message: string }

let listeners: ((t: ToastItem) => void)[] = [];
let counter = 0;
function emit(kind: ToastKind, message: string) {
  const item = { id: ++counter, kind, message };
  listeners.forEach((l) => l(item));
}
export const toast = {
  success: (m: string) => emit('success', m),
  error: (m: string) => emit('error', m),
  info: (m: string) => emit('info', m),
};

const ACCENT: Record<ToastKind, string> = {
  success: 'border-aurora/50 text-aurora',
  error: 'border-red-400/50 text-red-400',
  info: 'border-ink-line text-paper',
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    const onToast = (t: ToastItem) => {
      setItems((s) => [...s, t]);
      setTimeout(() => setItems((s) => s.filter((x) => x.id !== t.id)), 4000);
    };
    listeners.push(onToast);
    return () => { listeners = listeners.filter((l) => l !== onToast); };
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[300] flex w-[min(92vw,360px)] flex-col gap-2">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`pointer-events-auto rounded-xl border bg-ink-soft/95 px-4 py-3 text-sm shadow-lg backdrop-blur ${ACCENT[t.kind]}`}
          >
            <span className="text-paper">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
