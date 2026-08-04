'use client';

import { useEffect, useState } from 'react';
import { getTripEstimate, type Comfort, type SpendEstimate } from '@/lib/api';

/**
 * «Примерные траты» — сколько стоит поездка целиком.
 *
 * Раздел показывает не только сумму, но и то, ИЗ ЧЕГО она получилась: под
 * каждой строкой стоит формула, которую человек может пересчитать на бумаге.
 * Это единственный способ отличить честную оценку от выдуманного числа —
 * «≈ 12 000 ₽» без расчёта неотличимо от взятого с потолка, даже когда оно
 * получено добросовестно.
 *
 * Что откуда:
 *  · перелёт — котировка Aviasales на выбранные даты (блок «Перелёт и даты»),
 *    помечается «проверено»; без дат честно просит выбрать даты;
 *  · наземные траты — базовая корзина дня и ночи по ценам страны-эталона,
 *    умноженная на уровень комфорта и на ИНДЕКС УРОВНЯ ЦЕН СТРАНЫ из данных
 *    World Bank. Индекс с годом и ссылкой на источник виден в интерфейсе:
 *    поездка в Египет и поездка в Японию перестали стоить одинаково.
 */
const COMFORT_LABEL: Record<Comfort, string> = {
  BUDGET: 'Эконом',
  STANDARD: 'Стандарт',
  COMFORT: 'Комфорт',
};

const CATEGORY_RU: Record<string, string> = {
  FLIGHTS: 'Перелёт (туда-обратно)',
  HOTELS: 'Отель',
  FOOD: 'Прожиточный минимум (еда и мелочи)',
  TRANSPORT: 'Транспорт',
  ACTIVITIES: 'Развлечения',
  RESERVE: 'Резерв (10%)',
};

const fmt = (n: number) => new Intl.NumberFormat('ru-RU').format(n);
/** 1.8 → «1,8»; 0.42 → «0,42». Числа в тексте пишем по-русски. */
const dec = (n: number) => String(n).replace('.', ',');

export function SpendEstimator({
  slug,
  flightPrice,
}: {
  slug: string;
  /** Реальная цена билетов на человека из блока «Перелёт и даты» (null — дат нет). */
  flightPrice?: number | null;
}) {
  const [travelers, setTravelers] = useState(2);
  const [comfort, setComfort] = useState<Comfort>('BUDGET');
  const [data, setData] = useState<SpendEstimate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getTripEstimate(slug, { travelers, comfort, flightRub: flightPrice ?? null }).then((d) => {
      if (alive) {
        setData(d);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, [slug, travelers, comfort, flightPrice]);

  const pl = data?.priceLevel ?? null;

  return (
    <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-2xl tracking-tightest">Примерные траты</h3>
        {/* Плашка называет главный источник расчёта, а не «мы что-то посчитали». */}
        {pl ? (
          <a
            href={pl.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-aurora/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-aurora transition-colors hover:border-aurora/60"
          >
            уровень цен: world bank {pl.year}
          </a>
        ) : (
          <span className="rounded-full border border-ink-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-paper-faint">
            уровня цен страны нет в данных
          </span>
        )}
      </div>

      {/* Controls: travellers + comfort */}
      <div className="mt-6 flex flex-wrap items-center gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">Путешественников</div>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              data-cursor="hover"
              onClick={() => setTravelers((t) => Math.max(1, t - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-line text-paper-dim hover:text-paper"
              aria-label="Меньше"
            >
              −
            </button>
            <span className="w-6 text-center text-lg text-paper">{travelers}</span>
            <button
              type="button"
              data-cursor="hover"
              onClick={() => setTravelers((t) => Math.min(20, t + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-line text-paper-dim hover:text-paper"
              aria-label="Больше"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">Уровень комфорта</div>
          <div className="mt-2 flex gap-2">
            {(['BUDGET', 'STANDARD', 'COMFORT'] as Comfort[]).map((c) => (
              <button
                key={c}
                type="button"
                data-cursor="hover"
                onClick={() => setComfort(c)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  c === comfort
                    ? 'border-aurora bg-aurora/10 text-aurora'
                    : 'border-ink-line text-paper-dim hover:text-paper'
                }`}
              >
                {COMFORT_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {loading && !data ? (
        <p className="mt-6 text-sm text-paper-faint">Считаем оценку…</p>
      ) : !data ? (
        <p className="mt-6 text-sm text-paper-faint">Не удалось рассчитать оценку.</p>
      ) : (
        <div className="mt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Per-person breakdown: сумма + формула, по которой она получена. */}
            <div className="divide-y divide-ink-line">
              {data.perPerson.categories.map((l) => (
                <div key={l.category} className="py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-paper-dim">{CATEGORY_RU[l.category] ?? l.category}</span>
                    {l.amount != null ? (
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <span className="text-paper">
                          {l.dataStatus === 'VERIFIED' ? '' : '≈ '}
                          {fmt(l.amount)} ₽
                        </span>
                        {l.dataStatus === 'VERIFIED' && (
                          <span className="rounded-full border border-emerald-300/30 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-300">
                            проверено
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="whitespace-nowrap text-xs text-paper-faint">
                        выберите даты выше ↑
                      </span>
                    )}
                  </div>
                  {/* Расчёт строки. Мелким, но на виду: он и есть доказательство. */}
                  <p className="mt-1 font-mono text-[11px] leading-relaxed text-paper-faint">
                    {l.method}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="flex flex-col justify-center rounded-xl border border-ink-line bg-ink/20 p-5">
              <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">На человека</div>
              <div className="mt-1 font-serif text-3xl text-aurora">≈ {fmt(data.perPerson.total)} ₽</div>
              <div className="mt-1 text-sm text-paper-faint">
                диапазон {fmt(data.perPerson.low)}–{fmt(data.perPerson.high)} ₽
              </div>
              <div className="mt-5 text-xs uppercase tracking-[0.25em] text-paper-faint">
                На группу ({data.travelers})
              </div>
              <div className="mt-1 font-serif text-2xl text-paper">≈ {fmt(data.group.total)} ₽</div>
              <div className="mt-1 text-sm text-paper-faint">
                диапазон {fmt(data.group.low)}–{fmt(data.group.high)} ₽
              </div>
            </div>
          </div>

          {/* Уровень цен страны — самое важное из того, что изменилось в расчёте:
              теперь Египет и Япония считаются по-разному, и видно, во сколько раз. */}
          {pl && (
            <div className="mt-5 rounded-xl border border-ink-line/70 bg-ink/20 px-4 py-3">
              {/* Название страны подставляется из каталога в именительном падеже,
                  поэтому фраза построена так, чтобы его не склонять: «цены Египет»
                  читается как ошибка, а склонять названия в коде — отдельная беда. */}
              <p className="text-sm leading-relaxed text-paper-dim">
                Уровень цен:{' '}
                {pl.country ? <span className="text-paper">{pl.country}</span> : 'страна маршрута'}{' '}
                против России —{' '}
                <span className="text-aurora">
                  ×{dec(pl.index)}
                  {pl.index < 1 ? ' (дешевле)' : pl.index > 1 ? ' (дороже)' : ''}
                </span>
                . Это{' '}
                <a
                  href={pl.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-aurora hover:underline"
                >
                  индекс уровня цен World Bank
                </a>{' '}
                за {pl.year} год ({pl.pli.toFixed(1)} при США = 100), не наша оценка. На него
                умножены все наземные строки расчёта.
              </p>
            </div>
          )}

          <p className="mt-4 text-xs leading-relaxed text-paper-faint">
            Как считаем: базовая корзина уровня «Эконом» по ценам России — отель за ночь,
            прожиточный минимум дня (еда и мелочи), транспорт и развлечения на {data.durationDays}{' '}
            дн. ({data.nights} ноч., городов: {data.cities}
            {data.transfers > 0 && (
              <>
                , переездов: {data.transfers}
                {data.transfersFrom === 'plan' && ' — по плану маршрута'}
              </>
            )}
            ).{' '}
            {/* «×1 к базе» — шум: множитель, который ничего не меняет, читается
                как недоделка. При «Эконом» о нём просто не говорим. */}
            {data.comfortIndex !== 1 && (
              <>
                Уровень «{COMFORT_LABEL[data.comfort]}» — ×{dec(data.comfortIndex)} к базе
                {pl && ', '}
              </>
            )}
            {pl && <>уровень цен страны — ×{dec(pl.index)}</>}.{' '}
            {data.flight ? (
              <>
                Перелёт — <span className="text-emerald-300">реальная котировка Aviasales</span>, он
                ни на что не умножается. Наземные траты остаются{' '}
                <span className="text-aurora">оценкой</span> (±
                {Math.round(data.assumptions.band * 100)}%): настоящей цены ночи в конкретном отеле
                на вашу дату нам взять негде, и придумывать её мы не станем.
              </>
            ) : (
              <>
                Перелёт добавится в расчёт, когда выберете даты в блоке «Перелёт и даты» — цены
                билетов мы не выдумываем. Наземные траты — <span className="text-aurora">оценка</span>{' '}
                (±{Math.round(data.assumptions.band * 100)}%).
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
