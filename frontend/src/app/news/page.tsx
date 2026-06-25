'use client';

import { useEffect, useState } from 'react';
import { auth, type AuthUser } from '@/lib/auth';
import { uploadImage } from '@/lib/api';
import { social, type NewsPost } from '@/lib/social';
import { SocialTabs } from '@/components/social/SocialTabs';
import { CommentThread } from '@/components/social/CommentThread';
import { Avatar } from '@/components/social/Avatar';

const fmt = (s: string) => new Date(s).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

export default function NewsPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [posts, setPosts] = useState<NewsPost[] | null>(null);
  const load = () => social.news().then(setPosts).catch(() => setPosts([]));

  useEffect(() => {
    auth.me().then((u) => {
      if (!u) { window.location.href = '/login'; return; }
      setMe(u);
      load();
    });
  }, []);

  if (me === undefined) return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Загрузка…</main>;

  return (
    <main className="container-vela min-h-screen py-8 pb-28 md:pb-12">
      <SocialTabs />
      <h1 className="font-serif text-3xl tracking-tightest md:text-4xl">Новости путешествий</h1>
      <p className="mt-2 text-paper-dim">Делитесь впечатлениями, советами и фотографиями из поездок.</p>

      <Composer onPosted={load} />

      <div className="mt-8 space-y-5">
        {!posts && <p className="text-paper-faint">Загрузка…</p>}
        {posts && posts.length === 0 && <p className="text-paper-faint">Пока нет постов. Будьте первым!</p>}
        {me && posts?.map((p) => <PostCard key={p.id} post={p} me={me} onDeleted={load} />)}
      </div>
    </main>
  );
}

function Composer({ onPosted }: { onPosted: () => void }) {
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const r = await uploadImage(file);
    setUploading(false);
    if (r.ok) setImageUrl(r.url);
  }
  async function post() {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await social.createPost(text.trim(), imageUrl || undefined);
      setText(''); setImageUrl('');
      onPosted();
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-6 rounded-2xl border border-ink-line bg-ink-soft/40 p-5">
      <textarea
        className="min-h-[80px] w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60"
        placeholder="Что нового в ваших путешествиях?" value={text} onChange={(e) => setText(e.target.value)}
      />
      {imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="mt-3 max-h-60 rounded-lg object-cover" />
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <label className="cursor-pointer rounded-full border border-ink-line px-4 py-2 text-sm text-paper-dim hover:text-paper">
          {uploading ? 'Загрузка…' : imageUrl ? 'Фото добавлено ✓' : '📷 Фото'}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
        </label>
        <button disabled={busy || !text.trim()} onClick={post} className="rounded-full bg-aurora px-5 py-2 text-sm font-medium text-aurora-fg disabled:opacity-50">
          {busy ? 'Публикация…' : 'Опубликовать'}
        </button>
      </div>
    </div>
  );
}

function PostCard({ post, me, onDeleted }: { post: NewsPost; me: AuthUser; onDeleted: () => void }) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likes, setLikes] = useState(post.likes);
  const [comments, setComments] = useState(post.comments);
  const [open, setOpen] = useState(false);
  const canDelete = post.author.id === me.id || me.role === 'ADMIN' || me.role === 'SUPER_ADMIN';

  async function like() {
    setLiked((v) => !v); setLikes((n) => n + (liked ? -1 : 1));
    try { const r = await social.toggleLike('POST', post.id); setLiked(r.liked); setLikes(r.count); } catch { /* */ }
  }

  return (
    <article className="rounded-2xl border border-ink-line bg-ink-soft/40 p-5">
      <div className="flex items-center gap-3">
        <Avatar user={post.author} size={40} link />
        <div className="flex-1">
          <div className="text-paper">{post.author.name || post.author.email}</div>
          <div className="text-xs text-paper-faint">{fmt(post.createdAt)}</div>
        </div>
        {canDelete && (
          <button onClick={() => social.deletePost(post.id).then(onDeleted)} className="text-xs text-paper-faint hover:text-red-300">Удалить</button>
        )}
      </div>
      <p className="mt-3 whitespace-pre-wrap text-paper">{post.text}</p>
      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.imageUrl} alt="" className="mt-3 max-h-96 w-full rounded-lg object-cover" />
      )}
      <div className="mt-3 flex items-center gap-1 border-t border-ink-line/60 pt-2 text-sm">
        <button onClick={like} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors ${liked ? 'text-aurora' : 'text-paper-dim hover:text-paper'}`}>
          <span>{liked ? '♥' : '♡'}</span> {likes}
        </button>
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-paper-dim transition-colors hover:text-paper">
          <span>💬</span> {comments}
        </button>
      </div>
      {open && <CommentThread targetType="POST" targetId={post.id} meId={me.id} onCountChange={setComments} />}
    </article>
  );
}
