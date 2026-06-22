'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createTrip, type CreateTripPayload } from '@/lib/api';

interface PlaceForm {
  name: string;
  nameLocal: string;
  lat: string;
  lng: string;
  description: string;
}
interface DayForm {
  title: string;
  baseCity: string;
  notes: string;
  places: PlaceForm[];
}

const emptyPlace = (): PlaceForm => ({ name: '', nameLocal: '', lat: '', lng: '', description: '' });
const emptyDay = (): DayForm => ({ title: '', baseCity: '', notes: '', places: [emptyPlace()] });

export default function AdminPage() {
  const [countryName, setCountryName] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [summary, setSummary] = useState('');
  const [longDescription, setLongDescription] = useState('');
  const [highlights, setHighlights] = useState('');
  const [seasonLabel, setSeasonLabel] = useState('');
  const [durationDays, setDurationDays] = useState('7');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [days, setDays] = useState<DayForm[]>([emptyDay()]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      highlights: highlights
        .split('\n')
        .map((h) => h.trim())
        .filter(Boolean),
      seasonLabel: seasonLabel || undefined,
      durationDays: Number(durationDays) || 1,
      budgetMinRub: budgetMin ? Number(budgetMin) : undefined,
      budgetMaxRub: budgetMax ? Number(budgetMax) : undefined,
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
          })),
      })),
    };

    setBusy(true);
    const res = await createTrip(payload);
    setBusy(false);
    if (res.ok) {
      window.location.href = `/trips/${res.slug}`;
    } else {
      setError(res.error);
    }
  }

  return (
    <main className="container-vela min-h-screen py-10">
      <header className="mb-12 flex items-center justify-between">
        <Link href="/" data-magnetic className="font-serif text-xl tracking-tightest">
          Vela
        </Link>
        <Link href="/" data-cursor="hover" className="text-sm text-paper-dim hover:text-paper">
          ← На главную
        </Link>
      </header>

      <h1 className="font-serif text-4xl tracking-tightest">Новое путешествие</h1>
      <p className="mt-3 max-w-2xl text-paper-dim">
        Добавьте поездку прямо здесь — без редактирования файлов. Координаты мест
        вводятся из проверенного источника (Google Maps / OSM) и сохраняются как
        оценочные. Бюджет рассчитается автоматически из указанного диапазона.
      </p>

      <form onSubmit={submit} className="mt-10 space-y-10">
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
            <Field label="Бюджет от (₽)">
              <input type="number" className={inputCls} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
            </Field>
            <Field label="Бюджет до (₽)">
              <input type="number" className={inputCls} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
            </Field>
          </div>
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

        {error && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-4 text-sm text-amber-200">
            {error}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button type="submit" data-magnetic disabled={busy} className="rounded-full bg-paper px-8 py-3.5 text-sm font-medium text-ink transition-transform duration-500 ease-smooth hover:scale-[1.03] disabled:opacity-50">
            {busy ? 'Сохранение…' : 'Создать и опубликовать'}
          </button>
          <span className="text-sm text-paper-faint">Поездка появится на главной и на карте сразу.</span>
        </div>
      </form>
    </main>
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
