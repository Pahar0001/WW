'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, type AuthUser } from '@/lib/auth';
import {
  adminListServiceRequests,
  adminUpdateServiceRequest,
  type ServiceRequest,
  type ServiceRequestKind,
  type ServiceRequestStatus,
} from '@/lib/api';

/**
 * Админка: заявки на трансфер и парковку из раздела логистики.
 *
 * Отдельно от «Заказать путешествие» намеренно. Там свободное пожелание, здесь
 * — конкретный заказ с аэропортом, датой и временем подачи. Админу нужно
 * видеть эти поля сразу, крупно и в одном месте: по ним он звонит перевозчику.
 * Сортировка приходит с сервера — новые сверху.
 */

const CAN_VIEW = ['ADMIN', 'SUPER_ADMIN'];

const STATUS_RU: Record<ServiceRequestStatus, string> = {
  NEW: 'Новая',
  IN_PROGRESS: 'В работе',
  CONFIRMED: 'Подтверждена',
  DONE: 'Выполнена',
  CANCELLED: 'Отменена',
};

const KIND_RU: Record<ServiceRequestKind, string> = {
  TRANSFER_TO_AIRPORT: 'Трансфер в аэропорт',
  TRANSFER_FROM_AIRPORT: 'Встреча по прилёте',
  PARKING: 'Парковка',
};

const inp =
  'w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60';

export default function AdminServiceRequestsPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    auth.me().then((u) => {
      if (!u || !CAN_VIEW.includes(u.role)) {
        window.location.href = '/login';
        return;
      }
      setMe(u);
      adminListServiceRequests().then((list) => {
        setItems(list);
        setNotes(Object.fromEntries(list.map((r) => [r.id, r.adminNote ?? ''])));
        setPrices(
          Object.fromEntries(list.map((r) => [r.id, r.priceRub != null ? String(r.priceRub) : ''])),
        );
      });
    });
  }, []);

  async function save(id: string, status?: ServiceRequestStatus) {
    setSavingId(id);
    const priceRub = prices[id]?.trim() ? Number(prices[id]) : null;
    const ok = await adminUpdateServiceRequest(id, {
      status,
      adminNote: notes[id] ?? '',
      priceRub,
    });
    setSavingId(null);
    if (ok) {
      setItems((rs) =>
        rs.map((r) =>
          r.id === id ? { ...r, status: status ?? r.status, adminNote: notes[id] ?? '', priceRub } : r,
        ),
      );
    }
  }

  if (me === undefined) {
    return (
      <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">
        Загрузка…
      </main>
    );
  }

  const newCount = items.filter((r) => r.status === 'NEW').length;

  return (
    <main className="container-vela min-h-screen py-10">
      <header className="mb-8 flex items-center justify-between text-sm">
        <Link href="/admin" className="text-paper-dim hover:text-paper">
          ← Админка
        </Link>
        <Link href="/admin/orders" className="text-paper-dim hover:text-paper">
          Заявки на путешествия
        </Link>
        <span className="text-paper-faint">{me?.email}</span>
      </header>

      <h1 className="font-serif text-4xl tracking-tightest">Трансфер и парковка</h1>
      <p className="mt-3 text-paper-dim">
        {items.length} всего{newCount > 0 ? ` · ${newCount} новых` : ''}. Ответ виден человеку в его
        заявках; на почту пишем вручную.
      </p>

      <div className="mt-10 space-y-5">
        {items.length === 0 && <p className="text-paper-faint">Заявок пока нет.</p>}
        {items.map((r) => (
          <div key={r.id} className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="rounded-full border border-aurora/30 px-2.5 py-0.5 text-xs text-aurora">
                  {KIND_RU[r.kind]}
                </span>
                <span className="text-sm text-paper">{r.user?.name || r.user?.email}</span>
                {r.user?.name && <span className="text-xs text-paper-faint">{r.user.email}</span>}
              </div>
              <span className="text-xs text-paper-faint">
                {new Date(r.createdAt).toLocaleString('ru-RU')}
              </span>
            </div>

            {/* Суть заказа: то, по чему админ звонит перевозчику. */}
            <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
              <Field label="Аэропорт" value={r.airportIata} />
              <Field
                label="Когда"
                value={`${r.serviceDate.split('-').reverse().join('.')}${r.serviceTime ? `, ${r.serviceTime}` : ''}`}
              />
              <Field label={r.kind === 'PARKING' ? 'Мест' : 'Пассажиров'} value={String(r.pax)} />
              {r.pickup && (
                <Field label={r.kind === 'PARKING' ? 'Машина' : 'Откуда забрать'} value={r.pickup} />
              )}
              {r.phone && <Field label="Телефон" value={r.phone} />}
              {r.tripSlug && (
                <Field
                  label="Поездка"
                  value={
                    <Link
                      href={`/trips/${r.tripSlug}/logistics`}
                      className="text-aurora hover:underline"
                    >
                      {r.tripSlug}
                    </Link>
                  }
                />
              )}
            </div>

            {r.comment && (
              <p className="mt-4 rounded-xl border border-ink-line p-3 text-sm leading-relaxed text-paper-dim">
                {r.comment}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-end gap-4">
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">
                  Статус
                </span>
                <select
                  className={inp}
                  value={r.status}
                  onChange={(e) => save(r.id, e.target.value as ServiceRequestStatus)}
                >
                  {(Object.keys(STATUS_RU) as ServiceRequestStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_RU[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block w-36">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">
                  Цена (₽)
                </span>
                <input
                  type="number"
                  className={inp}
                  value={prices[r.id] ?? ''}
                  onChange={(e) => setPrices((p) => ({ ...p, [r.id]: e.target.value }))}
                  placeholder="—"
                />
              </label>
              <label className="block min-w-[260px] flex-1">
                <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">
                  Ответ человеку
                </span>
                <input
                  className={inp}
                  value={notes[r.id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                  placeholder="Например: машина подтверждена, водитель позвонит за час"
                />
              </label>
              <button
                type="button"
                disabled={savingId === r.id}
                onClick={() => save(r.id)}
                className="rounded-full border border-aurora/40 px-5 py-2 text-sm text-aurora transition-colors hover:bg-aurora/10 disabled:opacity-50"
              >
                {savingId === r.id ? 'Сохраняем…' : 'Сохранить'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="block text-xs uppercase tracking-[0.2em] text-paper-faint">{label}</span>
      <span className="mt-1 block text-sm text-paper">{value}</span>
    </div>
  );
}
