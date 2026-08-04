'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminListTrips, adminNewOrdersCount, deleteTrip, imageUrl, type Trip, sizedImageUrl } from '@/lib/api';
import { auth, isAdminRole, logout, type AuthUser } from '@/lib/auth';
import { toast } from '@/components/ui/Toaster';
import { TripForm } from '@/components/trips/TripForm';
import { AdminDashboard } from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  // RBAC guard: only ADMIN / SUPER_ADMIN may use the panel.
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  useEffect(() => {
    auth.me().then((u) => {
      if (!u || !isAdminRole(u.role)) {
        window.location.href = '/login';
      } else {
        setMe(u);
      }
    });
  }, []);

  // Бейдж «сколько заявок ждут разбора» — в единственной навигации (шапке).
  const [newOrders, setNewOrders] = useState(0);
  useEffect(() => {
    adminNewOrdersCount().then(setNewOrders);
  }, []);

  // Existing trips (for deletion).
  const [trips, setTrips] = useState<Trip[]>([]);
  const refreshTrips = () => adminListTrips().then((t) => setTrips(t ?? []));
  useEffect(() => {
    refreshTrips();
  }, []);

  async function onDelete(slug: string, name: string) {
    if (!confirm(`Удалить путешествие «${name}»? Это действие необратимо.`)) return;
    const res = await deleteTrip(slug);
    if (res.ok) { toast.success(`«${name}» удалено`); refreshTrips(); }
    else toast.error(res.error ?? 'Не удалось удалить');
  }

  if (me === undefined) {
    return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Проверка доступа…</main>;
  }

  return (
    <main className="container-vela min-h-screen py-10">
      <header className="mb-12 flex items-center justify-between">
        <Link href="/" data-magnetic className="font-serif text-xl tracking-tightest">
          Vela
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/admin/users" data-cursor="hover" className="text-paper-dim hover:text-paper">Пользователи</Link>
          <Link href="/admin/support" data-cursor="hover" className="text-paper-dim hover:text-paper">Поддержка</Link>
          <Link href="/admin/orders" data-cursor="hover" className="inline-flex items-center gap-1.5 text-paper-dim hover:text-paper">
            Заявки
            {newOrders > 0 && (
              <span className="inline-grid h-5 min-w-[20px] place-items-center rounded-full bg-aurora px-1 text-[11px] font-semibold text-aurora-fg">
                {newOrders}
              </span>
            )}
          </Link>
          <Link href="/admin/analytics" data-cursor="hover" className="text-paper-dim hover:text-paper">Аналитика</Link>
          <Link href="/" data-cursor="hover" className="text-paper-dim hover:text-paper">← На главную</Link>
          <span className="text-paper-faint">{me?.email}</span>
          <button onClick={() => logout()} className="rounded-full border border-ink-line px-3 py-1 text-paper-dim hover:text-paper">Выйти</button>
        </div>
      </header>

      <p className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
        <span className="h-px w-8 bg-aurora/60" />
        Админка
      </p>
      <h1 className="font-serif display-2">Панель управления</h1>
      <p className="mt-4 max-w-2xl text-lg text-paper-dim">
        Живые метрики платформы, динамика за месяц, статусы систем — и{' '}
        <a href="#trips-manage" className="text-paper underline decoration-aurora/40 underline-offset-4 hover:text-aurora">
          управление путешествиями
        </a>{' '}
        ниже.
      </p>

      {/* Метрики, графики, мониторинг */}
      <AdminDashboard />

      {/* Управление существующими путешествиями */}
      <section id="trips-manage" className="mt-10 rounded-2xl border border-ink-line bg-ink-soft/50 p-6 shadow-soft sm:p-8">
        <h2 className="font-serif text-2xl tracking-tightest">Существующие путешествия</h2>
        {trips.length === 0 ? (
          <p className="mt-3 text-sm text-paper-faint">Пока ничего нет.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-line">
            {trips.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  {imageUrl(t.heroImage) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={sizedImageUrl(t.heroImage, 200)!} alt="" decoding="async" className="h-10 w-14 rounded-md object-cover" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <a href={`/trips/${t.slug}`} className="text-paper hover:text-aurora">{t.title}</a>
                      {t.visibility === 'PRIVATE' && (
                        <span className="rounded-full border border-aurora/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-aurora">Приватная</span>
                      )}
                      {t.status === 'HIDDEN' && (
                        <span className="rounded-full border border-ink-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-paper-faint">Архив</span>
                      )}
                      {t.status === 'DRAFT' && (
                        <span className="rounded-full border border-ink-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-paper-faint">Черновик</span>
                      )}
                    </div>
                    <div className="text-xs text-paper-faint">
                      {t.country.name} · {t.durationDays} дней
                      {t._count?.members ? ` · ${t._count.members} участн.` : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/trips/${t.slug}/edit`}
                    className="rounded-full border border-ink-line px-4 py-1.5 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper"
                  >
                    Изменить
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(t.slug, t.title)}
                    className="rounded-full border border-red-400/30 px-4 py-1.5 text-sm text-red-300 transition-colors hover:border-red-400/60 hover:bg-red-400/10"
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="mt-16 font-serif text-3xl tracking-tightest">Новое путешествие</h2>
      <TripForm canSetPublic />
    </main>
  );
}
