'use client';

import type { HeightField } from './world/terrain';
import { FRAGMENTS, FRAGMENT_BY_ID } from './story';
import { QUESTS, type Objective, type Quest } from './quests';
import { gameStore, live, questAvailable, type GameState } from './state';

/**
 * Вычислитель заданий — ЕДИНСТВЕННОЕ место, которое знает, как проверяется
 * каждый тип цели.
 *
 * Зовётся раз в кадр из игрового цикла. Внутри нет ни одного условия на
 * конкретное задание: всё решается по `objective.kind`, поэтому новое задание
 * добавляется правкой данных в `quests.ts` и не трогает эту функцию вовсе.
 *
 * Три вещи, которые здесь важны и неочевидны:
 *
 * 1. Цель зачитывается, даже если задание ещё «не выдано». Мир открыт с первой
 *    минуты, и игрок вполне может подобрать доску до того, как узнает про мост.
 *    Отказать ему («сначала возьмите задание») — значит наказать за
 *    любопытство, ради которого игра и сделана.
 *
 * 2. Задание закрывается, когда закрыты ВСЕ его цели, независимо от порядка.
 *    Порядок целей в массиве — это порядок рассказа, а не предписание.
 *
 * 3. Ничего не аллоцируется в горячем пути: ни массивов, ни объектов, ни
 *    замыканий. Это код, исполняемый шестьдесят раз в секунду.
 */

/** Радиус подбора предмета и допуск по высоте — как у артефактов. */
const PICK_RADIUS = 2.6;
const PICK_HEIGHT = 2.6;

/** Что игрок может сделать кнопкой действия прямо сейчас. */
export type PendingAction =
  | { kind: 'photo'; objective: string; quest: string; caption: string; at: [number, number] }
  | { kind: 'work'; objective: string; quest: string; seconds: number; label: string }
  | null;

/** Координаты цели — для трекера и стрелки компаса. */
function objectiveAt(o: Objective): [number, number] | null {
  if (o.kind === 'fragment') return FRAGMENT_BY_ID.get(o.fragment)?.at ?? null;
  return o.at;
}

/** Задание считается активным, если оно доступно и не завершено. */
function isActive(q: Quest, g: GameState): boolean {
  return !g.questsDone.includes(q.id) && questAvailable(q.id, g.questsDone);
}

/**
 * Один шаг проверки заданий.
 *
 * Возвращает действие, доступное игроку в этой точке (кадр/работа), — само
 * действие выполняет игровой цикл, когда увидит нажатие. Разделение нужно
 * потому, что удержание кнопки работы длится секунды и должно жить между
 * кадрами, а вычислитель не хранит состояния.
 */
export function evaluateQuests(
  g: GameState,
  hf: HeightField,
  px: number,
  py: number,
  pz: number,
): PendingAction {
  let action: PendingAction = null;

  // Ближайшая незакрытая цель — для подсказки над компасом.
  let bestLabel: string | null = null;
  let bestDist = Infinity;
  let bestX = 0;
  let bestZ = 0;

  // ── Фрагменты Карты Мира ──
  // Лежат в мире независимо от заданий: это главная коллекция игры.
  for (const f of FRAGMENTS) {
    if (g.fragments.includes(f.id)) continue;
    const d = Math.hypot(f.at[0] - px, f.at[1] - pz);
    if (d < PICK_RADIUS) {
      const dy = Math.abs(hf.sample(f.at[0], f.at[1]) + f.lift - (py + 1));
      if (dy < PICK_HEIGHT) gameStore.takeFragment(f.id);
    }
  }

  for (const q of QUESTS) {
    if (!isActive(q, g)) continue;

    let remaining = 0;
    for (const o of q.objectives) {
      if (g.objectives.includes(o.id)) continue;

      // ── Фрагмент: цель закрывается по факту сбора, проверять расстояние не нужно ──
      if (o.kind === 'fragment') {
        if (g.fragments.includes(o.fragment)) {
          gameStore.completeObjective(o.id);
          continue;
        }
        remaining++;
        const at = objectiveAt(o);
        if (at) {
          const d = Math.hypot(at[0] - px, at[1] - pz);
          if (d < bestDist) {
            bestDist = d;
            bestLabel = o.label;
            bestX = at[0];
            bestZ = at[1];
          }
        }
        continue;
      }

      const d = Math.hypot(o.at[0] - px, o.at[1] - pz);

      switch (o.kind) {
        case 'reach':
          if (d < o.radius) {
            if (gameStore.completeObjective(o.id)) gameStore.objectiveToast(o.label);
          } else {
            remaining++;
          }
          break;

        case 'pickup':
          if (d < PICK_RADIUS && Math.abs(hf.sample(o.at[0], o.at[1]) + o.lift - (py + 1)) < PICK_HEIGHT) {
            if (gameStore.completeObjective(o.id)) gameStore.objectiveToast(o.label);
          } else {
            remaining++;
          }
          break;

        case 'photo':
          remaining++;
          // Кадр не делается сам: игрок должен нажать кнопку, стоя в точке.
          if (d < o.radius && !action) {
            action = {
              kind: 'photo',
              objective: o.id,
              quest: q.id,
              caption: o.caption,
              at: [px, pz],
            };
          }
          break;

        case 'work': {
          remaining++;
          if (d > o.radius) break;
          // Работа доступна, только если собрано всё, что для неё нужно:
          // предметы этого же задания. Иначе игрок «починит» мост, не найдя
          // ни одной доски, и задание потеряет смысл.
          const needs = q.objectives.filter((x) => x.kind === 'pickup');
          const ready = needs.every((x) => g.objectives.includes(x.id));
          if (ready && !action) {
            action = { kind: 'work', objective: o.id, quest: q.id, seconds: o.seconds, label: o.label };
          } else if (!ready) {
            const have = needs.filter((x) => g.objectives.includes(x.id)).length;
            live.actionHint = `Нужны все части: ${have} из ${needs.length}`;
          }
          break;
        }
      }

      // Ближайшая цель для трекера. Считаем только незакрытые.
      if (!g.objectives.includes(o.id) && d < bestDist) {
        bestDist = d;
        bestLabel = o.label;
        bestX = o.at[0];
        bestZ = o.at[1];
      }
    }

    if (remaining === 0) gameStore.finishQuest(q.id);
  }

  live.goalLabel = bestLabel;
  live.goalDist = bestDist === Infinity ? 0 : bestDist;
  live.goalX = bestX;
  live.goalZ = bestZ;

  return action;
}

/** Сколько фрагментов собрано и сколько всего — для интерфейса. */
export function fragmentProgress(fragments: string[]) {
  return { done: fragments.length, total: FRAGMENTS.length };
}
