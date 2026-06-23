'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { auth, authHeaders, type AuthUser } from '@/lib/auth';
import { updateTrip, uploadImage, imageUrl, type Trip } from '@/lib/api';

const inp = 'w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60';
const btnGhost = 'rounded-full border border-ink-line px-5 py-2 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper';
const CAN_EDIT = ['ORGANIZER', 'ADMIN', 'SUPER_ADMIN'];

interface PlaceForm {
  name: string; nameLocal: string; lat: string; lng: string; description: string;
  photoUrl: string; howToGet: string; tips: string; nearby: string;
}
interface DayForm { title: string; baseCity: string; notes: string; places: PlaceForm[] }
interface HotelForm { cityLabel: string; name: string; url: string; area: string; priceNote: string; photoUrl: string }

const emptyPlace = (): PlaceForm => ({
  name: '', nameLocal: '', lat: '', lng: '', description: '', photoUrl: '', howToGet: '', tips: '', nearby: '',
});
const emptyDay = (): DayForm => ({ title: '', baseCity: '', notes: '', places: [emptyPlace()] });
const emptyHotel = (): HotelForm => ({ cityLabel: '', name: '', url: '', area: '', priceNote: '', photoUrl: '' });

export default function EditTripPage() {
  const slug = String(useParams().slug);
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [f, setF] = useState({
    title: '', subtitle: '', summary: '', longDescription: '', highlights: '',
    bestTime: '', visaNote: '', heroImage: '', seasonLabel: '',
    durationDays: '7', budgetMin: '', budgetMax: '',
    visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE', status: 'PUBLISHED' as 'DRAFT' | 'PUBLISHED' | 'HIDDEN',
  });
  const [days, setDays] = useState<DayForm[]>([]);
  const [hotels, setHotels] = useState<HotelForm[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));

  const setDay = (i: number, patch: Partial<DayForm>) =>
    setDays((ds) => ds.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  const setPlace = (di: number, pi: number, patch: Partial<PlaceForm>) =>
    setDays((ds) =>
      ds.map((d, k) =>
        k === di ? { ...d, places: d.places.map((p, j) => (j === pi ? { ...p, ...patch } : p)) } : d,
      ),
    );
  const setHotel = (i: number, patch: Partial<HotelForm>) =>
    setHotels((hs) => hs.map((h, k) => (k === i ? { ...h, ...patch } : h)));

  useEffect(() => {
    auth.me().then((u) => {
      if (!u || !CAN_EDIT.includes(u.role)) { window.location.href = '/login'; return; }
      setMe(u);
      fetch(`/api/trips/${slug}`, { headers: authHeaders(), cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((t: Trip | null) => {
          if (!t) { setMsg('Не удалось загрузить поездку'); return; }
          setTrip(t);
          setF({
            title: t.title ?? '', subtitle: t.subtitle ?? '', summary: t.summary ?? '',
            longDescription: t.longDescription ?? '', highlights: (t.highlights ?? []).join('\n'),
            bestTime: t.bestTime ?? '', visaNote: t.visaNote ?? '', heroImage: t.heroImage ?? '',
            seasonLabel: t.seasonLabel ?? '', durationDays: String(t.durationDays ?? 7),
            budgetMin: t.budgetMinRub ? String(t.budgetMinRub) : '', budgetMax: t.budgetMaxRub ? String(t.budgetMaxRub) : '',
            visibility: (t as any).visibility ?? 'PUBLIC', status: (t as any).status ?? 'PUBLISHED',
          });
          // Load the itinerary (first variant) into the editable form.
          const variantDays = t.variants?.[0]?.days ?? [];
          setDays(
            variantDays.map((d) => ({
              title: d.title ?? '', baseCity: d.baseCity ?? '', notes: '',
              places: d.places.map(({ place: p }) => ({
                name: p.name ?? '', nameLocal: p.nameLocal ?? '',
                lat: p.lat != null ? String(p.lat) : '', lng: p.lng != null ? String(p.lng) : '',
                description: p.description ?? '', photoUrl: p.photoUrl ?? '',
                howToGet: p.howToGet ?? '', tips: p.tips ?? '', nearby: p.nearby ?? '',
              })),
            })),
          );
          setHotels(
            (t.hotels ?? []).map((h) => ({
              cityLabel: h.cityLabel ?? '', name: h.name ?? '', url: h.url ?? '',
              area: h.area ?? '', priceNote: h.priceNote ?? '', photoUrl: h.photoUrl ?? '',
            })),
          );
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setBusy(true); setMsg(null);
    const res = await updateTrip(slug, {
      title: f.title, subtitle: f.subtitle, summary: f.summary, longDescription: f.longDescription,
      highlights: f.highlights.split('\n').map((s) => s.trim()).filter(Boolean),
      bestTime: f.bestTime, visaNote: f.visaNote, heroImage: f.heroImage || undefined,
      visibility: f.visibility, status: f.status, seasonLabel: f.seasonLabel,
      durationDays: Number(f.durationDays) || 1,
      budgetMinRub: f.budgetMin ? Number(f.budgetMin) : null,
      budgetMaxRub: f.budgetMax ? Number(f.budgetMax) : null,
      days: days.map((d) => ({
        title: d.title || undefined,
        baseCity: d.baseCity || undefined,
        notes: d.notes || undefined,
        places: d.places
          .filter((p) => p.name.trim())
          .map((p) => ({
            name: p.name.trim(),
            nameLocal: p.nameLocal || undefined,
            lat: p.lat ? Number(p.lat) : undefined,
            lng: p.lng ? Number(p.lng) : undefined,
            description: p.description || undefined,
            photoUrl: p.photoUrl || undefined,
            howToGet: p.howToGet || undefined,
            tips: p.tips || undefined,
            nearby: p.nearby || undefined,
          })),
      })),
      hotels: hotels
        .filter((h) => h.name.trim())
        .map((h) => ({
          cityLabel: h.cityLabel || undefined,
          name: h.name.trim(),
          url: h.url || undefined,
          area: h.area || undefined,
          priceNote: h.priceNote || undefined,
          photoUrl: h.photoUrl || undefined,
        })),
    });
    setBusy(false);
    if (res.ok) window.location.href = `/trips/${slug}`;
    else setMsg(res.error ?? 'Ошибка');
  }

  if (me === undefined || (!trip && !msg)) {
    return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Загрузка…</main>;
  }

  return (
    <main className="container-vela min-h-screen py-10">
      <header className="mb-8 flex items-center justify-between">
        <Link href={`/trips/${slug}`} className="text-sm text-paper-dim hover:text-paper">← К поездке</Link>
        <span className="text-sm text-paper-faint">{me?.email}</span>
      </header>
      <h1 className="font-serif text-4xl tracking-tightest">Редактирование поездки</h1>
      {msg && <p className="mt-4 text-sm text-red-300">{msg}</p>}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Field label="Название"><input className={inp} value={f.title} onChange={(e) => set({ title: e.target.value })} /></Field>
        <Field label="Подзаголовок"><input className={inp} value={f.subtitle} onChange={(e) => set({ subtitle: e.target.value })} /></Field>
        <Field label="Сезон"><input className={inp} value={f.seasonLabel} onChange={(e) => set({ seasonLabel: e.target.value })} /></Field>
        <Field label="Длительность (дней)"><input type="number" className={inp} value={f.durationDays} onChange={(e) => set({ durationDays: e.target.value })} /></Field>
        <Field label="Бюджет от (₽)"><input type="number" className={inp} value={f.budgetMin} onChange={(e) => set({ budgetMin: e.target.value })} /></Field>
        <Field label="Бюджет до (₽)"><input type="number" className={inp} value={f.budgetMax} onChange={(e) => set({ budgetMax: e.target.value })} /></Field>
        <Field label="Доступ">
          <div className="flex gap-2">
            {(['PUBLIC', 'PRIVATE'] as const).map((v) => (
              <button key={v} type="button" onClick={() => set({ visibility: v })} className={`rounded-full border px-4 py-2 text-sm ${f.visibility === v ? 'border-aurora text-aurora' : 'border-ink-line text-paper-dim'}`}>{v === 'PUBLIC' ? 'Публичная' : 'Приватная'}</button>
            ))}
          </div>
        </Field>
        <Field label="Статус">
          <select className={inp} value={f.status} onChange={(e) => set({ status: e.target.value as any })}>
            <option value="PUBLISHED">Опубликована</option>
            <option value="DRAFT">Черновик</option>
            <option value="HIDDEN">В архиве (скрыта)</option>
          </select>
        </Field>
        <Field label="Краткое описание" full><input className={inp} value={f.summary} onChange={(e) => set({ summary: e.target.value })} /></Field>
        <Field label="Подробное описание" full><textarea className={`${inp} min-h-[120px]`} value={f.longDescription} onChange={(e) => set({ longDescription: e.target.value })} /></Field>
        <Field label="Главное (по строке)" full><textarea className={`${inp} min-h-[90px]`} value={f.highlights} onChange={(e) => set({ highlights: e.target.value })} /></Field>
        <Field label="Когда ехать" full><textarea className={`${inp} min-h-[60px]`} value={f.bestTime} onChange={(e) => set({ bestTime: e.target.value })} /></Field>
        <Field label="Виза" full><textarea className={`${inp} min-h-[60px]`} value={f.visaNote} onChange={(e) => set({ visaNote: e.target.value })} /></Field>
        <Field label="Заглавное изображение" full>
          <div className="flex flex-wrap items-center gap-3">
            <input className={`${inp} flex-1`} value={f.heroImage} onChange={(e) => set({ heroImage: e.target.value })} placeholder="URL или загрузите →" />
            <HeroUpload onUploaded={(url) => set({ heroImage: url })} />
          </div>
          {imageUrl(f.heroImage) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(f.heroImage)!} alt="" className="mt-2 h-28 rounded-lg object-cover" />
          )}
        </Field>
      </div>

      {/* Дни маршрута */}
      <section className="mt-12 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl tracking-tightest">Дни маршрута</h2>
          <button type="button" onClick={() => setDays((d) => [...d, emptyDay()])} className={btnGhost}>+ День</button>
        </div>
        <p className="text-sm text-paper-faint">
          Изменения по дням и местам полностью заменяют текущий маршрут при сохранении.
          Координаты вводите из проверенного источника (Google Maps / OSM).
        </p>
        {days.map((d, di) => (
          <div key={di} className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.25em] text-paper-faint">День {di + 1}</span>
              <button type="button" onClick={() => setDays((ds) => ds.filter((_, k) => k !== di))} className="text-sm text-paper-faint hover:text-paper">Удалить день</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input className={inp} value={d.title} onChange={(e) => setDay(di, { title: e.target.value })} placeholder="Заголовок дня" />
              <input className={inp} value={d.baseCity} onChange={(e) => setDay(di, { baseCity: e.target.value })} placeholder="Город базирования" />
            </div>
            <div className="mt-5 space-y-3">
              {d.places.map((p, pi) => (
                <div key={pi} className="rounded-xl border border-ink-line p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className={inp} value={p.name} onChange={(e) => setPlace(di, pi, { name: e.target.value })} placeholder="Место (название)" />
                    <input className={inp} value={p.nameLocal} onChange={(e) => setPlace(di, pi, { nameLocal: e.target.value })} placeholder="Местное название (опц.)" />
                    <input className={inp} value={p.lat} onChange={(e) => setPlace(di, pi, { lat: e.target.value })} placeholder="Широта (lat)" />
                    <input className={inp} value={p.lng} onChange={(e) => setPlace(di, pi, { lng: e.target.value })} placeholder="Долгота (lng)" />
                  </div>
                  <input className={`${inp} mt-3`} value={p.description} onChange={(e) => setPlace(di, pi, { description: e.target.value })} placeholder="Короткое описание" />
                  <textarea className={`${inp} mt-3 min-h-[56px]`} value={p.howToGet} onChange={(e) => setPlace(di, pi, { howToGet: e.target.value })} placeholder="Как добраться" />
                  <textarea className={`${inp} mt-3 min-h-[56px]`} value={p.tips} onChange={(e) => setPlace(di, pi, { tips: e.target.value })} placeholder="На что обратить внимание / время" />
                  <textarea className={`${inp} mt-3 min-h-[56px]`} value={p.nearby} onChange={(e) => setPlace(di, pi, { nearby: e.target.value })} placeholder="Что рядом" />
                  <div className="mt-3">
                    <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Фото места</span>
                    <ImageInput value={p.photoUrl} onChange={(v) => setPlace(di, pi, { photoUrl: v })} />
                  </div>
                  <button type="button" onClick={() => setDay(di, { places: d.places.filter((_, j) => j !== pi) })} className="mt-2 text-xs text-paper-faint hover:text-paper">Удалить место</button>
                </div>
              ))}
              <button type="button" onClick={() => setDay(di, { places: [...d.places, emptyPlace()] })} className={btnGhost}>+ Место</button>
            </div>
          </div>
        ))}
      </section>

      {/* Отели */}
      <section className="mt-12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl tracking-tightest">Отели</h2>
          <button type="button" onClick={() => setHotels((h) => [...h, emptyHotel()])} className={btnGhost}>+ Отель</button>
        </div>
        <p className="text-sm text-paper-faint">Цена показывается, только если вы её укажете — ничего не выдумывается.</p>
        {hotels.map((h, hi) => (
          <div key={hi} className="rounded-xl border border-ink-line p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input className={inp} value={h.name} onChange={(e) => setHotel(hi, { name: e.target.value })} placeholder="Название отеля" />
              <input className={inp} value={h.cityLabel} onChange={(e) => setHotel(hi, { cityLabel: e.target.value })} placeholder="Город" />
              <input className={inp} value={h.url} onChange={(e) => setHotel(hi, { url: e.target.value })} placeholder="Ссылка (Booking / сайт)" />
              <input className={inp} value={h.area} onChange={(e) => setHotel(hi, { area: e.target.value })} placeholder="Район / рядом с чем" />
              <input className={inp} value={h.priceNote} onChange={(e) => setHotel(hi, { priceNote: e.target.value })} placeholder="Цена (опц.)" />
            </div>
            <div className="mt-3">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Фото отеля</span>
              <ImageInput value={h.photoUrl} onChange={(v) => setHotel(hi, { photoUrl: v })} />
            </div>
            <button type="button" onClick={() => setHotels((hs) => hs.filter((_, k) => k !== hi))} className="mt-2 text-xs text-paper-faint hover:text-paper">Удалить отель</button>
          </div>
        ))}
      </section>

      <div className="mt-10 flex items-center gap-4">
        <button disabled={busy} onClick={save} className="rounded-full bg-paper px-8 py-3 text-sm font-medium text-ink hover:scale-[1.02] transition-transform disabled:opacity-50">
          {busy ? 'Сохранение…' : 'Сохранить изменения'}
        </button>
        <Link href={`/trips/${slug}`} className="text-sm text-paper-dim hover:text-paper">Отмена</Link>
      </div>
    </main>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">{label}</span>
      {children}
    </label>
  );
}

function HeroUpload({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const r = await uploadImage(file);
    setBusy(false);
    if (r.ok) onUploaded(r.url);
  }
  return (
    <label className="cursor-pointer rounded-full border border-ink-line px-4 py-2 text-sm text-paper-dim hover:text-paper">
      {busy ? 'Загрузка…' : 'Загрузить'}
      <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
    </label>
  );
}

// Image picker: paste a URL OR upload a file (uploads to the API, fills the URL).
function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const res = await uploadImage(file);
    setUploading(false);
    if (res.ok) onChange(res.url);
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <input className={`${inp} flex-1`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Ссылка на изображение или загрузите файл →" />
        <label className="cursor-pointer rounded-full border border-ink-line px-4 py-2 text-sm text-paper-dim hover:text-paper">
          {uploading ? 'Загрузка…' : 'Загрузить файл'}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
        </label>
      </div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-24 w-full max-w-xs rounded-lg border border-ink-line object-cover" />
      )}
    </div>
  );
}
