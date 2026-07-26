'use client';

/**
 * Тумблер воскресного email-дайджеста в настройках профиля.
 * Письмо приходит по воскресеньям в 15:00 МСК; отписаться можно и по ссылке
 * из самого письма — этот переключатель показывает актуальное состояние.
 */

import { useEffect, useState } from 'react';
import { authHeaders } from '@/lib/auth';
import { toast } from '@/components/ui/Toaster';

export function DigestToggle() {
  const [optOut, setOptOut] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/digest/settings', { headers: authHeaders(), cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setOptOut(d ? d.optOut : null))
      .catch(() => setOptOut(null));
  }, []);

  if (optOut === null) return null;

  async function toggle() {
    setBusy(true);
    try {
      const res = await fetch('/api/digest/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ optOut: !optOut }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = (await res.json()) as { optOut: boolean };
      setOptOut(d.optOut);
      toast.success(d.optOut ? 'Дайджест отключён' : 'Дайджест включён — ждите в воскресенье в 15:00');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const on = !optOut;
  return (
    <div className="flex items-center justify-between rounded-xl px-1 py-1.5">
      <span className="text-sm text-paper">
        Воскресный дайджест
        <span className="block text-[11px] text-paper-faint">письмо о новых маршрутах, вс 15:00</span>
      </span>
      <button
        onClick={toggle}
        disabled={busy}
        role="switch"
        aria-checked={on}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? 'bg-aurora' : 'bg-ink-line'} disabled:opacity-50`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`}
        />
      </button>
    </div>
  );
}
