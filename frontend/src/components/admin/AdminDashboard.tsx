'use client';

/**
 * AdminDashboard — «пульт» платформы: живые метрики с трендами, красивая
 * динамика за 30 дней (сглаженные area-графики с золотым градиентом, SVG без
 * библиотек), последние заявки, онлайн-статусы и мониторинг систем.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  adminStats,
  adminListOrders,
  type AdminStats,
  type TripOrder,
} from '@/lib/api';

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);

/** «Был(а) N назад» из ISO-даты; null — «ещё не заходил(а)». */
export function timeAgo(iso?: string | null): string {
  if (!iso) return 'ещё не заходил(а)';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 5) return 'онлайн';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} дн назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}

export const isOnline = (iso?: string | null) =>
  Boolean(iso && Date.now() - new Date(iso).getTime() < 5 * 60 * 1000);

type Series = { day: string; count: number }[];

/** Тренд: сумма последних 7 дней против предыдущих 7. */
function trend(series: Series): { now: number; delta: number } {
  const last7 = series.slice(-7).reduce((a, d) => a + d.count, 0);
  const prev7 = series.slice(-14, -7).reduce((a, d) => a + d.count, 0);
  return { now: last7, delta: last7 - prev7 };
}

function TrendBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs text-paper-faint">— как неделю назад</span>;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${up ? 'text-emerald-300' : 'text-amber-300'}`}>
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: up ? undefined : 'scaleY(-1)' }}>
        <path d="M7 17L17 7M9 7h8v8" />
      </svg>
      {up ? '+' : ''}{delta} к прошлой неделе
    </span>
  );
}

/**
 * Сглаженный area-график: кривая Catmull-Rom → Bezier, золотой градиент,
 * сетка, точка последнего дня. Чистый SVG — в фирменном стиле, без библиотек.
 */
export function AreaChart({ data, label }: { data: Series; label: string }) {
  const W = 320;
  const H = 96;
  const PAD = 6;
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((a, d) => a + d.count, 0);
  const t = trend(data);

  const px = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const py = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const pts = data.map((d, i) => [px(i), py(d.count)] as const);

  // Catmull-Rom → кубические Безье: плавная «дорогая» кривая по точкам.
  let line = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    line += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  const area = `${line} L ${pts[pts.length - 1][0]} ${H - PAD} L ${pts[0][0]} ${H - PAD} Z`;
  const gid = `ag-${label.replace(/\W/g, '')}`;
  const last = pts[pts.length - 1];

  return (
    <div className="card-lux rounded-2xl p-5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs uppercase tracking-[0.2em] text-paper-faint">{label}</span>
        <span className="font-serif text-xl text-paper">{fmt(total)}</span>
      </div>
      <div className="mt-0.5 flex items-baseline justify-between">
        <TrendBadge delta={t.delta} />
        <span className="text-[10px] text-paper-faint">30 дней · пик {max}/день</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-24 w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(38 45% 55%)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="hsl(38 45% 55%)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* сетка */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)} className="stroke-ink-line" strokeWidth="0.5" strokeDasharray="2 4" />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" className="stroke-aurora" strokeWidth="1.6" strokeLinecap="round" />
        {/* точка «сегодня» с пульсом */}
        <circle cx={last[0]} cy={last[1]} r="6" className="fill-aurora/20">
          <animate attributeName="r" values="4;7;4" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle cx={last[0]} cy={last[1]} r="2.6" className="fill-aurora" />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-paper-faint">
        <span>{data[0]?.day.slice(5)}</span>
        <span>{data[data.length - 1]?.day.slice(5)}</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  accent,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
  href?: string;
}) {
  const body = (
    <div className="card-lux h-full rounded-2xl p-5">
      <div className="flex items-baseline justify-between">
        <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">{label}</div>
        {href && <span className="text-xs text-aurora">открыть →</span>}
      </div>
      <div className={`mt-2 font-serif text-3xl tracking-tightest ${accent ? 'text-aurora' : 'text-paper'}`}>
        {value}
      </div>
      {hint && <div className="mt-1.5 text-xs leading-relaxed text-paper-faint">{hint}</div>}
    </div>
  );
  return href ? <Link href={href} className="block">{body}</Link> : body;
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${
        ok ? 'border-emerald-300/40 text-emerald-300' : 'border-amber-300/40 text-amber-300'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald-300' : 'bg-amber-300'}`} />
      {label}
    </span>
  );
}

const ORDER_STATUS_RU: Record<string, { label: string; cls: string }> = {
  NEW: { label: 'новая', cls: 'border-aurora/40 text-aurora' },
  IN_PROGRESS: { label: 'в работе', cls: 'border-sky-300/40 text-sky-300' },
  DONE: { label: 'готово', cls: 'border-emerald-300/40 text-emerald-300' },
  DECLINED: { label: 'отклонена', cls: 'border-red-300/40 text-red-300' },
};

export function AdminDashboard() {
  const [s, setS] = useState<AdminStats | null>(null);
  const [orders, setOrders] = useState<TripOrder[]>([]);

  // Автообновление раз в 60с — дашборд «живой» без ручного рефреша.
  useEffect(() => {
    let alive = true;
    const load = () => {
      adminStats().then((d) => alive && d && setS(d));
      adminListOrders().then((o) => alive && setOrders(o.slice(0, 5)));
    };
    load();
    const id = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!s) return <p className="mt-8 text-sm text-paper-faint">Загружаем метрики…</p>;

  const uptime = `${Math.floor(s.system.uptimeSec / 3600)} ч ${Math.floor((s.system.uptimeSec % 3600) / 60)} мин`;
  const uploadsMb = Math.round(s.uploads.bytes / 1024 / 1024);
  const newOrders = s.orders.new;

  return (
    <div className="mt-10 space-y-10">
      {/* Быстрые действия */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/orders"
          className={`glow-gold inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5 ${
            newOrders > 0 ? 'bg-aurora text-aurora-fg' : 'border border-ink-line text-paper-dim hover:text-paper'
          }`}
        >
          Заявки
          {newOrders > 0 && (
            <span className="inline-grid h-5 min-w-[20px] place-items-center rounded-full bg-ink/20 px-1 text-[11px] font-semibold">
              {newOrders}
            </span>
          )}
        </Link>
        <Link href="/admin/users" className="inline-flex items-center rounded-full border border-ink-line px-5 py-2.5 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper">
          Пользователи
        </Link>
        <Link href="/admin/support" className="inline-flex items-center rounded-full border border-ink-line px-5 py-2.5 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper">
          Поддержка
        </Link>
        <a href="#trips-manage" className="inline-flex items-center rounded-full border border-ink-line px-5 py-2.5 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper">
          Управление поездками ↓
        </a>
      </div>

      {/* Сводные метрики */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Пользователи"
          value={fmt(s.users.total)}
          hint={`онлайн: ${s.users.online} · за сутки: ${s.users.activeDay} · +${s.users.newWeek} за 7 дн`}
          accent
          href="/admin/users"
        />
        <StatCard
          label="Путешествия"
          value={fmt(s.trips.total)}
          hint={`публичных: ${s.trips.published} · приватных: ${s.trips.private} · участий: ${s.trips.memberships}`}
        />
        <StatCard
          label="Заявки под ключ"
          value={fmt(s.orders.new + s.orders.inProgress)}
          hint={`новых: ${s.orders.new} · в работе: ${s.orders.inProgress} · готово: ${s.orders.done}`}
          accent={newOrders > 0}
          href="/admin/orders"
        />
        <StatCard
          label="Соцсеть"
          value={fmt(s.social.posts)}
          hint={`комментариев: ${s.social.comments} · оценок: ${s.social.ratings}${s.social.ratingAvg ? ` (ср. ${s.social.ratingAvg}★)` : ''}`}
        />
      </div>

      {/* Динамика за 30 дней */}
      <div>
        <h3 className="mb-4 font-serif text-2xl tracking-tightest">Динамика за 30 дней</h3>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AreaChart data={s.series.registrations} label="Регистрации" />
          <AreaChart data={s.series.trips} label="Созданные поездки" />
          <AreaChart data={s.series.orders} label="Заявки под ключ" />
          <AreaChart data={s.series.ratings} label="Оценки маршрутов" />
          <AreaChart data={s.series.posts} label="Посты в ленте" />
        </div>
      </div>

      {/* Последние заявки + новые пользователи */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-lux rounded-2xl p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">Последние заявки</div>
            <Link href="/admin/orders" className="text-sm text-aurora hover:underline">Все заявки →</Link>
          </div>
          {orders.length === 0 ? (
            <p className="mt-3 text-sm text-paper-faint">Заявок пока нет.</p>
          ) : (
            <ul className="mt-3 divide-y divide-ink-line">
              {orders.map((o) => {
                const st = ORDER_STATUS_RU[o.status] ?? ORDER_STATUS_RU.NEW;
                return (
                  <li key={o.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-paper">{o.user?.name || o.user?.email}</span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-paper-faint">{o.wish}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="card-lux rounded-2xl p-5">
          <div className="flex items-baseline justify-between">
            <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">Новые пользователи</div>
            <Link href="/admin/users" className="text-sm text-aurora hover:underline">Все пользователи →</Link>
          </div>
          <ul className="mt-3 divide-y divide-ink-line">
            {s.recentUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${isOnline(u.lastSeenAt) ? 'bg-emerald-400' : 'bg-ink-line'}`}
                    title={isOnline(u.lastSeenAt) ? 'онлайн' : 'офлайн'}
                  />
                  <span className="truncate text-paper">{u.name || u.email}</span>
                  {u.name && <span className="hidden truncate text-paper-faint sm:inline">{u.email}</span>}
                </span>
                <span className="shrink-0 text-paper-faint">{timeAgo(u.lastSeenAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Система и интеграции */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-lux rounded-2xl p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">Система</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-paper-faint">Аптайм API:</span> <span className="text-paper">{uptime}</span></div>
            <div><span className="text-paper-faint">Память:</span> <span className="text-paper">{s.system.rssMb} МБ</span></div>
            <div><span className="text-paper-faint">Node:</span> <span className="text-paper">{s.system.node}</span></div>
            <div><span className="text-paper-faint">Файлы в БД:</span> <span className="text-paper">{fmt(s.uploads.count)} ({uploadsMb} МБ)</span></div>
            <div><span className="text-paper-faint">Поддержка:</span> <span className="text-paper">{fmt(s.social.supportMessages)} сообщ.</span></div>
          </div>
        </div>
        <div className="card-lux rounded-2xl p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">Интеграции</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip ok={s.system.integrations.groq} label="Groq (ИИ)" />
            <Chip ok={s.system.integrations.travelpayouts} label="Aviasales (цены)" />
            <Chip ok={s.system.integrations.marker} label="Партнёрский marker" />
            <Chip ok={s.system.integrations.resend} label="Resend (email)" />
            <Chip ok={s.system.integrations.s3} label="S3-хранилище" />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-paper-faint">
            Жёлтый — переменная окружения не задана: функция работает в фолбэке
            или отключена. Настраивается в Render → Environment.
          </p>
        </div>
      </div>
    </div>
  );
}
