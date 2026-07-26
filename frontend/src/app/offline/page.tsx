import Link from 'next/link';
import type { Metadata } from 'next';

/**
 * Заглушка на случай отсутствия сети: её отдаёт service worker, когда страница
 * не открыта из кэша. Сохранённые маршруты при этом продолжают открываться.
 */

export const metadata: Metadata = {
  title: 'Нет соединения — Vela',
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <main className="container-vela flex min-h-screen flex-col items-center justify-center py-20 text-center">
      <p className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
        <span className="h-px w-8 bg-aurora/60" />
        Офлайн
      </p>
      <h1 className="mt-5 font-serif display-2 tracking-tightest">Связи нет</h1>
      <p className="mt-5 max-w-md text-paper-dim">
        Эта страница не сохранена на устройстве. Маршруты, которые вы сохранили кнопкой
        «Офлайн», открываются и без интернета — попробуйте вернуться назад.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full border border-ink-line px-5 py-2.5 text-sm text-paper-dim transition-colors hover:text-paper"
        >
          На главную
        </Link>
      </div>
    </main>
  );
}
