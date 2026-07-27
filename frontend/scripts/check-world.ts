/** Проверка рельефа: время сборки, проходимость троп, вода на месте. */
import {
  BASINS,
  HeightField,
  RIVERS,
  TRAILS,
  WORLD,
  ZONES,
  heightAt,
  riverWeight,
  surfaceAt,
  waterLevelAt,
  zoneAt,
} from '../src/components/game/world/terrain.ts';
import {
  ARTIFACTS,
  REGIONS,
} from '../src/components/game/regions.ts';

const RES = { low: 281, mid: 401, high: 561 };

for (const [tier, res] of Object.entries(RES)) {
  const t0 = performance.now();
  const hf = new HeightField(res).buildAll();
  const ms = performance.now() - t0;
  console.log(`${tier.padEnd(5)} res=${res}  ${ms.toFixed(0)} ms   ${(hf.heights.byteLength / 1048576).toFixed(1)} MB`);
}

const hf = new HeightField(561).buildAll();

// ── Спавн ──
const [sx, sz] = WORLD.spawn;
console.log(`\nспавн (${sx}, ${sz}) h=${hf.sample(sx, sz).toFixed(1)} зона=${zoneAt(sx, sz).name}`);

// ── Экстремумы ──
let min = Infinity;
let max = -Infinity;
let land = 0;
for (let i = 0; i < hf.heights.length; i++) {
  const h = hf.heights[i];
  if (h < min) min = h;
  if (h > max) max = h;
  if (h > 0) land++;
}
console.log(`высоты: ${min.toFixed(1)} … ${max.toFixed(1)} м; суша ${((land / hf.heights.length) * 100).toFixed(1)}%`);

// ── Зоны: высота в центре, тип поверхности ──
console.log('\nзоны:');
for (const z of ZONES) {
  const [x, zz] = z.center;
  const h = hf.sample(x, zz);
  const s = surfaceAt(x, zz, h, hf.slope(x, zz));
  console.log(`  ${z.name.padEnd(26)} h=${h.toFixed(1).padStart(6)}  ${s}`);
}

// ── Чаши: дно должно быть ниже зеркала, вал — выше ──
console.log('\nчаши (вал = минимум по кругу: где ниже зеркала, там озеро вытечет):');
for (const b of BASINS) {
  const floor = hf.sample(b.x, b.z);
  let rimMin = Infinity;
  let at = 0;
  for (let k = 0; k < 64; k++) {
    const a = (k / 64) * Math.PI * 2;
    // Луч, идущий по руслу, пропускаем: сток — это и есть законный проран
    // в вале, через него озеро и должно уходить.
    let onRiver = false;
    for (let t = 0.9; t <= 1.8; t += 0.05) {
      if (riverWeight(b.x + Math.cos(a) * b.r * t, b.z + Math.sin(a) * b.r * t) > 0.15) onRiver = true;
    }
    if (onRiver) continue;
    // Ищем самую высокую точку вала по лучу — вытекает через седловину,
    // а не через первую попавшуюся точку на фиксированном радиусе.
    let best = -Infinity;
    for (let t = 1.0; t <= 1.75; t += 0.05) {
      best = Math.max(best, hf.sample(b.x + Math.cos(a) * b.r * t, b.z + Math.sin(a) * b.r * t));
    }
    if (best < rimMin) {
      rimMin = best;
      at = Math.round((a * 180) / Math.PI);
    }
  }
  const ok = floor < b.level - 0.5 && rimMin > b.level + 0.5;
  console.log(
    `  ${b.id.padEnd(7)} дно=${floor.toFixed(1).padStart(6)} зеркало=${String(b.level).padStart(5)} вал=${rimMin.toFixed(1).padStart(6)} (азимут ${at}°) ${ok ? 'ok' : floor >= b.level - 0.5 ? '⚠ ЛУЖА' : '⚠ ВЫТЕЧЕТ'}`,
  );
}

// ── Реки: профиль обязан убывать, русло — быть ниже берегов ──
console.log('\nреки:');
RIVERS.forEach((r, i) => {
  let bad = 0;
  for (let k = 0; k < r.length - 1; k++) if (r[k + 1][2] > r[k][2]) bad++;
  // Русло должно быть ниже ОБОИХ берегов: если ниже только одного, река просто
  // идёт по склону — это нормально. Если выше обоих, она течёт по гребню.
  let ridgeRun = 0;
  for (const [x, z, h] of r) {
    const a = hf.sample(x + 16, z);
    const b = hf.sample(x - 16, z);
    if (a < h && b < h) ridgeRun++;
  }
  console.log(`  река ${i}: подъёмов=${bad} узлов-на-гребне=${ridgeRun}/${r.length}`);
});

// ── Тропы: уклон между семплами вдоль трассы ──
const MAX_SLOPE = 0.5;
console.log('\nтропы (макс. уклон в метрике 1−n.y, предел ходьбы 0.50):');
TRAILS.forEach((nodes, i) => {
  let worst = 0;
  let worstAt: [number, number] = [0, 0];
  let underwater = 0;
  let samples = 0;
  for (let k = 0; k < nodes.length - 1; k++) {
    const [ax, az] = nodes[k];
    const [bx, bz] = nodes[k + 1];
    const len = Math.hypot(bx - ax, bz - az);
    const steps = Math.max(2, Math.ceil(len / 2));
    for (let t = 0; t <= steps; t++) {
      const x = ax + ((bx - ax) * t) / steps;
      const z = az + ((bz - az) * t) / steps;
      const s = hf.slope(x, z);
      samples++;
      if (s > worst) {
        worst = s;
        worstAt = [Math.round(x), Math.round(z)];
      }
      if (hf.sample(x, z) < waterLevelAt(x, z) - 1.15) underwater++;
    }
  }
  const flag = worst > MAX_SLOPE ? ' ⚠ НЕПРОХОДИМО' : '';
  console.log(
    `  тропа ${i}: макс=${worst.toFixed(2)} в (${worstAt[0]}, ${worstAt[1]}) под водой ${underwater}/${samples}${flag}`,
  );
});

// ── Связность: куда реально можно дойти пешком от спавна ──
// Самый важный тест для мира такого размера: процедурная генерация охотно
// отрезает целые регионы стеной уклона, и заметить это на глаз нельзя.
{
  const res = hf.res;
  const step = hf.step;
  const seen = new Uint8Array(res * res);
  const at = (i: number, j: number) => -WORLD.half + i * step;
  const idxOf = (x: number, z: number) => {
    const i = Math.round((x + WORLD.half) / step);
    const j = Math.round((z + WORLD.half) / step);
    return j * res + i;
  };
  const passable = (i: number, j: number) => {
    const x = at(i, j);
    const z = -WORLD.half + j * step;
    const h = hf.heights[j * res + i];
    if (h < waterLevelAt(x, z) - 1.15) return false;
    return hf.slope(x, z) <= 0.5;
  };

  const queue = [idxOf(WORLD.spawn[0], WORLD.spawn[1])];
  seen[queue[0]] = 1;
  let reached = 0;
  while (queue.length) {
    const n = queue.pop()!;
    reached++;
    const i = n % res;
    const j = (n - i) / res;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 1 || nj < 1 || ni >= res - 1 || nj >= res - 1) continue;
      const k = nj * res + ni;
      if (seen[k]) continue;
      if (!passable(ni, nj)) continue;
      seen[k] = 1;
      queue.push(k);
    }
  }
  let walkable = 0;
  for (let j = 1; j < res - 1; j++) for (let i = 1; i < res - 1; i++) if (passable(i, j)) walkable++;
  console.log(
    `\nсвязность: дошли до ${reached} из ${walkable} проходимых клеток (${((reached / walkable) * 100).toFixed(1)}%)`,
  );

  const poi: [string, number, number][] = [
    ...REGIONS.map((r) => [`регион ${r.name}`, r.at[0], r.at[1]] as [string, number, number]),
    ...ARTIFACTS.map((a) => [`артефакт ${a.name}`, a.at[0], a.at[1]] as [string, number, number]),
  ];
  for (const [name, x, z] of poi) {
    // Ищем ближайшую достижимую клетку — сама точка может оказаться в воде
    // или на камне, важно, что рядом можно стоять.
    let ok = false;
    for (let r = 0; r <= 8 && !ok; r++) {
      for (let a = 0; a < 16 && !ok; a++) {
        const px = x + Math.cos((a / 16) * 6.283) * r * step * 2;
        const pz = z + Math.sin((a / 16) * 6.283) * r * step * 2;
        const i = Math.round((px + WORLD.half) / step);
        const j = Math.round((pz + WORLD.half) / step);
        if (i > 0 && j > 0 && i < res - 1 && j < res - 1 && seen[j * res + i]) ok = true;
      }
    }
    console.log(`  ${ok ? '✓' : '✗ НЕДОСТИЖИМО'}  ${name}`);
  }
}

// ── Разрез подъёма на вершину ──
console.log('\nразрез тропы 4 (подъём на хребет), последние 60 м:');
{
  const a: [number, number] = [0, -260];
  const b: [number, number] = [16, -282];
  for (let t = -0.6; t <= 1.01; t += 0.1) {
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[1] + (b[1] - a[1]) * t;
    console.log(
      `  t=${t.toFixed(1).padStart(4)} (${x.toFixed(0).padStart(4)},${z.toFixed(0).padStart(5)}) ` +
        `h=${hf.sample(x, z).toFixed(1).padStart(6)} уклон=${hf.slope(x, z).toFixed(2)}`,
    );
  }
}

// ── Карта ──
// Печатаем сушу символами по высоте: быстрее любого описания показывает,
// где материк, где океан и куда уехали хребты.
console.log('\nкарта (запад←→восток, север сверху):');
const W = 96;
const H = 44;
const ramp = ' ·:-=+*#%@';
for (let r = 0; r < H; r++) {
  const z = -WORLD.half + ((r + 0.5) / H) * WORLD.half * 2;
  let line = '';
  for (let c = 0; c < W; c++) {
    const x = -WORLD.half + ((c + 0.5) / W) * WORLD.half * 2;
    const h = hf.sample(x, z);
    const wl = waterLevelAt(x, z);
    if (h < wl) line += h < wl - 6 ? '~' : ',';
    else line += ramp[Math.min(9, Math.max(0, Math.floor((h / WORLD.peak) * 9) + 1))];
  }
  console.log('  ' + line);
}

// ── Стоимость heightAt (для оценки сборки) ──
const t1 = performance.now();
let acc = 0;
for (let i = 0; i < 20000; i++) acc += heightAt((i % 800) - 400, ((i * 7) % 800) - 400);
console.log(`\nheightAt: ${(((performance.now() - t1) * 1000) / 20000).toFixed(2)} мкс/вызов (acc=${acc.toFixed(0)})`);
