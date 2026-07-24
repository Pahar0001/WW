'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, isAdminRole, logout, type AuthUser } from '@/lib/auth';
import { uploadImage } from '@/lib/api';
import { network, type ProfileView } from '@/lib/network';
import { social } from '@/lib/social';
import { SocialTabs } from '@/components/social/SocialTabs';
import { Avatar } from '@/components/social/Avatar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toaster';

const fmtDate = (s: string) => new Date(s).toLocaleDateString('ru-RU', { dateStyle: 'long' });

const ROLE_RU: Record<string, string> = {
  SUPER_ADMIN: 'Владелец',
  ADMIN: 'Администратор',
  ORGANIZER: 'Организатор',
  MEMBER: 'Участник',
};

const QUICK_LINKS = [
  { href: '/feed', label: 'Лента', hint: 'Публичные маршруты', icon: 'M4 6h16M4 12h16M4 18h10' },
  { href: '/community', label: 'Сообщество', hint: 'Визы и документы', icon: 'M12 3a9 9 0 100 18 9 9 0 000-18M3.5 9h17M3.5 15h17M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18' },
  { href: '/network', label: 'Люди', hint: 'Друзья и попутчики', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { href: '/notifications', label: 'Уведомления', hint: 'Заявки и активность', icon: 'M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 21h4' },
  { href: '/trips/new', label: 'Собрать поездку', hint: 'Свой маршрут по дням', icon: 'M12 5v14M5 12h14' },
];

export default function ProfilePage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [data, setData] = useState<ProfileView | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [image, setImage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = (id: string) => {
    setLoadingData(true);
    network
      .profile(id)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoadingData(false));
  };

  useEffect(() => {
    auth.me().then((u) => {
      if (!u) {
        window.location.href = '/login';
        return;
      }
      // Populate the editable fields immediately from the session — the form
      // is usable before the extended profile (posts/stats) finishes loading.
      setMe(u);
      setName(u.name || '');
      setBio(u.bio || '');
      setImage(u.image || '');
      load(u.id);
    });
  }, []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const r = await uploadImage(file);
    setUploading(false);
    e.target.value = '';
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
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="container-vela min-h-screen py-8 pb-32 md:pb-16">
      <SocialTabs />
      <p className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
        <span className="h-px w-8 bg-aurora/60" />
        Профиль
      </p>
      <h1 className="font-serif display-2">Мой профиль</h1>

      {me === undefined ? (
        <ProfileSkeleton />
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
          {/* ── Основная колонка ── */}
          <div className="space-y-6">
            {/* Идентичность */}
            <div className="rounded-2xl border border-ink-line bg-ink-soft/50 p-6 shadow-soft sm:p-7">
              <div className="flex flex-wrap items-center gap-5">
                <Avatar user={{ ...me!, image: image || me!.image }} size={80} />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif text-2xl tracking-tightest text-paper">
                      {me!.name || 'Без имени'}
                    </h2>
                    <span className="rounded-full border border-aurora/40 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-aurora">
                      {ROLE_RU[me!.role] ?? me!.role}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-paper-dim">{me!.email}</div>
                  <div className="mt-1 text-xs text-paper-faint">
                    {loadingData ? (
                      <Skeleton className="mt-1 h-3 w-40" />
                    ) : data?.user.createdAt ? (
                      `На Vela с ${fmtDate(data.user.createdAt)}`
                    ) : null}
                  </div>
                </div>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-ink-line pt-5 sm:grid-cols-3">
                <Stat label="Друзей" value={data?.friendCount} loading={loadingData} />
                <Stat label="Постов" value={data?.posts.length} loading={loadingData} />
                <Link href="/network" className="group hidden sm:block">
                  <dt className="font-serif text-2xl tracking-tightest text-paper transition-colors group-hover:text-aurora">
                    →
                  </dt>
                  <dd className="mt-1 text-xs uppercase tracking-[0.16em] text-paper-faint">Найти людей</dd>
                </Link>
              </dl>
            </div>

            {/* Редактирование */}
            <div className="rounded-2xl border border-ink-line bg-ink-soft/50 p-6 shadow-soft sm:p-7">
              <h3 className="font-serif text-xl tracking-tightest text-paper">Редактировать профиль</h3>
              <div className="mt-4 flex items-center gap-4">
                <Avatar user={{ ...me!, image: image || me!.image }} size={56} />
                <label className="cursor-pointer rounded-full border border-ink-line px-4 py-2 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper">
                  {uploading ? 'Загрузка…' : 'Сменить фото'}
                  <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
                </label>
              </div>
              <div className="mt-5 grid gap-4">
                <label className="text-sm text-paper-faint">
                  Имя
                  <input
                    className="mt-1.5 w-full rounded-lg border border-ink-line bg-ink px-3 py-2.5 text-paper outline-none focus:border-aurora/60"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Как вас зовут"
                  />
                </label>
                <label className="text-sm text-paper-faint">
                  О себе
                  <textarea
                    className="mt-1.5 min-h-[90px] w-full rounded-lg border border-ink-line bg-ink px-3 py-2.5 text-paper outline-none focus:border-aurora/60"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Пара слов о ваших путешествиях"
                  />
                </label>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  disabled={saving}
                  onClick={save}
                  className="rounded-full bg-aurora px-6 py-2.5 text-sm font-medium text-aurora-fg transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
                {me && (
                  <Link
                    href={`/u/${me.id}`}
                    className="text-sm text-paper-dim transition-colors hover:text-aurora"
                  >
                    Открыть публичный профиль →
                  </Link>
                )}
              </div>
            </div>

            {/* Мои посты */}
            <div>
              <h3 className="mb-4 font-serif text-xl tracking-tightest text-paper">Мои посты</h3>
              <div className="space-y-4">
                {loadingData ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-ink-line bg-ink-soft/40 p-4 shadow-soft">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="mt-3 h-4 w-full" />
                      <Skeleton className="mt-2 h-4 w-2/3" />
                    </div>
                  ))
                ) : data && data.posts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-ink-line bg-ink-soft/30 p-6 text-center text-sm text-paper-dim">
                    Вы ещё ничего не публиковали.{' '}
                    <Link href="/news" className="text-aurora hover:underline">
                      Создать пост
                    </Link>
                  </div>
                ) : (
                  data?.posts.map((p) => (
                    <div key={p.id} className="rounded-xl border border-ink-line bg-ink-soft/40 p-4 shadow-soft">
                      <div className="text-xs text-paper-faint">{fmtDate(p.createdAt)}</div>
                      <p className="mt-1 whitespace-pre-wrap text-paper">{p.text}</p>
                      {p.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt="" className="mt-2 max-h-72 rounded-lg object-cover" />
                      )}
                      <button
                        onClick={() => social.deletePost(p.id).then(() => me && load(me.id))}
                        className="mt-2 text-xs text-paper-faint hover:text-red-300"
                      >
                        Удалить
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* ── Боковая колонка ── */}
          <aside className="space-y-6">
            <div className="rounded-2xl border border-ink-line bg-ink-soft/50 p-5 shadow-soft">
              <h3 className="mb-3 text-xs uppercase tracking-[0.22em] text-paper-faint">Разделы</h3>
              <div className="space-y-1">
                {QUICK_LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ink-line/40"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-aurora/10 text-aurora">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={l.icon} /></svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm text-paper transition-colors group-hover:text-aurora">{l.label}</span>
                      <span className="block text-xs text-paper-faint">{l.hint}</span>
                    </span>
                    <span className="ml-auto text-paper-faint transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                ))}
                {me && isAdminRole(me.role) && (
                  <Link
                    href="/admin"
                    className="group -mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-ink-line/40"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-aurora/10 text-aurora">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l7 4v6c0 5-3 8-7 10-4-2-7-5-7-10V6z" /></svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm text-paper transition-colors group-hover:text-aurora">Админка</span>
                      <span className="block text-xs text-paper-faint">Управление платформой</span>
                    </span>
                    <span className="ml-auto text-paper-faint transition-transform group-hover:translate-x-0.5">→</span>
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-ink-line bg-ink-soft/50 p-5 shadow-soft">
              <h3 className="mb-3 text-xs uppercase tracking-[0.22em] text-paper-faint">Настройки</h3>
              <div className="flex items-center justify-between rounded-xl px-1 py-1.5">
                <span className="text-sm text-paper">Тема оформления</span>
                <ThemeToggle />
              </div>
              <button
                onClick={() => logout()}
                className="mt-2 w-full rounded-full border border-ink-line px-4 py-2.5 text-sm text-paper-dim transition-colors hover:border-red-400/50 hover:text-paper"
              >
                Выйти из аккаунта
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, loading }: { label: string; value?: number; loading: boolean }) {
  return (
    <div>
      <dt className="font-serif text-2xl tracking-tightest text-paper">
        {loading || value === undefined ? <Skeleton className="h-7 w-10" /> : value}
      </dt>
      <dd className="mt-1 text-xs uppercase tracking-[0.16em] text-paper-faint">{label}</dd>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
      <div className="space-y-6">
        <div className="rounded-2xl border border-ink-line bg-ink-soft/50 p-7 shadow-soft">
          <div className="flex items-center gap-5">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-ink-line bg-ink-soft/50 p-7 shadow-soft">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="mt-5 h-10 w-full" />
          <Skeleton className="mt-4 h-24 w-full" />
        </div>
      </div>
      <div className="space-y-6">
        <Skeleton className="h-64 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}
