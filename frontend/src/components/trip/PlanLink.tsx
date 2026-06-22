'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken } from '@/lib/auth';

/** "Планирование" link — only for signed-in users. */
export function PlanLink({ slug }: { slug: string }) {
  const [authed, setAuthed] = useState(false);
  useEffect(() => setAuthed(!!getToken()), []);
  if (!authed) return null;
  return (
    <Link
      href={`/trips/${slug}/plan`}
      data-magnetic
      className="rounded-full border border-aurora/40 px-4 py-1.5 text-sm text-aurora transition-colors hover:bg-aurora/10"
    >
      Планирование →
    </Link>
  );
}
