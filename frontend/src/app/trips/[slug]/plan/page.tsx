'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { auth, type AuthUser } from '@/lib/auth';
import { RoutePath } from '@/components/decor/TravelDecor';
import {
  planning, uploadFile,
  type PlanningOverview, type Ticket, type TripDocument, type CalendarEvent, type TicketKind, type EventType,
  type Hotel, type ChatMessage, type Member, type Album, type Memory, type TimelineItem,
} from '@/lib/planning';

const inp = 'w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60';
const btn = 'rounded-full bg-paper px-5 py-2 text-sm font-medium text-ink hover:scale-[1.02] transition-transform disabled:opacity-50';
const ghost = 'rounded-full border border-ink-line px-4 py-2 text-sm text-paper-dim hover:text-paper';

const KIND_RU: Record<TicketKind, string> = { FLIGHT: 'Авиа', TRAIN: 'Поезд', BUS: 'Автобус', FERRY: 'Паром', OTHER: 'Другое' };
const EVENT_RU: Record<EventType, string> = {
  FLIGHT: 'Перелёт', HOTEL_CHECKIN: 'Заселение', HOTEL_CHECKOUT: 'Выезд',
  EXCURSION: 'Экскурсия', MEETING: 'Встреча', REMINDER: 'Напоминание', OTHER: 'Другое',
};
const fmtDT = (s?: string | null) => (s ? new Date(s).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const toISO = (local: string) => (local ? new Date(local).toISOString() : '');

export default function PlanPage() {
  const slug = String(useParams().slug);
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [data, setData] = useState<PlanningOverview | null>(null);
  const [tab, setTab] = useState<'tickets' | 'documents' | 'calendar' | 'hotels' | 'members' | 'memories' | 'chat'>('tickets');
  const [err, setErr] = useState<string | null>(null);

  const canEdit = !!me && ['ORGANIZER', 'ADMIN', 'SUPER_ADMIN'].includes(me.role);
  const load = () => planning.overview(slug).then(setData).catch((e) => setErr(e.message));

  useEffect(() => {
    auth.me().then((u) => {
      if (!u) { window.location.href = '/login'; return; }
      setMe(u);
      load();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (me === undefined) return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Загрузка…</main>;

  return (
    <main className="container-vela relative min-h-screen py-10">
      <RoutePath className="pointer-events-none absolute right-0 top-16 hidden w-80 text-aurora/25 lg:block" />
      <header className="relative mb-8 flex items-center justify-between">
        <Link href={`/trips/${slug}`} className="text-sm text-paper-dim hover:text-paper">← К поездке</Link>
        <span className="text-sm text-paper-faint">{me?.email}{!canEdit && ' · только просмотр'}</span>
      </header>

      <h1 className="relative font-serif text-4xl tracking-tightest">Планирование поездки</h1>
      <p className="mt-2 text-paper-dim">Билеты, документы и календарь событий с напоминаниями.</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {([['tickets', 'Билеты'], ['hotels', 'Отели'], ['documents', 'Документы'], ['calendar', 'Календарь'], ['members', 'Участники'], ['memories', 'Воспоминания'], ['chat', 'Чат']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-full px-5 py-2 text-sm transition-colors ${tab === t ? 'bg-aurora text-aurora-fg' : 'border border-ink-line text-paper-dim hover:text-paper'}`}>
            {label}
          </button>
        ))}
      </div>

      {err && <p className="mt-4 text-sm text-red-300">{err}</p>}

      <div className="mt-8">
        {tab === 'tickets' && <Tickets slug={slug} tickets={data?.tickets ?? []} canEdit={canEdit} onChange={load} />}
        {tab === 'hotels' && <Hotels slug={slug} hotels={data?.hotels ?? []} canEdit={canEdit} onChange={load} />}
        {tab === 'documents' && <Documents slug={slug} docs={data?.documents ?? []} canEdit={canEdit} onChange={load} />}
        {tab === 'calendar' && <Calendar slug={slug} events={data?.events ?? []} canEdit={canEdit} onChange={load} />}
        {tab === 'members' && <Members slug={slug} canEdit={canEdit} />}
        {tab === 'memories' && <Memories slug={slug} canEdit={canEdit} />}
        {tab === 'chat' && <Chat slug={slug} meId={me?.id} />}
      </div>
    </main>
  );
}

// ── Tickets ──────────────────────────────────────────────
function Tickets({ slug, tickets, canEdit, onChange }: { slug: string; tickets: Ticket[]; canEdit: boolean; onChange: () => void }) {
  const [f, setF] = useState({ kind: 'FLIGHT' as TicketKind, carrier: '', code: '', fromLocation: '', toLocation: '', departAt: '', arriveAt: '', seat: '', notes: '', fileUrl: '' });
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));

  async function add() {
    setBusy(true);
    try {
      await planning.createTicket(slug, { ...f, departAt: toISO(f.departAt) || undefined, arriveAt: toISO(f.arriveAt) || undefined });
      setF({ kind: 'FLIGHT', carrier: '', code: '', fromLocation: '', toLocation: '', departAt: '', arriveAt: '', seat: '', notes: '', fileUrl: '' });
      onChange();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {tickets.length === 0 && <p className="text-paper-faint">Билетов пока нет.</p>}
      <div className="grid gap-3">
        {tickets.map((t) => (
          <div key={t.id} className="rounded-xl border border-ink-line p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.2em] text-aurora">{KIND_RU[t.kind]}{t.code ? ` · ${t.code}` : ''}</span>
              {canEdit && <button onClick={() => planning.deleteTicket(t.id).then(onChange)} className="text-xs text-paper-faint hover:text-red-300">Удалить</button>}
            </div>
            <div className="mt-2 text-paper">{t.carrier || '—'} · {t.fromLocation || '?'} → {t.toLocation || '?'}</div>
            <div className="mt-1 text-sm text-paper-dim">Вылет: {fmtDT(t.departAt)} · Прибытие: {fmtDT(t.arriveAt)}{t.seat ? ` · место ${t.seat}` : ''}</div>
            {t.fileUrl && <a href={fileHref(t.fileUrl)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-aurora hover:underline">Открыть PDF →</a>}
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="rounded-xl border border-ink-line bg-ink-soft/40 p-5">
          <h3 className="mb-3 font-serif text-xl tracking-tightest">Добавить билет</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <select className={inp} value={f.kind} onChange={(e) => set({ kind: e.target.value as TicketKind })}>
              {Object.entries(KIND_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className={inp} placeholder="Перевозчик" value={f.carrier} onChange={(e) => set({ carrier: e.target.value })} />
            <input className={inp} placeholder="Номер рейса/поезда" value={f.code} onChange={(e) => set({ code: e.target.value })} />
            <input className={inp} placeholder="Место (опц.)" value={f.seat} onChange={(e) => set({ seat: e.target.value })} />
            <input className={inp} placeholder="Откуда" value={f.fromLocation} onChange={(e) => set({ fromLocation: e.target.value })} />
            <input className={inp} placeholder="Куда" value={f.toLocation} onChange={(e) => set({ toLocation: e.target.value })} />
            <label className="text-sm text-paper-faint">Вылет<input type="datetime-local" className={inp} value={f.departAt} onChange={(e) => set({ departAt: e.target.value })} /></label>
            <label className="text-sm text-paper-faint">Прибытие<input type="datetime-local" className={inp} value={f.arriveAt} onChange={(e) => set({ arriveAt: e.target.value })} /></label>
          </div>
          <FileField label="PDF билета" value={f.fileUrl} onUploaded={(url) => set({ fileUrl: url })} />
          <button disabled={busy} onClick={add} className={`${btn} mt-4`}>{busy ? 'Сохранение…' : 'Добавить билет'}</button>
        </div>
      )}
    </div>
  );
}

// ── Documents ────────────────────────────────────────────
function Documents({ slug, docs, canEdit, onChange }: { slug: string; docs: TripDocument[]; canEdit: boolean; onChange: () => void }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [mime, setMime] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title || !fileUrl) return;
    setBusy(true);
    try {
      await planning.createDocument(slug, { title, category: category || undefined, fileUrl, mime: mime || undefined });
      setTitle(''); setCategory(''); setFileUrl(''); setMime('');
      onChange();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {docs.length === 0 && <p className="text-paper-faint">Документов пока нет.</p>}
      <div className="grid gap-3">
        {docs.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-xl border border-ink-line p-4">
            <div>
              <div className="text-paper">{d.title}</div>
              <div className="text-xs text-paper-faint">{d.category || 'без категории'} · {new Date(d.createdAt).toLocaleDateString('ru-RU')}</div>
            </div>
            <div className="flex items-center gap-3">
              <a href={fileHref(d.fileUrl)} target="_blank" rel="noopener noreferrer" className="text-sm text-aurora hover:underline">Скачать</a>
              {canEdit && <button onClick={() => planning.deleteDocument(d.id).then(onChange)} className="text-xs text-paper-faint hover:text-red-300">Удалить</button>}
            </div>
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="rounded-xl border border-ink-line bg-ink-soft/40 p-5">
          <h3 className="mb-3 font-serif text-xl tracking-tightest">Загрузить документ</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <input className={inp} placeholder="Название" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className={inp} placeholder="Категория (виза, страховка…)" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <FileField label="Файл (PDF/изображение)" value={fileUrl} onUploaded={(url, m) => { setFileUrl(url); setMime(m); }} />
          <button disabled={busy || !title || !fileUrl} onClick={add} className={`${btn} mt-4`}>{busy ? 'Загрузка…' : 'Добавить документ'}</button>
        </div>
      )}
    </div>
  );
}

// ── Calendar ─────────────────────────────────────────────
const REMINDER_PRESETS = [
  { label: 'за 1 час', m: 60 },
  { label: 'за 1 день', m: 1440 },
  { label: 'за 1 неделю', m: 10080 },
];

function Calendar({ slug, events, canEdit, onChange }: { slug: string; events: CalendarEvent[]; canEdit: boolean; onChange: () => void }) {
  const [view, setView] = useState<'list' | 'month'>('list');
  const [f, setF] = useState({ type: 'EXCURSION' as EventType, title: '', startAt: '', endAt: '', location: '', notes: '' });
  const [reminders, setReminders] = useState<number[]>([]);
  const [customMin, setCustomMin] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const k = new Date(e.startAt).toLocaleDateString('ru-RU');
      (map.get(k) ?? map.set(k, []).get(k)!).push(e);
    }
    return [...map.entries()];
  }, [events]);

  async function add() {
    if (!f.title || !f.startAt) return;
    setBusy(true);
    try {
      const rs = [...reminders];
      if (customMin && Number(customMin) > 0) rs.push(Number(customMin));
      await planning.createEvent(slug, { ...f, startAt: toISO(f.startAt), endAt: toISO(f.endAt) || undefined, reminders: rs });
      setF({ type: 'EXCURSION', title: '', startAt: '', endAt: '', location: '', notes: '' });
      setReminders([]); setCustomMin('');
      onChange();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setView('list')} className={view === 'list' ? btn : ghost}>По дням</button>
        <button onClick={() => setView('month')} className={view === 'month' ? btn : ghost}>Месяц</button>
      </div>

      {view === 'month' ? (
        <MonthGrid events={events} />
      ) : (
        <div className="space-y-5">
          {byDay.length === 0 && <p className="text-paper-faint">Событий пока нет.</p>}
          {byDay.map(([day, evs]) => (
            <div key={day}>
              <div className="mb-2 text-sm uppercase tracking-[0.2em] text-paper-faint">{day}</div>
              <div className="space-y-2">
                {evs.map((e) => (
                  <div key={e.id} className="flex items-start justify-between rounded-xl border border-ink-line p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-aurora/10 px-2 py-0.5 text-xs text-aurora">{EVENT_RU[e.type]}</span>
                        <span className="text-paper">{e.title}</span>
                      </div>
                      <div className="mt-1 text-sm text-paper-dim">{fmtDT(e.startAt)}{e.endAt ? ` – ${fmtDT(e.endAt)}` : ''}{e.location ? ` · ${e.location}` : ''}</div>
                      {e.reminders.length > 0 && <div className="mt-1 text-xs text-paper-faint">🔔 напоминаний: {e.reminders.length}</div>}
                    </div>
                    {canEdit && <button onClick={() => planning.deleteEvent(e.id).then(onChange)} className="text-xs text-paper-faint hover:text-red-300">Удалить</button>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="rounded-xl border border-ink-line bg-ink-soft/40 p-5">
          <h3 className="mb-3 font-serif text-xl tracking-tightest">Добавить событие</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <select className={inp} value={f.type} onChange={(e) => set({ type: e.target.value as EventType })}>
              {Object.entries(EVENT_RU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input className={inp} placeholder="Название" value={f.title} onChange={(e) => set({ title: e.target.value })} />
            <label className="text-sm text-paper-faint">Начало<input type="datetime-local" className={inp} value={f.startAt} onChange={(e) => set({ startAt: e.target.value })} /></label>
            <label className="text-sm text-paper-faint">Конец (опц.)<input type="datetime-local" className={inp} value={f.endAt} onChange={(e) => set({ endAt: e.target.value })} /></label>
            <input className={inp} placeholder="Место" value={f.location} onChange={(e) => set({ location: e.target.value })} />
            <input className={inp} placeholder="Заметки" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
          <div className="mt-3">
            <div className="mb-2 text-sm text-paper-faint">Напоминания:</div>
            <div className="flex flex-wrap items-center gap-2">
              {REMINDER_PRESETS.map((p) => (
                <button key={p.m} type="button"
                  onClick={() => setReminders((r) => r.includes(p.m) ? r.filter((x) => x !== p.m) : [...r, p.m])}
                  className={`rounded-full border px-3 py-1 text-sm ${reminders.includes(p.m) ? 'border-aurora text-aurora' : 'border-ink-line text-paper-dim'}`}>
                  {p.label}
                </button>
              ))}
              <input className={`${inp} w-40`} placeholder="свои минуты" value={customMin} onChange={(e) => setCustomMin(e.target.value)} />
            </div>
          </div>
          <button disabled={busy || !f.title || !f.startAt} onClick={add} className={`${btn} mt-4`}>{busy ? 'Сохранение…' : 'Добавить событие'}</button>
        </div>
      )}
    </div>
  );
}

function MonthGrid({ events }: { events: CalendarEvent[] }) {
  const now = new Date();
  const [y, m] = [now.getFullYear(), now.getMonth()];
  const first = new Date(y, m, 1);
  const startDow = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(y, m + 1, 0).getDate();
  const counts = new Map<number, number>();
  for (const e of events) {
    const d = new Date(e.startAt);
    if (d.getFullYear() === y && d.getMonth() === m) counts.set(d.getDate(), (counts.get(d.getDate()) ?? 0) + 1);
  }
  const cells: (number | null)[] = [...Array(startDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <div>
      <div className="mb-3 text-sm text-paper-faint">{first.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}</div>
      <div className="grid grid-cols-7 gap-1.5">
        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((d) => <div key={d} className="p-2 text-center text-xs text-paper-faint">{d}</div>)}
        {cells.map((c, i) => (
          <div key={i} className={`min-h-[64px] rounded-lg border p-2 text-sm ${c ? 'border-ink-line' : 'border-transparent'}`}>
            {c && <div className="text-paper-dim">{c}</div>}
            {c && counts.get(c) && <div className="mt-1 inline-block rounded-full bg-aurora/15 px-2 text-xs text-aurora">{counts.get(c)} соб.</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Hotels ───────────────────────────────────────────────
function Hotels({ slug, hotels, canEdit, onChange }: { slug: string; hotels: Hotel[]; canEdit: boolean; onChange: () => void }) {
  const [f, setF] = useState({ name: '', cityLabel: '', address: '', lat: '', lng: '', checkIn: '', checkOut: '', url: '', area: '', priceNote: '', notes: '', photoUrl: '' });
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));

  async function add() {
    if (!f.name) return;
    setBusy(true);
    try {
      await planning.createHotel(slug, {
        name: f.name, cityLabel: f.cityLabel || undefined, address: f.address || undefined,
        lat: f.lat ? Number(f.lat) : undefined, lng: f.lng ? Number(f.lng) : undefined,
        checkIn: f.checkIn ? new Date(f.checkIn).toISOString() : undefined,
        checkOut: f.checkOut ? new Date(f.checkOut).toISOString() : undefined,
        url: f.url || undefined, area: f.area || undefined, priceNote: f.priceNote || undefined,
        notes: f.notes || undefined, photoUrl: f.photoUrl || undefined,
      } as Partial<Hotel>);
      setF({ name: '', cityLabel: '', address: '', lat: '', lng: '', checkIn: '', checkOut: '', url: '', area: '', priceNote: '', notes: '', photoUrl: '' });
      onChange();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {hotels.length === 0 && <p className="text-paper-faint">Отелей пока нет.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {hotels.map((h) => (
          <div key={h.id} className="overflow-hidden rounded-xl border border-ink-line">
            {h.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={h.photoUrl} alt={h.name} className="h-32 w-full object-cover" />
            )}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="text-paper">{h.name}</div>
                {canEdit && <button onClick={() => planning.deleteHotel(h.id).then(onChange)} className="text-xs text-paper-faint hover:text-red-300">Удалить</button>}
              </div>
              {h.cityLabel && <div className="text-xs text-paper-faint">{h.cityLabel}</div>}
              {h.address && <div className="mt-1 text-sm text-paper-dim">{h.address}</div>}
              <div className="mt-1 text-sm text-paper-dim">
                {h.checkIn ? `Заезд: ${fmtDT(h.checkIn)}` : ''}{h.checkOut ? ` · Выезд: ${fmtDT(h.checkOut)}` : ''}
              </div>
              {h.priceNote && <div className="mt-1 text-sm text-paper">{h.priceNote}</div>}
              {h.url && <a href={h.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-aurora hover:underline">Бронирование →</a>}
            </div>
          </div>
        ))}
      </div>

      {canEdit && (
        <div className="rounded-xl border border-ink-line bg-ink-soft/40 p-5">
          <h3 className="mb-3 font-serif text-xl tracking-tightest">Добавить отель</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <input className={inp} placeholder="Название" value={f.name} onChange={(e) => set({ name: e.target.value })} />
            <input className={inp} placeholder="Город" value={f.cityLabel} onChange={(e) => set({ cityLabel: e.target.value })} />
            <input className={inp} placeholder="Адрес" value={f.address} onChange={(e) => set({ address: e.target.value })} />
            <input className={inp} placeholder="Ссылка на бронирование" value={f.url} onChange={(e) => set({ url: e.target.value })} />
            <input className={inp} placeholder="Широта (lat)" value={f.lat} onChange={(e) => set({ lat: e.target.value })} />
            <input className={inp} placeholder="Долгота (lng)" value={f.lng} onChange={(e) => set({ lng: e.target.value })} />
            <label className="text-sm text-paper-faint">Заезд<input type="date" className={inp} value={f.checkIn} onChange={(e) => set({ checkIn: e.target.value })} /></label>
            <label className="text-sm text-paper-faint">Выезд<input type="date" className={inp} value={f.checkOut} onChange={(e) => set({ checkOut: e.target.value })} /></label>
            <input className={inp} placeholder="Цена (опц.)" value={f.priceNote} onChange={(e) => set({ priceNote: e.target.value })} />
            <input className={inp} placeholder="Заметки" value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
          <FileField label="Фото отеля" value={f.photoUrl} onUploaded={(url) => set({ photoUrl: url })} />
          <button disabled={busy || !f.name} onClick={add} className={`${btn} mt-4`}>{busy ? 'Сохранение…' : 'Добавить отель'}</button>
        </div>
      )}
    </div>
  );
}

// ── Chat (HTTP polling) ──────────────────────────────────
function Chat({ slug, meId }: { slug: string; meId?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let stop = false;
    let last = '';
    const tick = async () => {
      try {
        const batch = await planning.chat(slug, last || undefined);
        if (!stop && batch.length) {
          last = batch[batch.length - 1].createdAt;
          setMessages((m) => [...m, ...batch]);
        }
      } catch { /* ignore (cold start etc.) */ }
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => { stop = true; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const msg = await planning.postChat(slug, text.trim());
      setMessages((m) => [...m, msg]);
      setText('');
    } finally { setSending(false); }
  }

  return (
    <div className="flex h-[60vh] flex-col rounded-2xl border border-ink-line bg-ink-soft/40">
      <div className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.length === 0 && <p className="text-paper-faint">Сообщений пока нет. Напишите первое 👋</p>}
        {messages.map((m) => {
          const mine = m.user.id === meId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 ${mine ? 'bg-aurora/15 text-paper' : 'bg-ink border border-ink-line text-paper'}`}>
                <div className="text-xs text-paper-faint">{m.user.name || m.user.email} · {new Date(m.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="mt-0.5 whitespace-pre-wrap">{m.text}</div>
              </div>
            </div>
          );
        })}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-ink-line p-3">
        <input className={`${inp} flex-1`} placeholder="Сообщение…" value={text} onChange={(e) => setText(e.target.value)} />
        <button disabled={sending || !text.trim()} className={btn}>Отправить</button>
      </form>
    </div>
  );
}

// ── Members (invite by email) ────────────────────────────
function Members({ slug, canEdit }: { slug: string; canEdit: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = () => planning.members(slug).then(setMembers).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  async function invite() {
    if (!email) return;
    setBusy(true); setMsg(null);
    try {
      const r = await planning.invite(slug, email);
      setMsg(r.invited ? `Приглашение отправлено: ${email} (письмо со ссылкой на установку пароля)` : `Добавлен: ${email}`);
      setEmail(''); load();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="rounded-xl border border-ink-line bg-ink-soft/40 p-5">
          <h3 className="mb-3 font-serif text-xl tracking-tightest">Добавить участника по email</h3>
          <div className="flex flex-wrap gap-2">
            <input className={`${inp} flex-1`} type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button disabled={busy || !email} onClick={invite} className={btn}>{busy ? '…' : 'Пригласить'}</button>
          </div>
          {msg && <p className="mt-3 text-sm text-aurora">{msg}</p>}
        </div>
      )}
      <div className="grid gap-2">
        {members.length === 0 && <p className="text-paper-faint">Участников пока нет.</p>}
        {members.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-line p-4">
            <div>
              <div className="text-paper">{m.user.name || m.user.email}</div>
              <div className="text-xs text-paper-faint">{m.user.email}{!canEdit && ` · роль: ${m.role === 'ORGANIZER' ? 'Организатор' : 'Участник'}`}</div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <select
                  value={m.role}
                  onChange={(e) => planning.setMemberRole(slug, m.user.id, e.target.value as 'ORGANIZER' | 'MEMBER').then(load)}
                  className="rounded-lg border border-ink-line bg-ink px-3 py-1.5 text-sm text-paper outline-none focus:border-aurora/60"
                >
                  <option value="MEMBER">Участник</option>
                  <option value="ORGANIZER">Организатор</option>
                </select>
                <button onClick={() => planning.removeMember(slug, m.user.id).then(load)} className="text-xs text-paper-faint hover:text-red-300">Убрать</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Memories: albums, diary, timeline ────────────────────
function Memories({ slug, canEdit }: { slug: string; canEdit: boolean }) {
  const [section, setSection] = useState<'albums' | 'diary' | 'timeline'>('albums');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const load = () => {
    planning.memories(slug).then((o) => { setAlbums(o.albums); setMemories(o.memories); }).catch(() => {});
    planning.timeline(slug).then(setTimeline).catch(() => {});
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  const [albumTitle, setAlbumTitle] = useState('');
  const [mem, setMem] = useState({ title: '', text: '', date: '', location: '' });
  const [memPhotos, setMemPhotos] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        {([['albums', 'Альбомы'], ['diary', 'Дневник'], ['timeline', 'Лента']] as const).map(([s, l]) => (
          <button key={s} onClick={() => setSection(s)} className={section === s ? btn : ghost}>{l}</button>
        ))}
      </div>

      {section === 'albums' && (
        <div className="space-y-5">
          {canEdit && (
            <div className="flex gap-2">
              <input className={`${inp} flex-1`} placeholder="Название альбома" value={albumTitle} onChange={(e) => setAlbumTitle(e.target.value)} />
              <button className={btn} disabled={!albumTitle} onClick={() => planning.createAlbum(slug, albumTitle).then(() => { setAlbumTitle(''); load(); })}>Создать альбом</button>
            </div>
          )}
          {albums.length === 0 && <p className="text-paper-faint">Альбомов пока нет.</p>}
          {albums.map((a) => (
            <div key={a.id} className="rounded-xl border border-ink-line p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-serif text-lg tracking-tightest">{a.title}</span>
                {canEdit && <button onClick={() => planning.deleteAlbum(a.id).then(load)} className="text-xs text-paper-faint hover:text-red-300">Удалить</button>}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {a.photos.map((p) => (
                  <div key={p.id} className="group relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={p.caption ?? ''} className="aspect-square w-full rounded-lg object-cover" />
                    {canEdit && <button onClick={() => planning.deletePhoto(p.id).then(load)} className="absolute right-1 top-1 hidden rounded bg-ink/70 px-1 text-xs text-red-300 group-hover:block">✕</button>}
                  </div>
                ))}
                <AlbumUpload albumId={a.id} onDone={load} />
              </div>
            </div>
          ))}
        </div>
      )}

      {section === 'diary' && (
        <div className="space-y-5">
          {canEdit && (
            <div className="rounded-xl border border-ink-line bg-ink-soft/40 p-5">
              <h3 className="mb-3 font-serif text-xl tracking-tightest">Новая запись</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <input className={inp} placeholder="Заголовок" value={mem.title} onChange={(e) => setMem({ ...mem, title: e.target.value })} />
                <input className={inp} placeholder="Место" value={mem.location} onChange={(e) => setMem({ ...mem, location: e.target.value })} />
                <label className="text-sm text-paper-faint">Дата<input type="date" className={inp} value={mem.date} onChange={(e) => setMem({ ...mem, date: e.target.value })} /></label>
              </div>
              <textarea className={`${inp} mt-3 min-h-[100px]`} placeholder="Текст воспоминания…" value={mem.text} onChange={(e) => setMem({ ...mem, text: e.target.value })} />
              <div className="mt-2"><FileField label="Добавить фото" value={memPhotos[memPhotos.length - 1] ?? ''} onUploaded={(url) => setMemPhotos((p) => [...p, url])} /></div>
              {memPhotos.length > 0 && <p className="mt-1 text-xs text-paper-faint">фото: {memPhotos.length}</p>}
              <button className={`${btn} mt-4`} disabled={!mem.title || !mem.text || !mem.date}
                onClick={() => planning.createMemory(slug, { ...mem, date: new Date(mem.date).toISOString(), photos: memPhotos }).then(() => { setMem({ title: '', text: '', date: '', location: '' }); setMemPhotos([]); load(); })}>
                Сохранить
              </button>
            </div>
          )}
          {memories.length === 0 && <p className="text-paper-faint">Записей пока нет.</p>}
          {memories.map((m) => (
            <div key={m.id} className="rounded-xl border border-ink-line p-5">
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg tracking-tightest">{m.title}</span>
                {canEdit && <button onClick={() => planning.deleteMemory(m.id).then(load)} className="text-xs text-paper-faint hover:text-red-300">Удалить</button>}
              </div>
              <div className="text-xs text-paper-faint">{new Date(m.date).toLocaleDateString('ru-RU')}{m.location ? ` · ${m.location}` : ''}</div>
              <p className="mt-2 whitespace-pre-wrap text-paper-dim">{m.text}</p>
              {m.photos.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {m.photos.map((u, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={u} alt="" className="aspect-square w-full rounded-lg object-cover" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {section === 'timeline' && (
        <div className="space-y-3">
          {timeline.length === 0 && <p className="text-paper-faint">Лента пуста.</p>}
          {timeline.map((it, i) => (
            <div key={i} className="flex gap-4 rounded-xl border border-ink-line p-4">
              <div className="w-28 shrink-0 text-sm text-paper-faint">{new Date(it.date).toLocaleDateString('ru-RU')}</div>
              <div className="flex-1">
                <span className="rounded-full bg-aurora/10 px-2 py-0.5 text-xs text-aurora">
                  {it.kind === 'memory' ? 'Воспоминание' : it.kind === 'photo' ? 'Фото' : 'Событие'}
                </span>
                <div className="mt-1 text-paper">{it.title}</div>
                {it.kind === 'memory' && <p className="mt-1 text-sm text-paper-dim">{it.text}</p>}
                {it.kind === 'photo' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.url} alt="" className="mt-2 h-32 rounded-lg object-cover" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AlbumUpload({ albumId, onDone }: { albumId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const r = await uploadFile(file);
    if (r.ok) await planning.addPhoto(albumId, { url: r.url });
    setBusy(false);
    onDone();
  }
  return (
    <label className="flex aspect-square w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-ink-line text-2xl text-paper-faint hover:text-paper">
      {busy ? '…' : '+'}
      <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
    </label>
  );
}

// ── shared ───────────────────────────────────────────────
function FileField({ label, value, onUploaded }: { label: string; value: string; onUploaded: (url: string, mime: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null); setUploading(true);
    const r = await uploadFile(file);
    setUploading(false);
    if (r.ok) onUploaded(r.url, r.mime); else setErr(r.error);
  }
  return (
    <div className="mt-3">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">{label}</span>
      <label className={`${ghost} cursor-pointer`}>
        {uploading ? 'Загрузка…' : value ? 'Файл загружен ✓ — заменить' : 'Выбрать файл'}
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} disabled={uploading} />
      </label>
      {err && <p className="mt-1 text-xs text-red-300">{err}</p>}
    </div>
  );
}

// Uploaded files are returned as absolute (S3) or relative ("/uploads/..") URLs.
function fileHref(url: string): string {
  return url;
}
