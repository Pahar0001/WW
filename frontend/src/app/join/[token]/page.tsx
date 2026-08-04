'use client';

/**
 * Приглашение в поездку по ссылке /join/<token>.
 * Гость видит карточку поездки и вход; вошедший — кнопку «Присоединиться»,
 * после которой становится участником и попадает на страницу маршрута.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { auth, authHeaders, type AuthUser } from '@/lib/auth';
import { imageUrl, sizedImageUrl } from '@/lib/api';
import { pluralize } from '@/lib/plural';

interface InviteInfo {
  slug: string;
  title: string;
  heroImage?: string | null;
  durationDays: number;
  seasonLabel?: string | null;
  country: { name: string };
  _count: { members: number };
}

export default function JoinPage() {
  const token = String(useParams().token);
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [info, setInfo] = useState<InviteInfo | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    auth.me().then(setMe).catch(() => setMe(null));
    fetch(`/api/trips/invite/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setInfo)
      .catch(() => setInfo(null));
  }, [token]);

  async function join() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/invite/${encodeURIComponent(token)}/accept`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = (await res.json()) as { slug: string };
      window.location.href = `/trips/${d.slug}`;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  if (info === undefined || me === undefined) {
    return (
      <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">
        Загрузка…
      </main>
    );
  }

  if (info === null) {
    return (
      <main className="container-vela flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-serif display-2">Приглашение не найдено</h1>
        <p className="max-w-md text-paper-dim">
          Ссылка устарела или отозвана. Попросите организатора прислать новую.
        </p>
        <Link href="/" className="rounded-full border border-ink-line px-5 py-2.5 text-sm text-paper-dim hover:text-paper">
          На главную
        </Link>
      </main>
    );
  }

  return (
    <main className="container-vela flex min-h-screen items-center justify-center py-16">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-ink-line bg-ink-soft/40 shadow-soft-lg">
        {imageUrl(info.heroImage) && (
          <div className="relative h-52 w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sizedImageUrl(info.heroImage, 1200)!} alt="" decoding="async" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
        )}
        <div className="p-7">
          <p className="flex items-center gap-3 text-xs uppercase tracking-[0.26em] text-paper-faint">
            <span className="h-px w-7 bg-aurora/60" />
            Вас пригласили в поездку
          </p>
          <h1 className="mt-3 font-serif text-3xl tracking-tightest">{info.title}</h1>
          <p className="mt-2 text-paper-dim">
            {info.country.name} · {pluralize(info.durationDays, 'день', 'дня', 'дней')}
            {info.seasonLabel ? ` · ${info.seasonLabel}` : ''}
          </p>
          <p className="mt-1 text-sm text-paper-faint">
            Уже {pluralize(info._count.members, 'участник', 'участника', 'участников')}
          </p>

          {error && (
            <p className="mt-4 rounded-xl border border-red-400/30 bg-red-500/5 px-4 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <div className="mt-6">
            {me ? (
              <button
                onClick={join}
                disabled={busy}
                className="glow-gold w-full rounded-full bg-aurora px-6 py-3.5 text-sm font-medium text-aurora-fg transition-transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {busy ? 'Присоединяю…' : 'Присоединиться к поездке'}
              </button>
            ) : (
              <div className="space-y-2.5">
                <Link
                  href="/login"
                  className="glow-gold block w-full rounded-full bg-aurora px-6 py-3.5 text-center text-sm font-medium text-aurora-fg"
                >
                  Войти и присоединиться
                </Link>
                <Link
                  href={`/register`}
                  className="block w-full rounded-full border border-ink-line px-6 py-3.5 text-center text-sm text-paper-dim hover:text-paper"
                >
                  Создать аккаунт
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
