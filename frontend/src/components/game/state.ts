'use client';

import { useSyncExternalStore } from 'react';
import type { Region } from './regions';
import { CHAPTERS, FRAGMENTS, JOURNAL_BY_ID, OPENING_JOURNAL, REGION_JOURNAL } from './story';
import { QUESTS, QUEST_BY_ID } from './quests';

/**
 * Состояние игры разделено на две части — это главное архитектурное решение
 * игрового слоя.
 *
 *  • `gameStore` — ДИСКРЕТНОЕ состояние (что открыто, какая карточка показана,
 *    фаза загрузки, задания, дневник). Меняется редко, живёт в React через
 *    useSyncExternalStore.
 *
 *  • `live` — НЕПРЕРЫВНОЕ состояние (позиция героя, курс камеры, FPS). Меняется
 *    каждый кадр и поэтому НЕ хранится в React вообще: компас и мини-карта
 *    читают этот объект в своём rAF и пишут прямо в DOM. Положи позицию в
 *    состояние React — и получишь 60 ре-рендеров в секунду на всё дерево HUD.
 */

// ── Непрерывное состояние (без React) ──────────────────────────────────
export const live = {
  x: 0,
  y: 0,
  z: 0,
  /** Курс героя, рад (0 = на -Z, «север»). */
  yaw: 0,
  /** Курс камеры, рад. */
  camYaw: 0,
  /** Горизонтальная скорость, м/с. */
  speed: 0,
  grounded: true,
  fps: 60,
  /** Ближайший ещё не открытый регион и расстояние до него. */
  hintId: null as string | null,
  hintDist: 0,
  /**
   * Ближайшая активная цель задания: подпись и расстояние. Живёт здесь, а не в
   * React, потому что трекер над компасом обновляет расстояние каждый кадр.
   */
  goalLabel: null as string | null,
  goalDist: 0,
  /** Направление на цель в мировых координатах — для стрелки компаса. */
  goalX: 0,
  goalZ: 0,
  /**
   * Прогресс удержания кнопки действия (0..1) на месте работ. Тоже покадровый:
   * это заполняющееся кольцо на экране.
   */
  workProgress: 0,
  /** Можно ли сейчас нажать действие и что оно сделает. */
  actionHint: null as string | null,
};

// ── Дискретное состояние ───────────────────────────────────────────────
export type Phase = 'loading' | 'intro' | 'briefing' | 'play';

/** Снимок, сделанный игроком по заданию «сохранить вид». */
export type Snapshot = { id: string; caption: string; at: [number, number] };

export type GameState = {
  phase: Phase;
  /** id открытых регионов. */
  discovered: string[];
  /** id собранных артефактов. */
  artifacts: string[];
  /** id собранных фрагментов Карты Мира. */
  fragments: string[];
  /** id выполненных целей заданий. */
  objectives: string[];
  /** id завершённых заданий. */
  questsDone: string[];
  /** id открытых записей дневника. */
  journal: string[];
  /** id открытых глав. */
  chapters: string[];
  /** Сделанные снимки. */
  snapshots: Snapshot[];
  /** Выполненные работы: мост починен, ворота открыты. */
  works: string[];
  /** Регион, карточка которого раскрыта сейчас. */
  card: Region | null;
  /** Глава, экран которой раскрыт сейчас. */
  chapterCard: string | null;
  /** Короткое сообщение (артефакт, подсказка, шаг задания). */
  toast: { id: number; text: string; kind: 'artifact' | 'info' | 'quest' } | null;
  /** Показывать карту. */
  mapOpen: boolean;
  /** Показывать дневник. */
  journalOpen: boolean;
  paused: boolean;
};

const STORAGE_KEY = 'vela_island_progress';

/** Что именно попадает в localStorage. */
type SaveV2 = {
  v: 2;
  discovered: string[];
  artifacts: string[];
  fragments: string[];
  objectives: string[];
  questsDone: string[];
  journal: string[];
  chapters: string[];
  snapshots: Snapshot[];
  works: string[];
};

const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * Читает сохранение и приводит его к текущей форме.
 *
 * Миграция с версии 1 обязательна: у игры уже есть игроки, и в их
 * localStorage лежит `{ discovered, artifacts }` без всякой версии. Молча
 * отбросить это — значит обнулить чужой прогресс при обновлении сайта.
 * Поэтому отсутствие поля `v` трактуется как версия 1, а не как мусор.
 */
function loadProgress(): SaveV2 {
  const empty: SaveV2 = {
    v: 2,
    discovered: [],
    artifacts: [],
    fragments: [],
    objectives: [],
    questsDone: [],
    journal: [],
    chapters: [],
    snapshots: [],
    works: [],
  };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return empty;
    const p = JSON.parse(raw) as Record<string, unknown>;

    const base: SaveV2 = {
      ...empty,
      discovered: strings(p.discovered),
      artifacts: strings(p.artifacts),
    };
    // Версия 1: только открытые регионы и артефакты. Всё остальное начинается
    // с нуля, но пройденный мир у игрока сохраняется.
    if (p.v !== 2) return base;

    return {
      ...base,
      fragments: strings(p.fragments),
      objectives: strings(p.objectives),
      questsDone: strings(p.questsDone),
      journal: strings(p.journal),
      chapters: strings(p.chapters),
      works: strings(p.works),
      snapshots: Array.isArray(p.snapshots)
        ? (p.snapshots as unknown[])
            .filter(
              (s): s is Snapshot =>
                !!s &&
                typeof s === 'object' &&
                typeof (s as Snapshot).id === 'string' &&
                typeof (s as Snapshot).caption === 'string',
            )
            .map((s) => ({ id: s.id, caption: s.caption, at: s.at ?? [0, 0] }))
        : [],
    };
  } catch {
    // Испорченный localStorage не должен ломать игру — просто начнём заново.
    return empty;
  }
}

let state: GameState = {
  phase: 'loading',
  discovered: [],
  artifacts: [],
  fragments: [],
  objectives: [],
  questsDone: [],
  journal: [],
  chapters: [],
  snapshots: [],
  works: [],
  card: null,
  chapterCard: null,
  toast: null,
  mapOpen: false,
  journalOpen: false,
  paused: false,
};

const listeners = new Set<() => void>();
let toastSeq = 0;

function set(patch: Partial<GameState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

function persist() {
  if (typeof window === 'undefined') return;
  try {
    const save: SaveV2 = {
      v: 2,
      discovered: state.discovered,
      artifacts: state.artifacts,
      fragments: state.fragments,
      objectives: state.objectives,
      questsDone: state.questsDone,
      journal: state.journal,
      chapters: state.chapters,
      snapshots: state.snapshots,
      works: state.works,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // Приватный режим / переполнение — прогресс просто не сохранится.
  }
}

/**
 * Задание доступно, если выполнены его предусловия. Мир при этом НЕ запирается:
 * недоступное задание просто не показывается в журнале, а прийти в его место и
 * подобрать предмет можно всегда — цель зачтётся, когда задание откроется.
 */
export function questAvailable(id: string, done: string[]): boolean {
  const q = QUEST_BY_ID.get(id);
  if (!q?.requires) return true;
  return q.requires.every((r) => done.includes(r));
}

export const gameStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => state,

  /** Восстановить прогресс прошлых заходов (вызывается один раз при монтировании). */
  hydrate() {
    const p = loadProgress();
    set({
      discovered: p.discovered,
      artifacts: p.artifacts,
      fragments: p.fragments,
      objectives: p.objectives,
      questsDone: p.questsDone,
      journal: p.journal,
      chapters: p.chapters,
      snapshots: p.snapshots,
      works: p.works,
    });
  },

  ready() {
    if (state.phase !== 'loading') return;
    // Вступление показываем только тем, кто здесь впервые. Вернувшемуся игроку
    // пересказывать завязку в четвёртый раз — худшее, что можно сделать.
    const seen = state.chapters.length > 0 || state.discovered.length > 0;
    set({ phase: seen ? 'briefing' : 'intro' });
  },
  /** Вступление прочитано — переходим к брифингу с облётом. */
  introDone() {
    if (state.phase === 'intro') set({ phase: 'briefing' });
  },
  start() {
    set({ phase: 'play', card: null });
    // Первая глава открывается в момент первого шага, а не на экране загрузки:
    // иначе игрок читает лор до того, как увидел мир.
    gameStore.addJournal(OPENING_JOURNAL);
    gameStore.openChapter('shore');
  },

  discover(region: Region) {
    if (state.discovered.includes(region.id)) return;
    set({ discovered: [...state.discovered, region.id], card: region, paused: true });
    // Часть дневника открывается самим приходом в регион, без заданий: гулять
    // здесь и есть основное занятие, и оно должно вознаграждаться.
    const entry = REGION_JOURNAL[region.id];
    if (entry) gameStore.addJournal(entry);
    persist();
  },
  /** Повторный вход в уже открытый регион — показываем карточку без «открытия». */
  revisit(region: Region) {
    if (state.card) return;
    set({ card: region, paused: true });
  },
  closeCard() {
    set({ card: null, paused: false });
  },

  collect(id: string, name: string) {
    if (state.artifacts.includes(id)) return;
    set({
      artifacts: [...state.artifacts, id],
      toast: { id: ++toastSeq, text: name, kind: 'artifact' },
    });
    persist();
  },

  // ── Сюжет ──

  openChapter(id: string) {
    if (state.chapters.includes(id)) return;
    if (!CHAPTERS.some((c) => c.id === id)) return;
    set({ chapters: [...state.chapters, id], chapterCard: id, paused: true });
    persist();
  },
  closeChapterCard() {
    set({ chapterCard: null, paused: false });
  },

  /** Фрагмент Карты Мира: открывает следующую главу. */
  takeFragment(id: string) {
    if (state.fragments.includes(id)) return;
    const frag = FRAGMENTS.find((f) => f.id === id);
    const fragments = [...state.fragments, id];
    set({
      fragments,
      toast: { id: ++toastSeq, text: frag?.name ?? 'Фрагмент карты', kind: 'artifact' },
    });
    persist();
    // Глава открывается СЛЕДУЮЩИМ кадром состояния, поэтому вызываем после set:
    // экран главы должен лечь поверх уже обновлённого счётчика фрагментов.
    if (frag?.chapter) gameStore.openChapter(frag.chapter);
  },

  addJournal(id: string) {
    if (state.journal.includes(id) || !JOURNAL_BY_ID.has(id)) return;
    set({ journal: [...state.journal, id] });
    persist();
  },

  // ── Задания ──

  /** Отметить цель выполненной. Возвращает true, если это что-то изменило. */
  completeObjective(id: string): boolean {
    if (state.objectives.includes(id)) return false;
    set({ objectives: [...state.objectives, id] });
    persist();
    return true;
  },

  /** Завершить задание: тост, запись в дневник. */
  finishQuest(id: string) {
    if (state.questsDone.includes(id)) return;
    const q = QUEST_BY_ID.get(id);
    if (!q) return;
    set({
      questsDone: [...state.questsDone, id],
      toast: { id: ++toastSeq, text: q.reward.note, kind: 'quest' },
    });
    if (q.reward.journal) gameStore.addJournal(q.reward.journal);
    persist();
  },

  /** Шаг задания выполнен — короткое подтверждение, чтобы прогресс был виден. */
  objectiveToast(text: string) {
    set({ toast: { id: ++toastSeq, text, kind: 'quest' } });
  },

  addWork(id: string) {
    if (state.works.includes(id)) return;
    set({ works: [...state.works, id] });
    persist();
  },

  addSnapshot(s: Snapshot) {
    if (state.snapshots.some((x) => x.id === s.id)) return;
    set({ snapshots: [...state.snapshots, s] });
    persist();
  },

  info(text: string) {
    set({ toast: { id: ++toastSeq, text, kind: 'info' } });
  },
  clearToast() {
    set({ toast: null });
  },

  toggleMap() {
    set({ mapOpen: !state.mapOpen, journalOpen: false });
  },
  toggleJournal() {
    set({ journalOpen: !state.journalOpen, mapOpen: false });
  },
  setPaused(v: boolean) {
    set({ paused: v });
  },

  reset() {
    set({
      discovered: [],
      artifacts: [],
      fragments: [],
      objectives: [],
      questsDone: [],
      journal: [],
      chapters: [],
      snapshots: [],
      works: [],
      card: null,
      chapterCard: null,
      toast: null,
    });
    persist();
  },
};

/**
 * Замер ли герой. Условие ВЫЧИСЛЯЕТСЯ по всем открытым окнам, а не хранится
 * флагом.
 *
 * Флаг `paused` каждое окно ставило и снимало само, и при двух окнах сразу
 * (открытие региона плюс открытие главы — обычное дело, они срабатывают в
 * одной точке) закрытие первого снимало паузу, пока второе ещё висело на
 * экране: герой уходил гулять за модальным окном, а игрок этого не видел.
 */
export function isFrozen(g: GameState): boolean {
  return g.paused || !!g.card || !!g.chapterCard || g.journalOpen || g.mapOpen;
}

/** Подписка на дискретное состояние. Серверный снапшот — начальное состояние. */
export function useGame(): GameState {
  return useSyncExternalStore(gameStore.subscribe, gameStore.get, gameStore.get);
}

/** Сколько всего заданий и сколько закрыто — для журнала и блока на главной. */
export function questProgress(done: string[]) {
  return { done: done.length, total: QUESTS.length };
}
