'use client';

import { useEffect, useState } from 'react';
import { auth, logout, type AuthUser } from '@/lib/auth';
import { uploadImage } from '@/lib/api';
import { network, type ProfileView } from '@/lib/network';
import { social } from '@/lib/social';
import { SocialTabs } from '@/components/social/SocialTabs';
import { Avatar } from '@/components/social/Avatar';
import { toast } from '@/components/ui/Toaster';

const fmt = (s: string) => new Date(s).toLocaleDateString('ru-RU', { dateStyle: 'medium' });

export default function ProfilePage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [data, setData] = useState<ProfileView | null>(null);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = (id: string) => network.profile(id).then((p) => {
    setData(p);
    setName(p.user.name || '');
    setBio(p.user.bio || '');
    setImage(p.user.image || '');
  }).catch(() => {});

  useEffect(() => {
    auth.me().then((u) => {
      if (!u) { window.location.href = '/login'; return; }
      setMe(u);
      load(u.id);
    });
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const r = await uploadImage(file);
    setUploading(false);
    e.target.value = ''; // allow re-selecting the same file after an error
    if (r.ok) {
      setImage(r.url);
      toast.success('Фото загружено — не забудьте «Сохранить»');
    } else {
      toast.error(`Не удалось загрузить фото: ${r.error}`);
    }
  }
  async function save() {
    setSaving(true);
    try {
      await network.updateProfile({ name, bio, image });
      toast.success('Профиль обновлён');
      if (me) load(me.id);
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  }

  if (!me) return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Загрузка…</main>;

  return (
    <main className="container-vela min-h-screen py-8 pb-28 md:pb-12">
      <SocialTabs />
      <h1 className="font-serif text-3xl tracking-tightest md:text-4xl">Мой профиль</h1>

      <div className="mt-6 rounded-2xl border border-ink-line bg-ink-soft/40 p-5">
        <div className="flex items-center gap-4">
          <Avatar user={{ ...me, image: image || me.image }} size={72} />
          <div>
            <label className="cursor-pointer rounded-full border border-ink-line px-4 py-2 text-sm text-paper-dim hover:text-paper">
              {uploading ? 'Загрузка…' : 'Сменить фото'}
              <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
            </label>
            <div className="mt-1 text-xs text-paper-faint">{me.email}</div>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          <label className="text-sm text-paper-faint">Имя
            <input className="mt-1 w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper outline-none focus:border-aurora/60" value={name} onChange={(e) => setName(e.target.value)} placeholder="Как вас зовут" />
          </label>
          <label className="text-sm text-paper-faint">О себе
            <textarea className="mt-1 min-h-[80px] w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper outline-none focus:border-aurora/60" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Пара слов о ваших путешествиях" />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button disabled={saving} onClick={save} className="rounded-full bg-aurora px-6 py-2.5 text-sm font-medium text-aurora-fg disabled:opacity-50">{saving ? 'Сохранение…' : 'Сохранить'}</button>
          <button onClick={() => logout()} className="rounded-full border border-ink-line px-5 py-2.5 text-sm text-paper-dim hover:text-paper">Выйти</button>
          {data && <span className="text-sm text-paper-faint">Друзей: {data.friendCount}</span>}
        </div>
      </div>

      <h2 className="mt-10 font-serif text-2xl tracking-tightest">Мои посты</h2>
      <div className="mt-4 space-y-4">
        {data && data.posts.length === 0 && <p className="text-paper-faint">Вы ещё ничего не публиковали.</p>}
        {data?.posts.map((p) => (
          <div key={p.id} className="rounded-xl border border-ink-line p-4">
            <div className="text-xs text-paper-faint">{fmt(p.createdAt)}</div>
            <p className="mt-1 whitespace-pre-wrap text-paper">{p.text}</p>
            {p.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt="" className="mt-2 max-h-72 rounded-lg object-cover" />
            )}
            <button onClick={() => social.deletePost(p.id).then(() => me && load(me.id))} className="mt-2 text-xs text-paper-faint hover:text-red-300">Удалить</button>
          </div>
        ))}
      </div>
    </main>
  );
}
