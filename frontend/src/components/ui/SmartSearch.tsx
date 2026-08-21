'use client';

import { useState } from 'react';

// Smart Search: пользователь описывает поездку обычными словами, запрос
// уходит в ИИ-ассистента (событие vela:open-assistant с prompt) — тот уже
// умеет вести диалог и подбирать маршрут. Отдельный бэкенд не нужен.
const EXAMPLES = [
  'Тёплое море в октябре, бюджет 120к на двоих',
  'Горы и хайкинг на неделю без визы',
  'Городской уикенд с гастрономией',
];

export function SmartSearch() {
  const [q, setQ] = useState('');

  function ask(prompt: string) {
    const text = prompt.trim();
    if (!text) return;
    window.dispatchEvent(new CustomEvent('vela:open-assistant', { detail: { prompt: text } }));
  }

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 py-2 pl-5 pr-2 backdrop-blur-md transition-colors focus-within:border-white/50"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="shrink-0 text-white/70"
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Опишите поездку мечты обычными словами…"
          aria-label="Умный поиск путешествия"
          className="min-w-0 flex-1 bg-transparent py-1.5 font-sans text-[0.95rem] text-white placeholder:text-white/55 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-aurora px-5 py-2.5 text-sm font-medium text-aurora-fg transition-transform duration-500 ease-smooth hover:-translate-y-0.5 active:scale-[0.97]"
        >
          Подобрать
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => ask(ex)}
            className="rounded-full border border-white/20 px-3 py-1.5 font-sans text-[0.72rem] text-white/70 transition-colors hover:border-white/45 hover:text-white"
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}
