'use client';

/**
 * Панель управления печатным документом маршрута.
 *
 * PDF получается штатным «Печать → Сохранить как PDF»: браузер сам делает
 * вектор с живыми ссылками и работает офлайн. Никаких сторонних библиотек и
 * серверного рендеринга — документ всегда совпадает с тем, что видно на экране.
 *
 * Также ставит на <body> атрибут data-print: layout-обвязка (виджеты, навигация,
 * зерно) прячется, остаётся чистый документ (см. globals.css).
 */

import { useEffect } from 'react';
import Link from 'next/link';

export function PrintControls({ slug, title }: { slug: string; title: string }) {
  useEffect(() => {
    document.body.setAttribute('data-print', '');
    return () => document.body.removeAttribute('data-print');
  }, []);

  useEffect(() => {
    // Осмысленное имя файла в диалоге сохранения PDF.
    const prev = document.title;
    document.title = `Vela — ${title}`;
    return () => {
      document.title = prev;
    };
  }, [title]);

  return (
    <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink-line bg-ink-soft/50 px-5 py-4">
      <div className="text-sm text-paper-dim">
        Документ готов к печати. Чтобы получить PDF, выберите в диалоге печати
        «Сохранить как PDF».
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={`/trips/${slug}`}
          className="rounded-full border border-ink-line px-4 py-2 text-sm text-paper-dim transition-colors hover:text-paper"
        >
          ← К маршруту
        </Link>
        <button
          onClick={() => window.print()}
          className="glow-gold rounded-full bg-aurora px-5 py-2 text-sm font-medium text-aurora-fg transition-transform hover:-translate-y-0.5"
        >
          Скачать PDF
        </button>
      </div>
    </div>
  );
}
