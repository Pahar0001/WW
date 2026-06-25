'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, type AuthUser } from '@/lib/auth';
import { imageUrl } from '@/lib/api';
import { social, type FeedTrip } from '@/lib/social';
import { SocialTabs } from '@/components/social/SocialTabs';
import { CommentThread } from '@/components/social/CommentThread';

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
      <h1 className="font-serif text-3xl tracking-tightest md:text-4xl">Лента путешествий</h1>
      <p className="mt-2 text-paper-dim">Публичные маршруты сообщества — лайкайте, комментируйте и репостите.</p>

      <div className="mt-8 space-y-6">
        {!trips && <p className="text-paper-faint">Загрузка…</p>}
        {trips && trips.length === 0 && <p className="text-paper-faint">Пока нет публичных путешествий.</p>}
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
    <article className="overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/40">
      <Link href={`/trips/${trip.slug}`} className="block">
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt={trip.title} className="h-48 w-full object-cover" />
        )}
        <div className="p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">
            {trip.country?.name}{trip.seasonLabel ? ` · ${trip.seasonLabel}` : ''} · {trip.durationDays} дн.
          </div>
          <h2 className="mt-1 font-serif text-2xl tracking-tightest text-paper">{trip.title}</h2>
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
