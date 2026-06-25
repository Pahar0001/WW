'use client';

import { useState } from 'react';
import { createTrip, uploadImage, type CreateTripPayload } from '@/lib/api';
import { toast } from '@/components/ui/Toaster';

interface PlaceForm {
  name: string;
  nameLocal: string;
  lat: string;
  lng: string;
  description: string;
  photoUrl: string;
  photos: string[];
  howToGet: string;
  tips: string;
  nearby: string;
}
interface DayForm {
  title: string;
  baseCity: string;
  notes: string;
  places: PlaceForm[];
}
interface HotelForm {
  cityLabel: string;
  name: string;
  url: string;
  area: string;
  priceNote: string;
  photoUrl: string;
}

const emptyPlace = (): PlaceForm => ({
  name: '', nameLocal: '', lat: '', lng: '', description: '', photoUrl: '',
  photos: [], howToGet: '', tips: '', nearby: '',
});
const emptyDay = (): DayForm => ({ title: '', baseCity: '', notes: '', places: [emptyPlace()] });
const emptyHotel = (): HotelForm => ({ cityLabel: '', name: '', url: '', area: '', priceNote: '', photoUrl: '' });

type Pace = 'CALM' | 'BALANCED' | 'ACTIVE';
const PACE_OPTS: { value: Pace; label: string; hint: string }[] = [
  { value: 'CALM', label: 'Спокойная', hint: 'меньше точек в день, больше отдыха' },
  { value: 'BALANCED', label: 'Сбалансированная', hint: 'умеренная нагрузка' },
  { value: 'ACTIVE', label: 'Активная', hint: 'насыщенный день, много мест' },
];

/**
 * Shared "create trip" form. Used by the admin CMS and by the member-facing
 * /trips/new page. `canSetPublic` gates the PUBLIC visibility option: regular
 * members can only create PRIVATE trips (the server enforces this too).
 */
export function TripForm({ canSetPublic }: { canSetPublic: boolean }) {
  const [countryName, setCountryName] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [summary, setSummary] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [highlights, setHighlights] = useState('');
  const [seasonLabel, setSeasonLabel] = useState('');
  const [startWindow, setStartWindow] = useState('');
  const [endWindow, setEndWindow] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'PRIVATE'>(canSetPublic ? 'PUBLIC' : 'PRIVATE');
  const [pace, setPace] = useState<Pace>('BALANCED');
  const [days, setDays] = useState<DayForm[]>([emptyDay()]);
  const [hotels, setHotels] = useState<HotelForm[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setHotel = (i: number, patch: Partial<HotelForm>) =>
    setHotels((hs) => hs.map((h, k) => (k === i ? { ...h, ...patch } : h)));
  const setDay = (i: number, patch: Partial<DayForm>) =>
    setDays((ds) => ds.map((d, k) => (k === i ? { ...d, ...patch } : d)));
  const setPlace = (di: number, pi: number, patch: Partial<PlaceForm>) =>
    setDays((ds) =>
      ds.map((d, k) =>
        k === di ? { ...d, places: d.places.map((p, j) => (j === pi ? { ...p, ...patch } : p)) } : d,
      ),
    );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!countryName.trim() || !title.trim()) {
      setError('Заполните страну и название.');
      return;
    }
    const payload: CreateTripPayload = {
      countryName: countryName.trim(),
      title: title.trim(),
      subtitle: subtitle || undefined,
      summary: summary || undefined,
      longDescription: longDescription || undefined,
      highlights: highlights.split('\n').map((h) => h.trim()).filter(Boolean),
      seasonLabel: seasonLabel || undefined,
      startWindow: startWindow ? new Date(startWindow).toISOString() : undefined,
      endWindow: endWindow ? new Date(endWindow).toISOString() : undefined,
      heroImage: heroImage || undefined,
      // Non-admins are restricted to PRIVATE (enforced server-side too).
      visibility: canSetPublic ? visibility : 'PRIVATE',
      pace,
      durationDays: Number(durationDays) || 1,
      budgetMinRub: budgetMin ? Number(budgetMin) : undefined,
      budgetMaxRub: budgetMax ? Number(budgetMax) : undefined,
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
            photos: p.photos.filter(Boolean),
            howToGet: p.howToGet || undefined,
            tips: p.tips || undefined,
            nearby: p.nearby || undefined,
          })),
      })),
    };

    setBusy(true);
    const res = await createTrip(payload);
    setBusy(false);
    if (res.ok) {
      toast.success('Путешествие создано');
      window.location.href = `/trips/${res.slug}`;
    } else {
      toast.error(res.error);
      setError(res.error);
    }
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-10">
      {/* Basics */}
      <section className="grid gap-5 md:grid-cols-2">
        <Field label="Страна *">
          <input className={inputCls} value={countryName} onChange={(e) => setCountryName(e.target.value)} placeholder="Япония" />
        </Field>
        <Field label="Название *">
          <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Япония — цветение сакуры" />
        </Field>
        <Field label="Подзаголовок">
          <input className={inputCls} value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
        </Field>
        <Field label="Сезон">
          <input className={inputCls} value={seasonLabel} onChange={(e) => setSeasonLabel(e.target.value)} placeholder="Март–апрель 2027" />
        </Field>
        <Field label="Длительность (дней) *">
          <input type="number" min={1} max={60} className={inputCls} value={durationDays} onChange={(e) => setDurationDays(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Дата начала">
            <input type="date" className={inputCls} value={startWindow} onChange={(e) => setStartWindow(e.target.value)} />
          </Field>
          <Field label="Дата окончания">
            <input type="date" className={inputCls} value={endWindow} onChange={(e) => setEndWindow(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Бюджет от (₽)">
            <input type="number" className={inputCls} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
          </Field>
          <Field label="Бюджет до (₽)">
            <input type="number" className={inputCls} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
          </Field>
        </div>
        <Field label="Темп поездки" full>
          <div className="flex flex-wrap gap-2">
            {PACE_OPTS.map((o) => (
              <button key={o.value} type="button" onClick={() => setPace(o.value)}
                className={`rounded-full border px-5 py-2 text-sm ${pace === o.value ? 'border-aurora text-aurora' : 'border-ink-line text-paper-dim hover:text-paper'}`}>
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-paper-faint">{PACE_OPTS.find((o) => o.value === pace)?.hint}</p>
        </Field>
        <Field label="Заглавное изображение" full>
          <ImageInput value={heroImage} onChange={setHeroImage} />
        </Field>
        <Field label="Доступ" full>
          {canSetPublic ? (
            <>
              <div className="flex gap-2">
                {(['PUBLIC', 'PRIVATE'] as const).map((v) => (
                  <button key={v} type="button" onClick={() => setVisibility(v)}
                    className={`rounded-full border px-5 py-2 text-sm ${visibility === v ? 'border-aurora text-aurora' : 'border-ink-line text-paper-dim hover:text-paper'}`}>
                    {v === 'PUBLIC' ? 'Публичная' : 'Приватная'}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-paper-faint">
                Приватная видна только администраторам и приглашённым участникам.
              </p>
            </>
          ) : (
            <p className="text-sm text-paper-dim">
              Поездка будет <span className="text-aurora">приватной</span> — её увидите только вы и приглашённые участники.
              Публичные маршруты публикуют администраторы.
            </p>
          )}
        </Field>
        <Field label="Краткое описание" full>
          <input className={inputCls} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Field>
        <Field label="Подробное описание" full>
          <textarea className={`${inputCls} min-h-[120px]`} value={longDescription} onChange={(e) => setLongDescription(e.target.value)} />
        </Field>
        <Field label="Главное (по строке на пункт)" full>
          <textarea className={`${inputCls} min-h-[90px]`} value={highlights} onChange={(e) => setHighlights(e.target.value)} placeholder={'Гора Фудзи\nКиото — храмы\nСакура на канале'} />
        </Field>
      </section>

      {/* Days */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl tracking-tightest">Дни маршрута</h2>
          <button type="button" data-cursor="hover" onClick={() => setDays((d) => [...d, emptyDay()])} className={btnGhost}>
            + День
          </button>
        </div>

        {days.map((d, di) => (
          <div key={di} className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.25em] text-paper-faint">День {di + 1}</span>
              {days.length > 1 && (
                <button type="button" onClick={() => setDays((ds) => ds.filter((_, k) => k !== di))} className="text-sm text-paper-faint hover:text-paper">
                  Удалить день
                </button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input className={inputCls} value={d.title} onChange={(e) => setDay(di, { title: e.target.value })} placeholder="Заголовок дня" />
              <input className={inputCls} value={d.baseCity} onChange={(e) => setDay(di, { baseCity: e.target.value })} placeholder="Город базирования" />
            </div>

            <div className="mt-5 space-y-3">
              {d.places.map((p, pi) => (
                <div key={pi} className="rounded-xl border border-ink-line p-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input className={inputCls} value={p.name} onChange={(e) => setPlace(di, pi, { name: e.target.value })} placeholder="Место (название)" />
                    <input className={inputCls} value={p.nameLocal} onChange={(e) => setPlace(di, pi, { nameLocal: e.target.value })} placeholder="Местное название (опц.)" />
                    <input className={inputCls} value={p.lat} onChange={(e) => setPlace(di, pi, { lat: e.target.value })} placeholder="Широта (lat), напр. 35.0116" />
                    <input className={inputCls} value={p.lng} onChange={(e) => setPlace(di, pi, { lng: e.target.value })} placeholder="Долгота (lng), напр. 135.7681" />
                  </div>
                  <input className={`${inputCls} mt-3`} value={p.description} onChange={(e) => setPlace(di, pi, { description: e.target.value })} placeholder="Короткое описание" />
                  <textarea className={`${inputCls} mt-3 min-h-[60px]`} value={p.howToGet} onChange={(e) => setPlace(di, pi, { howToGet: e.target.value })} placeholder="Как добраться" />
                  <textarea className={`${inputCls} mt-3 min-h-[60px]`} value={p.tips} onChange={(e) => setPlace(di, pi, { tips: e.target.value })} placeholder="На что обратить внимание" />
                  <textarea className={`${inputCls} mt-3 min-h-[60px]`} value={p.nearby} onChange={(e) => setPlace(di, pi, { nearby: e.target.value })} placeholder="Что рядом" />
                  <div className="mt-3">
                    <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Главное фото места</span>
                    <ImageInput value={p.photoUrl} onChange={(v) => setPlace(di, pi, { photoUrl: v })} />
                  </div>
                  <div className="mt-3">
                    <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Фотогалерея (можно несколько)</span>
                    <Gallery value={p.photos} onChange={(v) => setPlace(di, pi, { photos: v })} />
                  </div>
                  {d.places.length > 1 && (
                    <button type="button" onClick={() => setDay(di, { places: d.places.filter((_, j) => j !== pi) })} className="mt-2 text-xs text-paper-faint hover:text-paper">
                      Удалить место
                    </button>
                  )}
                </div>
              ))}
              <button type="button" data-cursor="hover" onClick={() => setDay(di, { places: [...d.places, emptyPlace()] })} className={btnGhost}>
                + Место
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* Hotels */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl tracking-tightest">Отели</h2>
          <button type="button" data-cursor="hover" onClick={() => setHotels((h) => [...h, emptyHotel()])} className={btnGhost}>
            + Отель
          </button>
        </div>
        <p className="text-sm text-paper-faint">
          Добавьте реальные отели по ссылке. Цена показывается, только если вы её
          укажете — ничего не выдумывается.
        </p>
        {hotels.map((h, hi) => (
          <div key={hi} className="rounded-xl border border-ink-line p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input className={inputCls} value={h.name} onChange={(e) => setHotel(hi, { name: e.target.value })} placeholder="Название отеля" />
              <input className={inputCls} value={h.cityLabel} onChange={(e) => setHotel(hi, { cityLabel: e.target.value })} placeholder="Город" />
              <input className={inputCls} value={h.url} onChange={(e) => setHotel(hi, { url: e.target.value })} placeholder="Ссылка (Booking / сайт отеля)" />
              <input className={inputCls} value={h.area} onChange={(e) => setHotel(hi, { area: e.target.value })} placeholder="Район / рядом с чем" />
              <input className={inputCls} value={h.priceNote} onChange={(e) => setHotel(hi, { priceNote: e.target.value })} placeholder="Цена (опц., напр. от 6 000 ₽/ночь)" />
            </div>
            <div className="mt-3">
              <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">Фото отеля</span>
              <ImageInput value={h.photoUrl} onChange={(v) => setHotel(hi, { photoUrl: v })} />
            </div>
            <button type="button" onClick={() => setHotels((hs) => hs.filter((_, k) => k !== hi))} className="mt-2 text-xs text-paper-faint hover:text-paper">
              Удалить отель
            </button>
          </div>
        ))}
      </section>

      {error && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-sm text-amber-200">
          {error}
        </div>
      )}

      <div className="flex items-center gap-4">
        <button type="submit" data-magnetic disabled={busy} className="rounded-full bg-aurora px-8 py-3.5 text-sm font-medium text-aurora-fg transition-transform duration-500 ease-smooth hover:scale-[1.03] disabled:opacity-50">
          {busy ? 'Сохранение…' : 'Создать поездку'}
        </button>
        <span className="text-sm text-paper-faint">
          {canSetPublic ? 'Поездка появится на главной и на карте сразу.' : 'Поездка появится в разделе «Мои поездки».'}
        </span>
      </div>
    </form>
  );
}

const inputCls =
  'w-full rounded-lg border border-ink-line bg-ink px-4 py-2.5 text-paper placeholder:text-paper-faint outline-none transition-colors focus:border-aurora/60';
const btnGhost =
  'rounded-full border border-ink-line px-5 py-2 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper';

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">{label}</span>
      {children}
    </label>
  );
}

// A list of images (gallery): each row is an ImageInput; add/remove rows.
function Gallery({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const rows = value.length ? value : [''];
  const setAt = (i: number, v: string) => {
    const next = [...rows];
    next[i] = v;
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {rows.map((v, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1">
            <ImageInput value={v} onChange={(nv) => setAt(i, nv)} />
          </div>
          {rows.length > 1 && (
            <button type="button" onClick={() => onChange(value.filter((_, k) => k !== i))} className="mt-2 text-xs text-paper-faint hover:text-paper">
              ✕
            </button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, ''])} className={btnGhost}>
        + Фото в галерею
      </button>
    </div>
  );
}

// Image picker: paste a URL OR upload a file (uploads to the API, fills the URL).
function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErr(null);
    setUploading(true);
    const res = await uploadImage(file);
    setUploading(false);
    if (res.ok) onChange(res.url);
    else setErr(res.error);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <input
          className={`${inputCls} flex-1`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ссылка на изображение или загрузите файл →"
        />
        <label className={`${btnGhost} cursor-pointer`}>
          {uploading ? 'Загрузка…' : 'Загрузить файл'}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={uploading} />
        </label>
      </div>
      {err && <p className="text-xs text-red-300">{err}</p>}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-24 w-full max-w-xs rounded-lg border border-ink-line object-cover" />
      )}
    </div>
  );
}
