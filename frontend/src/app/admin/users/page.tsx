'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, isAdminRole, logout, type AuthUser, type Role } from '@/lib/auth';
import { admin, type AdminUser, type AdminStats, type AuditRow } from '@/lib/admin';
import { toast } from '@/components/ui/Toaster';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

const ROLES: Role[] = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'MEMBER'];

export default function AdminUsersPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const isSuper = me?.role === 'SUPER_ADMIN';

  const load = () => {
    admin.users(search, roleFilter).then(setUsers).catch(() => {});
    admin.stats().then(setStats).catch(() => {});
    admin.audit().then(setAudit).catch(() => {});
  };

  useEffect(() => {
    auth.me().then((u) => {
      if (!u || !isAdminRole(u.role)) window.location.href = '/login';
      else {
        setMe(u);
        load();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(fn: () => Promise<unknown>, note?: string) {
    try {
      await fn();
      if (note) toast.success(note);
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  if (me === undefined) {
    return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Проверка доступа…</main>;
  }

  return (
    <main className="container-vela min-h-screen py-10">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl tracking-tightest">Vela</Link>
        <div className="flex items-center gap-5 text-sm">
          <Link href="/admin" className="text-paper-dim hover:text-paper">Поездки</Link>
          <Link href="/admin/support" className="text-paper-dim hover:text-paper">Поддержка</Link>
          <span className="text-paper-faint">{me?.email}</span>
          <button onClick={() => logout()} className="rounded-full border border-ink-line px-3 py-1 text-paper-dim hover:text-paper">Выйти</button>
        </div>
      </header>

      <p className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
        <span className="h-px w-8 bg-aurora/60" />
        Админка
      </p>
      <h1 className="font-serif display-2">Администрирование</h1>

      {/* Dashboard */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats
          ? (
            <>
              <Stat label="Пользователи" value={stats.users} />
              <Stat label="Поездки" value={stats.trips} />
              <Stat label="Опубликовано" value={stats.publishedTrips} />
              <Stat label="Участий в поездках" value={stats.memberships} />
            </>
          )
          : Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>

      {/* Users */}
      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h2 className="mr-auto font-serif text-2xl tracking-tightest">Пользователи</h2>
          <input className={inp} placeholder="Поиск по email/имени" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          <select className={inp} value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); }}>
            <option value="">Все роли</option>
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={load} className="rounded-full border border-ink-line px-4 py-2 text-sm text-paper-dim hover:text-paper">Обновить</button>
        </div>

        {msg && <p className="mb-4 rounded-lg border border-aurora/30 bg-aurora/5 p-3 text-sm text-aurora">{msg}</p>}

        <div className="overflow-x-auto rounded-2xl border border-ink-line">
          <table className="w-full text-sm">
            <thead className="text-paper-faint">
              <tr className="border-b border-ink-line text-left">
                <th className="p-3">Email</th><th className="p-3">Имя</th><th className="p-3">Роль</th>
                <th className="p-3">Статус</th><th className="p-3">Email ✓</th><th className="p-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-ink-line/60">
                  <td className="p-3 text-paper">{u.email}</td>
                  <td className="p-3 text-paper-dim">{u.name || '—'}</td>
                  <td className="p-3">
                    {isSuper ? (
                      <select className="rounded border border-ink-line bg-ink px-2 py-1" value={u.role}
                        onChange={(e) => act(() => admin.setRole(u.id, e.target.value as Role), 'Роль обновлена')}>
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    ) : <span className="text-paper-dim">{u.role}</span>}
                  </td>
                  <td className="p-3">
                    <span className={u.status === 'BLOCKED' ? 'text-red-300' : 'text-emerald-300'}>{u.status}</span>
                  </td>
                  <td className="p-3">{u.emailVerified ? '✓' : '—'}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      {u.status === 'ACTIVE'
                        ? <Btn onClick={() => act(() => admin.block(u.id), 'Заблокирован')}>Блок</Btn>
                        : <Btn onClick={() => act(() => admin.unblock(u.id), 'Разблокирован')}>Разблок</Btn>}
                      {!u.emailVerified && <Btn onClick={() => act(() => admin.verify(u.id), 'Email подтверждён')}>Подтвердить</Btn>}
                      <Btn onClick={() => act(async () => { const r = await admin.resetPassword(u.id); setMsg(`Временный пароль: ${r.tempPassword}`); })}>Сброс пароля</Btn>
                      {isSuper && <Btn danger onClick={() => confirm(`Удалить ${u.email}?`) && act(() => admin.remove(u.id), 'Удалён')}>Удалить</Btn>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isSuper && <p className="mt-3 text-xs text-paper-faint">Смена ролей и удаление доступны только Super Admin.</p>}
      </section>

      {/* Audit */}
      <section className="mt-12">
        <h2 className="mb-5 font-serif text-2xl tracking-tightest">Журнал действий</h2>
        <div className="overflow-x-auto rounded-2xl border border-ink-line">
          <table className="w-full text-sm">
            <thead className="text-paper-faint">
              <tr className="border-b border-ink-line text-left">
                <th className="p-3">Время</th><th className="p-3">Кто</th><th className="p-3">Действие</th><th className="p-3">Объект</th><th className="p-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id} className="border-b border-ink-line/60">
                  <td className="p-3 text-paper-faint">{new Date(a.createdAt).toLocaleString('ru-RU')}</td>
                  <td className="p-3 text-paper-dim">{a.user?.email ?? '—'}</td>
                  <td className="p-3 text-paper">{a.action}</td>
                  <td className="p-3 text-paper-dim">{a.objectType ? `${a.objectType}:${(a.objectId ?? '').slice(0, 8)}` : '—'}</td>
                  <td className="p-3 text-paper-faint">{a.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

const inp = 'rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60';
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-5">
      <div className="font-serif text-4xl text-aurora">{value}</div>
      <div className="mt-1 text-sm text-paper-faint">{label}</div>
    </div>
  );
}
function Btn({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`rounded-full border px-3 py-1 text-xs transition-colors ${danger ? 'border-red-400/30 text-red-300 hover:bg-red-400/10' : 'border-ink-line text-paper-dim hover:text-paper'}`}>
      {children}
    </button>
  );
}
