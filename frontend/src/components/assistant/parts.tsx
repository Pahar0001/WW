'use client';

/**
 * Общие элементы ИИ-консьержа: «искра»-аватар, мини-разметка ответа и печать
 * по буквам. Используются и плавающим виджетом, и полноэкранным разделом
 * /assistant — чтобы у ассистента был один язык в обоих местах.
 */

import { useEffect, useState, type ReactNode } from 'react';

/** Мини-разметка ответа: **жирный**, строки-списки («- », «• », «1. »). */
export function renderRich(text: string): ReactNode {
  const bold = (s: string, keyBase: string): ReactNode[] =>
    s.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? (
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-aurora">
          {part}
        </strong>
      ) : (
        part
      ),
    );
  return text.split('\n').map((line, i) => {
    const m = line.match(/^\s*(?:[-•]|\d+\.)\s+(.*)$/);
    if (m) {
      return (
        <span key={i} className="flex gap-2">
          <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-aurora/80" />
          <span>{bold(m[1], String(i))}</span>
        </span>
      );
    }
    return (
      <span key={i} className="block min-h-[0.5em]">
        {bold(line, String(i))}
      </span>
    );
  });
}

/** «Печать по буквам» для последнего ответа ассистента. */
export function Typewriter({ text, onDone }: { text: string; onDone: () => void }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(text.length);
      onDone();
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i = Math.min(text.length, i + 3); // ~180 зн/с — живо, но читаемо
      setN(i);
      if (i >= text.length) {
        clearInterval(id);
        onDone();
      }
    }, 16);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return <>{renderRich(text.slice(0, n))}</>;
}

/** Пульсирующая «искра» — аватар консьержа. */
export function Spark({ size = 34, thinking = false }: { size?: number; thinking?: boolean }) {
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <span className={`absolute inset-0 rounded-full bg-aurora/25 ${thinking ? 'animate-ping' : ''}`} />
      <span className="relative grid h-full w-full place-items-center rounded-full border border-aurora/50 bg-gradient-to-br from-aurora/30 to-aurora/10 text-aurora">
        <svg
          width={size * 0.5}
          height={size * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
        </svg>
      </span>
    </span>
  );
}

/** Подсказки по контексту страницы — виджет «понимает», где вы находитесь. */
export function suggestionsFor(path: string): string[] {
  if (path.startsWith('/trips/')) {
    return [
      'Что взять с собой в эту поездку?',
      'Какие документы и виза нужны для этого маршрута?',
      'Как лучше передвигаться между городами маршрута?',
    ];
  }
  if (path.startsWith('/community')) {
    return [
      'Какие документы нужны для визы в эту страну?',
      'Что важно знать о въезде и выезде?',
      'Какой сезон лучший для поездки сюда?',
    ];
  }
  if (path.startsWith('/order')) {
    return [
      'Помоги сформулировать пожелание к поездке',
      'Какой бюджет заложить на неделю на море?',
      'Куда поехать в отпуск в октябре?',
    ];
  }
  return [
    'Какие документы нужны для визы в Грузию?',
    'Составь план на 5 дней по Стамбулу',
    'Что взять в поездку на Бали в сезон дождей?',
  ];
}
