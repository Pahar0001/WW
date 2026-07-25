'use client';

/**
 * AdminDashboard — «пульт» платформы: живые метрики, динамика за 30 дней
 * (SVG-графики без сторонних библиотек, в фирменном стиле), онлайн-статусы
 * пользователей и мониторинг систем/интеграций.
 */

import { useEffect, useState } from 'react';
import { adminStats, type AdminStats } from '@/lib/api';

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

/** SVG-бар-чарт дневного ряда: тонкие золотые столбики + подпись максимума. */
function BarChart({ data, label }: { data: { day: string; count: number }[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const total = data.reduce((a, d) => a + d.count, 0);
  const W = 300;
  const H = 72;
  const bw = W / data.length;
  return (
    <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-5">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-[0.2em] text-paper-faint">{label}</span>
        <span className="text-sm text-paper">
          {fmt(total)} <span className="text-paper-faint">за 30 дней</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-[72px] w-full" preserveAspectRatio="none">
        {data.map((d, i) => {
          const h = (d.count / max) * (H - 6);
          return (
            <rect
              key={d.day}
              x={i * bw + 1}
              y={H - h}
              width={Math.max(1, bw - 2)}
              height={Math.max(d.count > 0 ? 2 : 0.5, h)}
              rx={1}
              className={d.count > 0 ? 'fill-aurora/80' : 'fill-ink-line'}
            >
              <title>{`${d.day}: ${d.count}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-paper-faint">
        <span>{data[0]?.day.slice(5)}</span>
        <span>макс {max}/день</span>
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
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-5">
      <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">{label}</div>
      <div className={`mt-2 font-serif text-3xl tracking-tightest ${accent ? 'text-aurora' : 'text-paper'}`}>
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-paper-faint">{hint}</div>}
    </div>
  );
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

export function AdminDashboard() {
  const [s, setS] = useState<AdminStats | null>(null);

  // Автообновление раз в 60с — дашборд «живой» без ручного рефреша.
  useEffect(() => {
    let alive = true;
    const load = () => adminStats().then((d) => alive && d && setS(d));
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

  return (
    <div className="mt-10 space-y-8">
      {/* Сводные метрики */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Пользователи"
          value={fmt(s.users.total)}
          hint={`онлайн: ${s.users.online} · за сутки: ${s.users.activeDay} · +${s.users.newWeek} за 7 дн`}
          accent
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
          accent={s.orders.new > 0}
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
          <BarChart data={s.series.registrations} label="Регистрации" />
          <BarChart data={s.series.trips} label="Созданные поездки" />
          <BarChart data={s.series.orders} label="Заявки под ключ" />
          <BarChart data={s.series.ratings} label="Оценки маршрутов" />
          <BarChart data={s.series.posts} label="Посты в ленте" />
        </div>
      </div>

      {/* Система и интеграции */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">Система</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-paper-faint">Аптайм API:</span> <span className="text-paper">{uptime}</span></div>
            <div><span className="text-paper-faint">Память:</span> <span className="text-paper">{s.system.rssMb} МБ</span></div>
            <div><span className="text-paper-faint">Node:</span> <span className="text-paper">{s.system.node}</span></div>
            <div><span className="text-paper-faint">Файлы в БД:</span> <span className="text-paper">{fmt(s.uploads.count)} ({uploadsMb} МБ)</span></div>
            <div><span className="text-paper-faint">Поддержка:</span> <span className="text-paper">{fmt(s.social.supportMessages)} сообщ.</span></div>
          </div>
        </div>
        <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-5">
          <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">Интеграции</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip ok={s.system.integrations.groq} label="Groq (ИИ)" />
            <Chip ok={s.system.integrations.travelpayouts} label="Aviasales (цены)" />
            <Chip ok={s.system.integrations.marker} label="Партнёрский marker" />
            <Chip ok={s.system.integrations.resend} label="Resend (email)" />
            <Chip ok={s.system.integrations.s3} label="S3-хранилище" />
          </div>
          <p className="mt-3 text-xs text-paper-faint">
            Жёлтый — переменная окружения не задана: функция работает в фолбэке
            или отключена. Настраивается в Render → Environment.
          </p>
        </div>
      </div>

      {/* Последние пользователи с онлайн-статусом */}
      <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-5">
        <div className="flex items-baseline justify-between">
          <div className="text-xs uppercase tracking-[0.2em] text-paper-faint">Новые пользователи</div>
          <a href="/admin/users" className="text-sm text-aurora hover:underline">Все пользователи →</a>
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
  );
}
