import { getRegime, ENTRY_CHECKLIST, type Regime } from '@/lib/entry-requirements';

const toneClass: Record<Regime['tone'], string> = {
  ok: 'border-emerald-500/40 text-emerald-600 dark:text-emerald-300',
  mid: 'border-aurora/50 text-aurora',
  req: 'border-amber-500/40 text-amber-600 dark:text-amber-300',
  muted: 'border-ink-line text-paper-faint',
};

/**
 * Требования и ограничения по въезду/выезду для страны (справочно).
 * Категория визового режима + честный универсальный чек-лист.
 * Точные правила не выдумываются — см. lib/entry-requirements.ts (Real Data Policy).
 */
export function EntryRequirements({ code, countryName }: { code: string; countryName: string }) {
  const { regime, hint } = getRegime(code);

  return (
    <section className="card-lux mt-6 overflow-hidden rounded-2xl p-6 sm:p-8">
      <div className="ambient-glow -right-16 -top-16 h-52 w-52 opacity-70" />

      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-paper-faint">
            <span className="h-px w-7 bg-aurora/60" />
            Въезд и выезд
          </p>
          <h2 className="mt-2 font-serif text-2xl tracking-tightest text-paper">
            Требования и ограничения · {countryName}
          </h2>
        </div>
        <span className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium ${toneClass[regime.tone]}`}>
          {regime.label}
        </span>
      </div>

      <p className="relative mt-4 max-w-2xl text-paper-dim">{regime.note}</p>
      {hint && <p className="relative mt-2 max-w-2xl text-sm text-paper-dim">{hint}</p>}

      {/* Честная оговорка (в духе «честных данных») */}
      <div className="relative mt-5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-paper-dim">
        <span className="mt-0.5 text-amber-600 dark:text-amber-300" aria-hidden>⚠</span>
        <p>
          Справочно и не является юридической консультацией. Правила, сроки и сборы меняются —
          актуальные требования уточняйте в{' '}
          <span className="text-paper">посольстве / консульстве страны</span> и на портале МИД России
          перед поездкой.
        </p>
      </div>

      {/* Универсальный чек-лист */}
      <div className="relative mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
        {ENTRY_CHECKLIST.map((item, i) => (
          <div key={item.title} className="flex gap-3">
            <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-aurora/10 font-mono text-xs text-aurora">
              {i + 1}
            </span>
            <div>
              <div className="font-medium text-paper">{item.title}</div>
              <p className="mt-1 text-sm leading-relaxed text-paper-dim">{item.text}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="relative mt-6 border-t border-ink-line pt-4 text-sm text-paper-faint">
        Есть личный опыт по документам для «{countryName}»? Поделитесь им в обсуждении ниже — это
        помогает другим путешественникам.
      </p>
    </section>
  );
}
