'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, type AuthUser } from '@/lib/auth';
import { imageUrl } from '@/lib/api';
import { social, type FeedTrip } from '@/lib/social';
import { SocialTabs } from '@/components/social/SocialTabs';
import { CommentThread } from '@/components/social/CommentThread';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function FeedPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [trips, setTrips] = useState<FeedTrip[] | null>(null);

  useEffect(() => {
    auth.me().then((u) => {
      if (!u) { window.location.href = '/login'; return; }
      setMe(u);
      social.feed().then(setTrips).catch(() => setTrips([]));
    });
  }, []);

  if (me === undefined) return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Загрузка…</main>;

  return (
    <main className="container-vela min-h-screen py-8 pb-28 md:pb-12">
      <SocialTabs />
      <p className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
        <span className="h-px w-8 bg-aurora/60" />
        Лента
      </p>
      <h1 className="font-serif display-2">Лента путешествий</h1>
      <p className="mt-4 max-w-2xl text-lg text-paper-dim">
        Публичные маршруты сообщества — лайкайте, комментируйте и репостите.
      </p>

      <div className="mt-8 space-y-6">
        {!trips &&
          Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/40">
              <Skeleton className="h-48 w-full rounded-none" />
              <div className="space-y-3 p-5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        {trips && trips.length === 0 && (
          <EmptyState
            title="Пока нет публичных путешествий"
            hint="Как только появятся общедоступные маршруты, они окажутся здесь — с лайками, комментариями и репостами."
          />
        )}
        {trips?.map((t) => <TripCard key={t.id} trip={t} meId={me?.id} />)}
      </div>
    </main>
  );
}

function TripCard({ trip, meId }: { trip: FeedTrip; meId?: string }) {
  const [liked, setLiked] = useState(trip.likedByMe);
  const [likes, setLikes] = useState(trip.likes);
  const [reposted, setReposted] = useState(trip.repostedByMe);
  const [reposts, setReposts] = useState(trip.reposts);
  const [comments, setComments] = useState(trip.comments);
  const [open, setOpen] = useState(false);
  const hero = imageUrl(trip.heroImage);

  async function like() {
    setLiked((v) => !v); setLikes((n) => n + (liked ? -1 : 1));
    try { const r = await social.toggleLike('TRIP', trip.id); setLiked(r.liked); setLikes(r.count); } catch { /* revert on next load */ }
  }
  async function repost() {
    setReposted((v) => !v); setReposts((n) => n + (reposted ? -1 : 1));
    try { const r = await social.toggleRepost(trip.id); setReposted(r.reposted); setReposts(r.count); } catch { /* */ }
  }

  return (
    <article className="card-lux group overflow-hidden rounded-2xl">
      <Link href={`/trips/${trip.slug}`} className="block">
        {hero && (
          <div className="relative h-52 w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt={trip.title} className="h-full w-full object-cover transition-transform duration-[1.4s] ease-smooth group-hover:scale-[1.05]" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-soft/70 to-transparent" />
          </div>
        )}
        <div className="p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">
            {trip.country?.name}{trip.seasonLabel ? ` · ${trip.seasonLabel}` : ''} · {trip.durationDays} дн.
          </div>
          <h2 className="mt-2 font-serif text-2xl tracking-tightest text-paper transition-colors group-hover:text-aurora">{trip.title}</h2>
          {trip.summary && <p className="mt-2 line-clamp-2 text-paper-dim">{trip.summary}</p>}
        </div>
      </Link>
      <div className="flex items-center gap-1 border-t border-ink-line px-3 py-2 text-sm">
        <button onClick={like} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${liked ? 'text-aurora' : 'text-paper-dim hover:text-paper'}`}>
          <span>{liked ? '♥' : '♡'}</span> {likes}
        </button>
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-paper-dim transition-colors hover:text-paper">
          <span>💬</span> {comments}
        </button>
        <button onClick={repost} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${reposted ? 'text-aurora' : 'text-paper-dim hover:text-paper'}`}>
          <span>↻</span> {reposts}
        </button>
      </div>
      {open && (
        <div className="px-5 pb-5">
          <CommentThread targetType="TRIP" targetId={trip.id} meId={meId} onCountChange={setComments} />
        </div>
      )}
    </article>
  );
}
