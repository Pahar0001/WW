'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EASE, onFrame } from '@/lib/motion';
import { CHAPTERS, CHAPTER_BY_ID, FRAGMENTS, INTRO, JOURNAL_BY_ID } from '../story';
import { QUESTS } from '../quests';
import { gameStore, live, questAvailable, useGame } from '../state';

/**
 * Интерфейс сюжетного слоя: вступление, экраны глав, трекер задания, подсказка
 * действия и дневник.
 *
 * Живёт отдельным файлом от `Hud.tsx` не для красоты: HUD уже занимает
 * семьсот строк, и складывать в него дневник с четырьмя вкладками означало бы
 * файл, в котором ничего не найти.
 *
 * Правило то же, что и во всём HUD: всё, что меняется КАЖДЫЙ КАДР (расстояние
 * до цели, кольцо удержания), пишется в DOM напрямую из общего rAF-тикера и
 * НЕ живёт в состоянии React. Расстояние в состоянии React — это шестьдесят
 * ре-рендеров в секунду на всё дерево интерфейса.
 */

const PANEL = 'rounded-2xl border border-white/12 bg-black/55 backdrop-blur-xl';

// ── Вступление ─────────────────────────────────────────────────────────

/**
 * Вступительная сцена: три экрана с завязкой. Показывается ОДИН раз — тому, у
 * кого нет никакого прогресса (см. `gameStore.ready`). Вернувшемуся игроку
 * пересказывать завязку заново — худшее, что можно сделать.
 */
export function IntroScenes() {
  const [step, setStep] = useState(0);
  const last = step >= INTRO.length - 1;

  const next = () => (last ? gameStore.introDone() : setStep((s) => s + 1));
  const prev = () => setStep((s) => Math.max(0, s - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        next();
      }
      if (e.code === 'ArrowLeft') prev();
      if (e.code === 'Escape') gameStore.introDone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, last]);

  const scene = INTRO[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, ease: EASE }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-[#0d0b08]/92 px-6"
      data-ui
    >
      <div className="w-full max-w-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <p className="mb-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-[#e6c179]/80">
              <span className="h-px w-8 bg-[#e6c179]/50" />
              {scene.eyebrow}
            </p>
            <h2 className="font-serif text-4xl leading-[1.08] text-white md:text-5xl">{scene.title}</h2>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-white/70 md:text-base">
              {scene.text}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 flex items-center gap-4">
          <button
            type="button"
            onClick={next}
            className="rounded-full bg-white px-6 py-3 text-sm font-medium text-[#171310] transition hover:bg-white/90"
          >
            {last ? 'Начать путь' : 'Дальше'}
          </button>
          <button
            type="button"
            onClick={() => gameStore.introDone()}
            className="text-sm text-white/45 transition hover:text-white/70"
          >
            Пропустить
          </button>
          <div className="ml-auto flex gap-1.5">
            {INTRO.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-6 rounded-full transition-colors ${
                  i === step ? 'bg-[#e6c179]' : 'bg-white/18'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Экран главы ────────────────────────────────────────────────────────

/** Открытие главы: полноэкранная пауза с лором. Закрывается по Esc и кнопке. */
export function ChapterCard() {
  const { chapterCard } = useGame();
  const chapter = chapterCard ? CHAPTER_BY_ID.get(chapterCard) : null;

  useEffect(() => {
    if (!chapter) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'Enter') gameStore.closeChapterCard();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chapter]);

  return (
    <AnimatePresence>
      {chapter && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          // ⚠️ pointer-events-auto обязателен: в фазе игры экран главы
          // отрисовывается ВНУТРИ контейнера HUD, у которого стоит
          // pointer-events-none (чтобы мышь проходила сквозь интерфейс к сцене).
          // Без этого класса кнопка «Продолжить путь» не нажимается вообще —
          // карточка висит на экране, и игра выглядит зависшей.
          className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
          data-ui
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.6, ease: EASE }}
            className={`${PANEL} w-full max-w-xl p-8 md:p-10`}
          >
            <p className="mb-3 text-[11px] uppercase tracking-[0.28em] text-[#e6c179]/80">
              {chapter.subtitle}
            </p>
            <h3 className="font-serif text-3xl leading-tight text-white md:text-4xl">{chapter.title}</h3>
            <p className="mt-5 text-[15px] leading-relaxed text-white/72">{chapter.lore}</p>
            <button
              type="button"
              onClick={() => gameStore.closeChapterCard()}
              className="mt-8 rounded-full bg-white px-6 py-2.5 text-sm font-medium text-[#171310] transition hover:bg-white/90"
            >
              Продолжить путь
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Трекер текущей цели ────────────────────────────────────────────────

/**
 * Подсказка «куда идти»: подпись цели и расстояние до неё.
 * Обновляется из общего rAF-тикера прямой записью в DOM.
 */
export function QuestTracker() {
  const box = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const dist = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const b = box.current;
    if (!b) return;
    let lastLabel: string | null = null;
    return onFrame(() => {
      const l = live.goalLabel;
      if (!l) {
        b.style.opacity = '0';
        return;
      }
      b.style.opacity = '1';
      if (l !== lastLabel) {
        lastLabel = l;
        if (label.current) label.current.textContent = l;
      }
      if (dist.current) dist.current.textContent = `${Math.round(live.goalDist)} м`;
    });
  }, []);

  return (
    <div
      ref={box}
      className="pointer-events-none flex max-w-full items-center gap-2.5 rounded-full border border-[#e6c179]/25 bg-black/40 px-4 py-2 text-xs text-white/80 opacity-0 backdrop-blur-md transition-opacity duration-500 sm:max-w-[19rem]"
    >
      <svg viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-[#e6c179]" aria-hidden>
        <path d="M6 1l1.6 3.3 3.4.5-2.5 2.4.6 3.4L6 9.4 2.9 10.6l.6-3.4L1 4.8l3.4-.5z" fill="currentColor" />
      </svg>
      <span ref={label} className="truncate font-medium text-white/95" />
      <span ref={dist} className="shrink-0 tabular-nums text-white/55" />
    </div>
  );
}

/**
 * Подсказка действия: «нажмите E». Для работ показывает кольцо удержания,
 * которое заполняется из `live.workProgress`.
 */
export function ActionPrompt() {
  const box = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const ring = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const b = box.current;
    if (!b) return;
    let lastHint: string | null = null;
    const C = 2 * Math.PI * 15;
    return onFrame(() => {
      const hint = live.actionHint;
      if (!hint) {
        b.style.opacity = '0';
        return;
      }
      b.style.opacity = '1';
      if (hint !== lastHint) {
        lastHint = hint;
        if (text.current) text.current.textContent = hint;
      }
      if (ring.current) {
        ring.current.style.strokeDashoffset = `${C * (1 - live.workProgress)}`;
      }
    });
  }, []);

  return (
    <div
      ref={box}
      className="pointer-events-none flex items-center gap-3 rounded-full border border-white/15 bg-black/45 px-4 py-2 text-xs text-white/85 opacity-0 backdrop-blur-md transition-opacity duration-300"
    >
      <span className="relative grid h-8 w-8 place-items-center">
        <svg viewBox="0 0 34 34" className="absolute inset-0 h-8 w-8 -rotate-90">
          <circle cx="17" cy="17" r="15" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2.5" />
          <circle
            ref={ring}
            cx="17"
            cy="17"
            r="15"
            fill="none"
            stroke="#e6c179"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 15}
            strokeDashoffset={2 * Math.PI * 15}
          />
        </svg>
        <span className="text-[10px] font-semibold text-[#e6c179]">E</span>
      </span>
      <span ref={text} />
    </div>
  );
}

// ── Дневник ────────────────────────────────────────────────────────────

type Tab = 'quests' | 'diary' | 'map' | 'shots';

const TABS: { id: Tab; label: string }[] = [
  { id: 'quests', label: 'Задания' },
  { id: 'diary', label: 'Дневник' },
  { id: 'map', label: 'Карта Мира' },
  { id: 'shots', label: 'Снимки' },
];

export function Journal() {
  const g = useGame();
  const [tab, setTab] = useState<Tab>('quests');

  useEffect(() => {
    if (!g.journalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyJ') gameStore.toggleJournal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [g.journalOpen]);

  // Активные задания — только доступные и незакрытые; выполненные уходят вниз
  // отдельным блоком, чтобы список не разрастался.
  const active = QUESTS.filter((q) => !g.questsDone.includes(q.id) && questAvailable(q.id, g.questsDone));
  const done = QUESTS.filter((q) => g.questsDone.includes(q.id));
  const diary = g.journal.map((id) => JOURNAL_BY_ID.get(id)).filter(Boolean);

  return (
    <AnimatePresence>
      {g.journalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          // pointer-events-auto — по той же причине, что и у экрана главы:
          // дневник живёт внутри HUD, сквозь который мышь проходит насквозь.
          className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-sm"
          data-ui
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, ease: EASE }}
            className={`${PANEL} flex h-full max-h-[42rem] w-full max-w-3xl flex-col overflow-hidden`}
          >
            <div className="flex items-center gap-4 border-b border-white/10 px-6 py-4">
              <h3 className="font-serif text-xl text-white">Дневник путешественника</h3>
              <span className="ml-auto text-xs text-white/45">
                Карта: {g.fragments.length} из {FRAGMENTS.length}
              </span>
              <button
                type="button"
                onClick={() => gameStore.toggleJournal()}
                aria-label="Закрыть"
                className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white/60 transition hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-1 border-b border-white/10 px-4 pt-3">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`relative rounded-t-lg px-4 py-2 text-sm transition ${
                    tab === t.id ? 'text-white' : 'text-white/45 hover:text-white/75'
                  }`}
                >
                  {t.label}
                  {tab === t.id && (
                    <motion.span
                      layoutId="journal-tab"
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#e6c179]"
                    />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {tab === 'quests' && (
                <div className="space-y-5">
                  {active.length === 0 && done.length === 0 && (
                    <p className="text-sm text-white/50">
                      Заданий пока нет. Идите к воде — с берега начинали все.
                    </p>
                  )}
                  {active.map((q) => (
                    <div key={q.id}>
                      <h4 className="font-serif text-lg text-white">{q.title}</h4>
                      <p className="mt-1 text-sm leading-relaxed text-white/60">{q.brief}</p>
                      <ul className="mt-3 space-y-1.5">
                        {q.objectives.map((o) => {
                          const ok = g.objectives.includes(o.id);
                          return (
                            <li key={o.id} className="flex items-start gap-2.5 text-sm">
                              <span
                                className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                                  ok ? 'bg-[#e6c179]' : 'bg-white/25'
                                }`}
                              />
                              <span className={ok ? 'text-white/40 line-through' : 'text-white/85'}>
                                {o.label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                  {done.length > 0 && (
                    <div className="border-t border-white/10 pt-4">
                      <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/35">
                        Закрыто
                      </p>
                      <ul className="space-y-1">
                        {done.map((q) => (
                          <li key={q.id} className="text-sm text-white/40">
                            {q.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {tab === 'diary' && (
                <div className="space-y-6">
                  {diary.length === 0 && (
                    <p className="text-sm text-white/50">
                      Дневник пуст. Записи появляются сами — по мере того, что вы находите.
                    </p>
                  )}
                  {diary.map((e) => (
                    <div key={e!.id}>
                      <h4 className="font-serif text-lg text-white">{e!.title}</h4>
                      <p className="mt-1.5 text-sm leading-relaxed text-white/65">{e!.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'map' && (
                <div className="space-y-4">
                  <p className="text-sm text-white/55">
                    Карта Мира Vela собирается из восьми частей. Каждая открывает главу истории.
                  </p>
                  <ul className="space-y-3">
                    {FRAGMENTS.map((f) => {
                      const has = g.fragments.includes(f.id);
                      return (
                        <li key={f.id} className="flex gap-3">
                          <span
                            className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                              has ? 'bg-[#e6c179]' : 'bg-white/18'
                            }`}
                          />
                          <div>
                            <p className={has ? 'text-sm text-white/90' : 'text-sm text-white/40'}>
                              {has ? f.name : 'Часть ещё не найдена'}
                            </p>
                            {has && <p className="mt-0.5 text-sm leading-relaxed text-white/55">{f.note}</p>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="border-t border-white/10 pt-4">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/35">Главы</p>
                    <ul className="space-y-2">
                      {CHAPTERS.map((c) => {
                        const open = g.chapters.includes(c.id);
                        return (
                          <li key={c.id} className="text-sm">
                            <span className={open ? 'text-white/85' : 'text-white/30'}>
                              {c.order}. {open ? c.title : '—'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}

              {tab === 'shots' && (
                <div className="space-y-4">
                  {g.snapshots.length === 0 && (
                    <p className="text-sm text-white/50">
                      Снимков нет. Рамки на стойках отмечают места, которые стоит сохранить.
                    </p>
                  )}
                  {g.snapshots.map((s) => (
                    <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-sm leading-relaxed text-white/75">{s.caption}</p>
                      <p className="mt-2 text-xs tabular-nums text-white/35">
                        {Math.round(s.at[0])}, {Math.round(s.at[1])}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Вспышка кадра: короткий белый блик, подтверждающий снимок. */
export function ShutterFlash({ token }: { token: number }) {
  return (
    <AnimatePresence>
      {token > 0 && (
        <motion.div
          key={token}
          initial={{ opacity: 0.85 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="pointer-events-none absolute inset-0 z-30 bg-white"
        />
      )}
    </AnimatePresence>
  );
}
