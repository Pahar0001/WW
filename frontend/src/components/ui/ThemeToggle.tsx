'use client';

import { useEffect, useState } from 'react';

/** Light/dark toggle. Default is light; choice persisted in localStorage. */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains('dark')), []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('vela_theme', next ? 'dark' : 'light'); } catch {}
    window.dispatchEvent(new Event('vela-theme'));
  }

  return (
    <button
      onClick={toggle}
      data-cursor="hover"
      aria-label={dark ? 'Светлая тема' : 'Тёмная тема'}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-line text-paper-dim transition-colors hover:text-paper"
    >
      {dark ? (
        // sun
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
        </svg>
      ) : (
        // moon
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}
