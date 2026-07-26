'use client';

/**
 * «Где я был» — карта посещённых стран в профиле.
 *
 * Мини-глобус с золотыми отметками (тот же Hero3D, что на главной) + выбор
 * стран чипами по континентам с поиском. Сохранение — одной кнопкой (PUT
 * заменяет весь набор). Для чужого профиля — витрина без редактирования.
 */

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { authHeaders } from '@/lib/auth';
import { WORLD_COUNTRIES, WORLD_BY_CODE } from '@/lib/world-countries';
import { plural } from '@/lib/plural';
import { toast } from '@/components/ui/Toaster';

const Hero3D = dynamic(() => import('@/components/ui/Hero3D').then((m) => m.Hero3D), { ssr: false });

const CONTINENTS = ['Европа', 'Азия', 'Африка', 'Америка', 'Океания'] as const;

async function fetchVisited(userId?: string): Promise<string[]> {
  const path = userId ? `/api/users/${userId}/visited` : '/api/profile/visited';
  const res = await fetch(path, { headers: authHeaders(), cache: 'no-store' });
  if (!res.ok) return [];
  const d = (await res.json()) as { codes: string[] };
  return d.codes ?? [];
}

export function VisitedMap({ userId, editable = false }: { userId?: string; editable?: boolean }) {
  const [codes, setCodes] = useState<Set<string> | null>(null);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchVisited(userId).then((c) => {
      setCodes(new Set(c));
      setSaved(new Set(c));
    });
  }, [userId]);

  const markers = useMemo(() => {
    if (!codes) return [];
    return [...codes]
      .map((code) => WORLD_BY_CODE.get(code))
      .filter(Boolean)
      .map((c) => ({ slug: c!.code, name: c!.name, lat: c!.lat, lng: c!.lng }));
  }, [codes]);

  const dirty = useMemo(() => {
    if (!codes) return false;
    if (codes.size !== saved.size) return true;
    for (const c of codes) if (!saved.has(c)) return true;
    return false;
  }, [codes, saved]);

  if (codes === null) return null;
  if (!editable && codes.size === 0) return null; // пустая витрина не нужна

  const pct = Math.round((codes.size / WORLD_COUNTRIES.length) * 100);

  function toggle(code: string) {
    setCodes((s) => {
      const n = new Set(s);
      if (n.has(code)) n.delete(code);
      else n.add(code);
      return n;
    });
  }

  async function save() {
    setBusy(true);
    try {
      const res = await fetch('/api/profile/visited', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ codes: [...codes!] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSaved(new Set(codes!));
      toast.success('Карта путешествий сохранена');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const q = query.trim().toLowerCase();

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-ink-line bg-[#0d0b08] text-white">
      <div className="flex flex-wrap items-end justify-between gap-3 p-6 pb-0">
        <div>
          <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.26em] text-white/50">
            <span className="h-px w-6 bg-aurora/70" />
            Где я был
          </p>
          <h2 className="mt-2 font-serif text-2xl tracking-tightest">
            {codes.size > 0 ? (
              <>
                {codes.size} {plural(codes.size, 'страна', 'страны', 'стран')}
                <span className="text-white/40"> · {pct}% списка</span>
              </>
            ) : (
              'Отметьте первые страны'
            )}
          </h2>
        </div>
        {editable && (
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                onClick={save}
                disabled={busy}
                className="glow-gold rounded-full bg-aurora px-4 py-2 text-sm font-medium text-aurora-fg disabled:opacity-50"
              >
                {busy ? 'Сохраняю…' : 'Сохранить'}
              </button>
            )}
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition-colors hover:border-aurora/50 hover:text-white"
            >
              {open ? 'Скрыть выбор' : '+ Отметить страны'}
            </button>
          </div>
        )}
      </div>

      {/* Глобус с отметками */}
      {markers.length > 0 && (
        <div className="h-[380px]">
          <Hero3D markers={markers} onSelect={() => {}} />
        </div>
      )}

      {/* Выбор стран */}
      {editable && open && (
        <div className="border-t border-white/10 p-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск страны…"
            className="w-full max-w-xs rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/35 outline-none focus:border-aurora/50"
          />
          <div className="mt-5 space-y-5">
            {CONTINENTS.map((cont) => {
              const list = WORLD_COUNTRIES.filter(
                (c) => c.continent === cont && (!q || c.name.toLowerCase().includes(q)),
              );
              if (list.length === 0) return null;
              return (
                <div key={cont}>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.22em] text-white/40">
                    {cont}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {list.map((c) => {
                      const on = codes.has(c.code);
                      return (
                        <button
                          key={c.code}
                          onClick={() => toggle(c.code)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                            on
                              ? 'border-aurora/70 bg-aurora/15 text-aurora'
                              : 'border-white/15 text-white/60 hover:border-white/35 hover:text-white'
                          }`}
                        >
                          {on ? '✓ ' : ''}
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
