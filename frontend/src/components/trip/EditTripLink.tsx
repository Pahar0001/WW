'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/auth';

const CAN_EDIT = ['ORGANIZER', 'ADMIN', 'SUPER_ADMIN'];

/** "Редактировать" link — shown to everyone except regular MEMBER. */
export function EditTripLink({ slug }: { slug: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    auth.me().then((u) => setShow(!!u && CAN_EDIT.includes(u.role))).catch(() => {});
  }, []);
  if (!show) return null;
  return (
    <Link
      href={`/trips/${slug}/edit`}
      data-cursor="hover"
      className="rounded-full border border-ink-line px-4 py-1.5 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper"
    >
      Редактировать
    </Link>
  );
}
