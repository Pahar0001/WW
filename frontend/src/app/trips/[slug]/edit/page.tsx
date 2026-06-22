'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { auth, authHeaders, type AuthUser } from '@/lib/auth';
import { updateTrip, uploadImage, imageUrl, type Trip } from '@/lib/api';

const inp = 'w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60';
const CAN_EDIT = ['ORGANIZER', 'ADMIN', 'SUPER_ADMIN'];

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
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF((s) => ({ ...s, ...p }));

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

      <div className="mt-8 flex items-center gap-4">
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
