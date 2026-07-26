'use client';

/**
 * «Пригласить» — ссылка-приглашение в поездку (/join/<token>).
 * Показывается вошедшим на приватных поездках; право приглашать проверяет
 * сервер (участник или админ). Ссылка копируется в буфер обмена.
 */

import { useEffect, useState } from 'react';
import { auth, authHeaders } from '@/lib/auth';
import { toast } from '@/components/ui/Toaster';

export function InviteTripLink({
  slug,
  visibility,
}: {
  slug: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
}) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    auth.me().then((u) => setShow(!!u && visibility === 'PRIVATE')).catch(() => {});
  }, [visibility]);
  if (!show) return null;

  async function invite() {
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${slug}/invite`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (res.status === 403) {
        toast.error('Приглашать могут участники поездки');
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = (await res.json()) as { token: string };
      const url = `${window.location.origin}/join/${d.token}`;
      await navigator.clipboard.writeText(url);
      toast.success('Ссылка-приглашение скопирована');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={invite}
      disabled={busy}
      data-cursor="hover"
      title="Скопировать ссылку-приглашение"
      className="text-sm text-paper-dim transition-colors hover:text-paper disabled:opacity-50"
    >
      {busy ? '…' : 'Пригласить'}
    </button>
  );
}
