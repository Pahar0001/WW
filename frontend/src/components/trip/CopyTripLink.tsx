'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/auth';
import { copyTrip } from '@/lib/api';
import { toast } from '@/components/ui/Toaster';

/** "Скопировать себе" — clone a PUBLIC trip into the user's own private copy. */
export function CopyTripLink({ slug, visibility }: { slug: string; visibility?: 'PUBLIC' | 'PRIVATE' }) {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    auth.me().then((u) => setShow(!!u && visibility === 'PUBLIC')).catch(() => {});
  }, [visibility]);
  if (!show) return null;

  async function copy() {
    setBusy(true);
    const r = await copyTrip(slug);
    setBusy(false);
    if (r.ok) {
      toast.success('Поездка скопирована в ваши');
      window.location.href = `/trips/${r.slug}`;
    } else {
      toast.error(r.error);
    }
  }

  return (
    <button
      onClick={copy}
      disabled={busy}
      data-cursor="hover"
      className="rounded-full border border-ink-line px-4 py-1.5 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper disabled:opacity-50"
    >
      {busy ? 'Копирование…' : 'Скопировать себе'}
    </button>
  );
}
