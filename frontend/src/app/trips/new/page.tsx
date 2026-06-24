'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, isAdminRole, type AuthUser } from '@/lib/auth';
import { TripForm } from '@/components/trips/TripForm';

/**
 * Member-facing "create a trip" page. Any logged-in user can create a PRIVATE
 * trip here; admins additionally get the PUBLIC option (gated in TripForm).
 */
export default function NewTripPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  useEffect(() => {
    auth.me().then((u) => {
      if (!u) { window.location.href = '/login'; return; }
      setMe(u);
    });
  }, []);

  if (me === undefined) {
    return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Загрузка…</main>;
  }

  return (
    <main className="container-vela min-h-screen py-10">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/" data-magnetic className="font-serif text-xl tracking-tightest">Vela</Link>
        <Link href="/" data-cursor="hover" className="text-sm text-paper-dim hover:text-paper">← На главную</Link>
      </header>

      <h1 className="font-serif text-4xl tracking-tightest">Новая поездка</h1>
      <p className="mt-3 max-w-2xl text-paper-dim">
        Соберите свой маршрут по дням, выберите темп и пригласите друзей. Поездка
        будет приватной — её увидите только вы и приглашённые участники.
      </p>

      <TripForm canSetPublic={isAdminRole(me!.role)} />
    </main>
  );
}
