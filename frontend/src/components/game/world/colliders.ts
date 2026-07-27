import { HeightField, rnd } from './terrain';
import { REGIONS } from '../regions';

/**
 * Коллайдеры рукотворных объектов.
 *
 * Поле высот описывает только рельеф, поэтому камера и персонаж проходили
 * сквозь колонны руин — а в кадре это выглядело как гигантская бежевая плита
 * во весь экран, потому что камера оказывалась ВНУТРИ колонны.
 *
 * Полноценная физика тел здесь не нужна: все препятствия — вертикальные
 * цилиндры (барабаны колонн, пьедесталы статуй, скальные массивы грота).
 * Их пара десятков, и проверка «точка внутри цилиндра» стоит два умножения.
 *
 * Список чисто вычислимый и детерминированный — тот же, что использует
 * отрисовка, поэтому коллизия не может разойтись с картинкой.
 */

export type Collider = {
  x: number;
  z: number;
  r: number;
  /** Абсолютная высота верха: выше него препятствия нет. */
  top: number;
};

/**
 * Раскладка колонн руин. Единственный источник правды и для мешей, и для
 * коллизии — дублировать этот цикл в двух местах означало бы, что однажды
 * они разойдутся.
 */
export function ruinsColumns(hf: HeightField, at: [number, number]) {
  const out: { pos: [number, number, number]; h: number; broken: boolean }[] = [];
  const outer: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    outer.push([-9 + i * 4.5, -7]);
    outer.push([-9 + i * 4.5, 7]);
  }
  outer.push([-11.5, -3.5], [-11.5, 3.5], [11.5, -3.5], [11.5, 3.5]);
  outer.forEach(([dx, dz], i) => {
    out.push({
      pos: [at[0] + dx, hf.sample(at[0] + dx, at[1] + dz) - 0.2, at[1] + dz],
      h: 4.2 + rnd(i, 5) * 2.6,
      broken: rnd(i, 9) > 0.62,
    });
  });
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.15 + (i / 6) * 0.7);
    const dx = Math.cos(a) * 5.4;
    const dz = Math.sin(a) * 5.4;
    out.push({
      pos: [at[0] + dx, hf.sample(at[0] + dx, at[1] + dz) - 0.2, at[1] + dz],
      h: 3 + rnd(i, 13) * 1.6,
      broken: rnd(i, 17) > 0.5,
    });
  }
  return out;
}

let cache: { hf: HeightField; list: Collider[] } | null = null;

/** Все коллайдеры мира. Кешируются по полю высот. */
export function buildColliders(hf: HeightField): Collider[] {
  if (cache && cache.hf === hf) return cache.list;

  const list: Collider[] = [];
  const ruins = REGIONS.find((r) => r.id === 'ruins')!.at;
  const grotto = REGIONS.find((r) => r.id === 'grotto')!.at;
  const forest = REGIONS.find((r) => r.id === 'forest')!.at;
  const cove = REGIONS.find((r) => r.id === 'cove')!.at;

  // Колонны: радиус чуть больше барабана (0.56), чтобы камера не задевала
  // геометрию краем кадра.
  for (const c of ruins ? ruinsColumns(hf, ruins) : []) {
    list.push({ x: c.pos[0], z: c.pos[2], r: 0.95, top: c.pos[1] + c.h + 0.6 });
  }
  // Арка на входе в руины.
  list.push({ x: ruins[0] - 15, z: ruins[1] - 2.4, r: 1.0, top: hf.sample(ruins[0] - 15, ruins[1] - 2.4) + 5.4 });
  list.push({ x: ruins[0] - 15, z: ruins[1] + 2.4, r: 1.0, top: hf.sample(ruins[0] - 15, ruins[1] + 2.4) + 5.4 });

  // Пьедесталы статуй.
  const statues: [number, number, number][] = [
    [ruins[0], ruins[1] + 1, 1.15],
    [forest[0] + 4, forest[1] - 3, 0.9],
    [cove[0] - 9, cove[1] - 6, 0.8],
  ];
  for (const [x, z, s] of statues) {
    list.push({ x, z, r: 1.5 * s, top: hf.sample(x, z) + 4.9 * s });
  }

  // Скальные массивы грота: сферы приближаем цилиндрами.
  const gy = hf.sample(grotto[0], grotto[1]);
  list.push({ x: grotto[0], z: grotto[1] - 5.5, r: 7.2, top: gy + 10 });
  list.push({ x: grotto[0] - 5.6, z: grotto[1] - 2.2, r: 4, top: gy + 6 });
  list.push({ x: grotto[0] + 5.8, z: grotto[1] - 2.6, r: 4.4, top: gy + 6 });

  cache = { hf, list };
  return list;
}

/** Лежит ли точка внутри какого-нибудь препятствия. */
export function blocked(list: Collider[], x: number, y: number, z: number, pad = 0): boolean {
  for (const c of list) {
    if (y > c.top) continue;
    const dx = x - c.x;
    const dz = z - c.z;
    const r = c.r + pad;
    if (dx * dx + dz * dz < r * r) return true;
  }
  return false;
}
