'use client';

/**
 * Курс валюты страны маршрута — официальные данные ЦБ РФ (VERIFIED).
 * Показывает курс за единицу, обратный пересчёт «1000 ₽ ≈ …» и мини-конвертер.
 * Если валюта страны неизвестна, рубль или ЦБ недоступен — карточка не рендерится.
 */

import { useEffect, useMemo, useState } from 'react';
import { COUNTRY_CURRENCY } from '@/lib/country-currency';

interface Rates {
  date: string;
  rates: Record<string, number> | null;
}

const fmt = (n: number, max = 2) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: max }).format(n);

export function CurrencyCard({ countrySlug }: { countrySlug?: string | null }) {
  const cur = countrySlug ? COUNTRY_CURRENCY[countrySlug] : undefined;
  const [data, setData] = useState<Rates | null>(null);
  const [rub, setRub] = useState<string>('10000');

  useEffect(() => {
    if (!cur || cur.code === 'RUB') return;
    fetch('/api/currency/rates', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, [cur]);

  const rate = cur && data?.rates ? data.rates[cur.code] : undefined;

  const converted = useMemo(() => {
    const v = parseFloat(rub.replace(/\s/g, '').replace(',', '.'));
    if (!rate || !Number.isFinite(v) || v <= 0) return null;
    return v / rate;
  }, [rub, rate]);

  if (!cur || cur.code === 'RUB' || !rate) return null;

  return (
    <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-xl tracking-tightest">Деньги в поездке</h3>
        <span className="text-[11px] uppercase tracking-[0.18em] text-paper-faint">
          ЦБ РФ · {data?.date} · <span className="text-emerald-500/80">проверено</span>
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-paper-faint">Курс</div>
          <div className="mt-1.5 font-serif text-2xl text-paper">
            1 {cur.code} = {fmt(rate, rate < 1 ? 4 : 2)} ₽
          </div>
          <div className="mt-1 text-sm text-paper-dim">{cur.nameRu}</div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.22em] text-paper-faint">Конвертер</div>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              value={rub}
              onChange={(e) => setRub(e.target.value)}
              inputMode="numeric"
              className="w-28 rounded-xl border border-ink-line bg-ink px-3 py-2 text-paper outline-none focus:border-aurora/60"
              aria-label="Сумма в рублях"
            />
            <span className="text-paper-faint">₽ ≈</span>
            <span className="font-serif text-lg text-aurora">
              {converted != null ? `${fmt(converted, 0)} ${cur.symbol}` : '—'}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-paper-faint">
            Официальный курс ЦБ — в обменниках и банках курс будет немного другим.
          </p>
        </div>
      </div>
    </div>
  );
}
