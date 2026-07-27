'use client';

import { useSyncExternalStore } from 'react';
import type { Region } from './regions';

/**
 * Состояние игры разделено на две части — это главное архитектурное решение
 * игрового слоя.
 *
 *  • `gameStore` — ДИСКРЕТНОЕ состояние (что открыто, какая карточка показана,
 *    фаза загрузки). Меняется редко, живёт в React через useSyncExternalStore.
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
};

// ── Дискретное состояние ───────────────────────────────────────────────
export type Phase = 'loading' | 'briefing' | 'play';

export type GameState = {
  phase: Phase;
  /** id открытых регионов. */
  discovered: string[];
  /** id собранных артефактов. */
  artifacts: string[];
  /** Регион, карточка которого раскрыта сейчас. */
  card: Region | null;
  /** Короткое сообщение (артефакт, подсказка). */
  toast: { id: number; text: string; kind: 'artifact' | 'info' } | null;
  /** Показывать карту. */
  mapOpen: boolean;
  paused: boolean;
};

const STORAGE_KEY = 'vela_island_progress';

function loadProgress(): { discovered: string[]; artifacts: string[] } {
  if (typeof window === 'undefined') return { discovered: [], artifacts: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { discovered: [], artifacts: [] };
    const p = JSON.parse(raw) as { discovered?: unknown; artifacts?: unknown };
    return {
      discovered: Array.isArray(p.discovered) ? p.discovered.filter((v): v is string => typeof v === 'string') : [],
      artifacts: Array.isArray(p.artifacts) ? p.artifacts.filter((v): v is string => typeof v === 'string') : [],
    };
  } catch {
    // Испорченный localStorage не должен ломать игру — просто начнём заново.
    return { discovered: [], artifacts: [] };
  }
}

let state: GameState = {
  phase: 'loading',
  discovered: [],
  artifacts: [],
  card: null,
  toast: null,
  mapOpen: false,
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
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ discovered: state.discovered, artifacts: state.artifacts }),
    );
  } catch {
    // Приватный режим / переполнение — прогресс просто не сохранится.
  }
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
    set({ discovered: p.discovered, artifacts: p.artifacts });
  },

  ready() {
    if (state.phase === 'loading') set({ phase: 'briefing' });
  },
  start() {
    set({ phase: 'play', card: null });
  },

  discover(region: Region) {
    if (state.discovered.includes(region.id)) return;
    set({ discovered: [...state.discovered, region.id], card: region, paused: true });
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
  info(text: string) {
    set({ toast: { id: ++toastSeq, text, kind: 'info' } });
  },
  clearToast() {
    set({ toast: null });
  },

  toggleMap() {
    set({ mapOpen: !state.mapOpen });
  },
  setPaused(v: boolean) {
    set({ paused: v });
  },

  reset() {
    set({ discovered: [], artifacts: [], card: null, toast: null });
    persist();
  },
};

/** Подписка на дискретное состояние. Серверный снапшот — начальное состояние. */
export function useGame(): GameState {
  return useSyncExternalStore(gameStore.subscribe, gameStore.get, gameStore.get);
}
