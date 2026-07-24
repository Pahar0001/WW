'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, type AuthUser } from '@/lib/auth';
import {
  adminListOrders,
  adminUpdateOrder,
  type TripOrder,
  type TripOrderStatus,
} from '@/lib/api';

/** Админка: заявки «Заказать путешествие» — статус + ответ пользователю. */

const CAN_VIEW = ['ADMIN', 'SUPER_ADMIN'];

const STATUS_RU: Record<TripOrderStatus, string> = {
  NEW: 'Новая',
  IN_PROGRESS: 'В работе',
  DONE: 'Готово',
  DECLINED: 'Отклонена',
};

const inp =
  'w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60';

export default function AdminOrdersPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [orders, setOrders] = useState<TripOrder[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    auth.me().then((u) => {
      if (!u || !CAN_VIEW.includes(u.role)) {
        window.location.href = '/login';
        return;
      }
      setMe(u);
      adminListOrders().then((list) => {
        setOrders(list);
        setNotes(Object.fromEntries(list.map((o) => [o.id, o.adminNote ?? ''])));
      });
    });
  }, []);

  async function save(id: string, status?: TripOrderStatus) {
    setSavingId(id);
    const ok = await adminUpdateOrder(id, { status, adminNote: notes[id] ?? '' });
    setSavingId(null);
    if (ok) {
      setOrders((os) =>
        os.map((o) => (o.id === id ? { ...o, status: status ?? o.status, adminNote: notes[id] ?? '' } : o)),
      );
    }
  }

  if (me === undefined) {
    return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Загрузка…</main>;
  }

  const newCount = orders.filter((o) => o.status === 'NEW').length;

  return (
    <main className="container-vela min-h-screen py-10">
      <header className="mb-8 flex items-center justify-between text-sm">
        <Link href="/admin" className="text-paper-dim hover:text-paper">← Админка</Link>
        <span className="text-paper-faint">{me?.email}</span>
      </header>

      <h1 className="font-serif text-4xl tracking-tightest">Заявки на путешествия</h1>
      <p className="mt-3 text-paper-dim">
        {orders.length} всего{newCount > 0 ? ` · ${newCount} новых` : ''}. Ответ виден пользователю
        на странице «Заказать путешествие».
      </p>

      <div className="mt-10 space-y-5">
        {orders.length === 0 && <p className="text-paper-faint">Заявок пока нет.</p>}
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <span className="text-paper">{o.user?.name || o.user?.email}</span>
                {o.user?.name && <span className="ml-2 text-paper-faint">{o.user.email}</span>}
              </div>
              <span className="text-xs text-paper-faint">
                {new Date(o.createdAt).toLocaleString('ru-RU')}
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-paper-faint">Пожелание</span>
                <p className="text-sm leading-relaxed text-paper-dim">{o.wish}</p>
              </div>
              <div>
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-paper-faint">ИИ-бриф</span>
                {o.brief ? (
                  <pre className="whitespace-pre-wrap rounded-xl border border-ink-line p-3 font-mono text-xs leading-relaxed text-paper-dim">{o.brief}</pre>
                ) : (
                  <span className="text-sm text-paper-faint">— (заявка без брифа)</span>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Статус</span>
                <select
                  className={inp}
                  value={o.status}
                  onChange={(e) => save(o.id, e.target.value as TripOrderStatus)}
                >
                  {(Object.keys(STATUS_RU) as TripOrderStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_RU[s]}</option>
                  ))}
                </select>
              </label>
              <label className="block min-w-[260px] flex-1">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Ответ пользователю</span>
                <input
                  className={inp}
                  value={notes[o.id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [o.id]: e.target.value }))}
                  placeholder="Например: собрали вариант, отправили на почту — проверьте"
                />
              </label>
              <button
                type="button"
                disabled={savingId === o.id}
                onClick={() => save(o.id)}
                className="rounded-full border border-aurora/40 px-5 py-2 text-sm text-aurora transition-colors hover:bg-aurora/10 disabled:opacity-50"
              >
                {savingId === o.id ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
