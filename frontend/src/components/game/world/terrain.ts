/**
 * Геометрия острова Vela — вся математика мира в одном месте.
 *
 * Ключевое решение: рельеф считается на CPU один раз и живёт в Float32Array
 * (HeightField). И меш, и физика персонажа, и расстановка деревьев читают ОДНО
 * И ТО ЖЕ поле высот с билинейной интерполяцией — поэтому герой стоит ровно на
 * видимой поверхности, а не «на аналитической функции рядом с мешем».
 * Если бы физика семплировала шум напрямую, между вершинами сетки (меш там —
 * плоский треугольник) персонаж то проваливался бы, то парил.
 *
 * Шум — собственный, детерминированный по целочисленному хешу: одинаковый
 * остров на всех устройствах и при каждом заходе, без Math.random и без
 * скачивания карт высот.
 */

// ── Шум ────────────────────────────────────────────────────────────────

/** Целочисленный хеш → 0..1. Три умножения-сдвига дают достаточно «белый» шум. */
function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  // >>> 0 — приводим к беззнаковому, иначе на отрицательных координатах
  // получаются отрицательные «вероятности» и рельеф рвётся.
  return (h >>> 0) / 4294967295;
}

/** Градиент в узле решётки (единичный вектор из хеша). */
function grad(ix: number, iy: number, dx: number, dy: number): number {
  const a = hash(ix, iy) * Math.PI * 2;
  return Math.cos(a) * dx + Math.sin(a) * dy;
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Градиентный шум Перлина, −1..1. */
export function noise2(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const u = fade(fx);
  const v = fade(fy);

  const n00 = grad(ix, iy, fx, fy);
  const n10 = grad(ix + 1, iy, fx - 1, fy);
  const n01 = grad(ix, iy + 1, fx, fy - 1);
  const n11 = grad(ix + 1, iy + 1, fx - 1, fy - 1);

  const nx0 = n00 + u * (n10 - n00);
  const nx1 = n01 + u * (n11 - n01);
  return (nx0 + v * (nx1 - nx0)) * 1.4;
}

/** Фрактальный шум (сумма октав), примерно −1..1. */
export function fbm(x: number, y: number, octaves = 5, lacunarity = 2.03, gain = 0.5): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let fx = x;
  let fy = y;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(fx, fy) * amp;
    norm += amp;
    amp *= gain;
    fx *= lacunarity;
    fy *= lacunarity;
    // Поворот сетки между октавами убирает характерные «клетки» Перлина.
    const t = fx;
    fx = t * 0.8 - fy * 0.6;
    fy = t * 0.6 + fy * 0.8;
  }
  return sum / norm;
}

/**
 * Хребтовой шум: |noise| перевёрнутый и возведённый в степень — даёт острые
 * гребни и осыпающиеся склоны вместо круглых холмов fbm. 0..1.
 */
export function ridged(x: number, y: number, octaves = 5): number {
  let sum = 0;
  let amp = 0.5;
  let norm = 0;
  let fx = x;
  let fy = y;
  let prev = 1;
  for (let i = 0; i < octaves; i++) {
    const n = 1 - Math.abs(noise2(fx, fy));
    const r = n * n * prev;
    sum += r * amp;
    norm += amp;
    prev = r;
    amp *= 0.52;
    fx *= 2.07;
    fy *= 2.07;
  }
  return sum / norm;
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0 || 1));
  return t * t * (3 - 2 * t);
};

// ── Конфигурация мира ──────────────────────────────────────────────────

export const WORLD = {
  /** Половина стороны квадрата террейна. */
  half: 165,
  /** Радиус береговой линии (до модуляции шумом). */
  shore: 126,
  /** Уровень моря = 0. Пляж — всё, что ниже BEACH. */
  beach: 2.4,
  /** Максимальная высота (для нормировки цветов и туманов). */
  peak: 62,
  /** Ось горного хребта: от точки A к точке B. */
  ridgeA: [-58, -86] as [number, number],
  ridgeB: [76, -30] as [number, number],
  /** Кальдера с озером: r — радиус чаши, level — уровень воды. */
  lake: { x: 18, z: -52, r: 27, level: 15.4 },
  /**
   * Начало пути — на главной тропе над бухтой.
   * Специально ВНЕ радиуса «Бухты Зари»: при спавне внутри региона карточка
   * открытия выскакивала в первую же секунду и закрывала мир, который игрок
   * ещё не успел увидеть. Теперь до неё нужно сделать десяток шагов к воде.
   */
  spawn: [26, 82] as [number, number],
  /**
   * Водопад. Обрыв ВЫРЕЗАН в рельефе намеренно (см. RIVER): полагаться на то,
   * что шум сам сделает вертикальную стену в нужном месте, нельзя — из десяти
   * генераций подходящей не будет ни одной.
   */
  falls: {
    lip: [-30, -39.6] as [number, number],
    lipH: 28.6,
    base: [-30, -37.4] as [number, number],
    baseH: 7.4,
    width: 7.5,
  },
};

/**
 * Узел русла/тропы: [x, z, высота дна]. Высота может быть NaN — тогда она
 * берётся из рельефа (тропа ложится на землю, лишь сглаживая кочки).
 */
export type PathNode = [number, number, number];

/**
 * Река: от истока на горном склоне через водопад к Бухте Зари.
 *
 * Высоты дна заданы явно и МОНОТОННО убывают — вода в игре не считается
 * физически, но глаз мгновенно ловит «реку, текущую в гору», поэтому профиль
 * задан руками. Резкий перепад между двумя средними узлами и есть водопад.
 */
export const RIVER: PathNode[] = [
  [-31, -49, 34.5],
  [-30.5, -44, 30.6],
  [-30, -39.6, 28.6], // кромка обрыва
  [-30, -37.4, 7.4], // подножие: 21 метр вниз на 2.2 метра по горизонтали
  [-28, -31, 6.5],
  [-23, -21, 5.5],
  [-15, -7, 4.5],
  [-9, 12, 3.5],
  [-3, 34, 2.5],
  [3, 58, 1.6],
  [6, 80, 0.8],
  [7, 100, 0.05],
  [8, 120, -2.2], // устье в море
];

/**
 * Тропы. Дают острову «обжитость» и, главное, проходимость: без вырезанного
 * в валу кальдеры перевала к озеру попросту не подняться — стены чаши круче,
 * чем максимальный уклон, который берёт персонаж.
 */
export const TRAILS: PathNode[][] = [
  // Главная: от бухты вглубь острова и серпантином через перевал к озеру.
  // Профиль подобран так, чтобы уклон нигде не превышал предел ходьбы —
  // прямая линия «в лоб» на вал кальдеры давала градиент 5.4 (79°).
  [
    [12, 96, NaN],
    [16, 72, NaN],
    [20, 46, NaN],
    [24, 24, NaN],
    [28, 8, NaN],
    [31, -4, 13],
    [27, -13, 19],
    [17, -17, 23],
    [13, -24, 25.5],
    [17, -28.5, 24],
    [18, -32, 19.5],
    [18.5, -34.5, 16.6], // берег озера, чуть выше воды
  ],
  // К руинам на востоке.
  [
    [16, 88, NaN],
    [40, 78, NaN],
    [60, 64, NaN],
    [72, 52, NaN],
    [75, 45, NaN],
  ],
  // К лесу и дальше на подъём к подножию водопада. Через реку — брод с мостом
  // (см. BRIDGE): высота настила задана явно, чтобы он не «утонул».
  [
    [14, 64, NaN],
    [1, 50, 3.1],
    [-16, 46, NaN],
    [-44, 38, NaN],
    [-62, 28, NaN],
    [-58, 6, NaN],
    [-44, -18, NaN],
    [-26, -29, NaN], // выходит к пойме ниже водопада, но не трогает обрыв
  ],
  // Подъём по западному отрогу к вершине. Узлы без высоты (NaN) ложатся на
  // рельеф и сглаживают его — тропа получается «натоптанной», а не насыпной.
  [
    [-28, -27, NaN],
    [-40, -33, NaN],
    [-50, -42, NaN],
    [-52, -52, NaN],
    [-44, -60, NaN],
    [-32, -64, NaN],
    [-24, -63, NaN],
    [-19, -61, NaN],
    [-15, -59.5, NaN],
    [-12, -58, NaN],
  ],
];

/** Мост через реку на лесной тропе. */
export const BRIDGE = { x: 1, z: 50, angle: Math.PI * 0.42, span: 13, deck: 3.1 };

/** Предрасчёт сегментов пути: нормаль, длина, чтобы не считать это в цикле. */
type Seg = { ax: number; az: number; bx: number; bz: number; ah: number; bh: number; len2: number };
function buildSegs(nodes: PathNode[]): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    const [ax, az, ah] = nodes[i];
    const [bx, bz, bh] = nodes[i + 1];
    const vx = bx - ax;
    const vz = bz - az;
    out.push({ ax, az, bx, bz, ah, bh, len2: vx * vx + vz * vz || 1 });
  }
  return out;
}

const RIVER_SEGS = buildSegs(RIVER);

/**
 * Тропы: узлы с высотой NaN укладываются на рельеф. Высоты разрешаются ОДИН
 * РАЗ и кешируются.
 *
 * Раньше разрешение шло внутри `carve` через колбэк — и на каждую из 83 000
 * вершин рельефа выполнялось ~30 повторных расчётов базовой высоты. Сборка
 * поля высот занимала 2.3 секунды вместо 120 миллисекунд.
 */
/** Предельный уклон тропы, к которому стремится грейдер (tan угла). */
const TRAIL_MAX_GRADE = 0.85;

/**
 * «Грейдер»: выравнивает профиль тропы так, чтобы уклон между соседними узлами
 * не превышал TRAIL_MAX_GRADE.
 *
 * Узлы, у которых высота задана явно (перевал в валу кальдеры, настил моста), и
 * концы трассы — неподвижные опоры: их смысл в том, чтобы попасть в конкретную
 * точку. Остальные узлы подтягиваются навстречу друг другу, как при отсыпке
 * дороги — выемка сверху, подсыпка снизу. Терраформинг ниже (carve) приведёт
 * рельеф к этому профилю, поэтому тропа не повиснет в воздухе.
 *
 * Если средний уклон трассы сам выше предела (подъём на вершину — 0.72), идеала
 * не будет: грейдер просто размажет пики уклона по всей длине вместо одного
 * обрыва в 2.9.
 */
function gradeProfile(nodes: PathNode[]): PathNode[] {
  const out = nodes.map(([x, z, h]) => [x, z, Number.isNaN(h) ? heightWithRiver(x, z) : h] as PathNode);
  const fixed = nodes.map(([, , h], i) => !Number.isNaN(h) || i === 0 || i === nodes.length - 1);
  const dist = out.slice(0, -1).map((n, i) => Math.hypot(out[i + 1][0] - n[0], out[i + 1][1] - n[1]) || 1);

  for (let pass = 0; pass < 60; pass++) {
    let worst = 0;
    for (let i = 0; i < out.length - 1; i++) {
      const dh = out[i + 1][2] - out[i][2];
      const limit = dist[i] * TRAIL_MAX_GRADE;
      const over = Math.abs(dh) - limit;
      if (over <= 0.001) continue;
      worst = Math.max(worst, over);
      const sign = Math.sign(dh);
      // Излишек делим между двумя узлами; закреплённый узел не двигается,
      // и тогда весь излишек забирает подвижный сосед.
      const a = fixed[i];
      const b = fixed[i + 1];
      if (a && b) continue;
      const shareA = a ? 0 : b ? 1 : 0.5;
      const shareB = b ? 0 : a ? 1 : 0.5;
      out[i][2] += sign * over * shareA * 0.6;
      out[i + 1][2] -= sign * over * shareB * 0.6;
    }
    if (worst < 0.01) break;
  }
  return out;
}

let trailSegsCache: Seg[][] | null = null;
function trailSegs(): Seg[][] {
  if (!trailSegsCache) trailSegsCache = TRAILS.map((nodes) => buildSegs(gradeProfile(nodes)));
  return trailSegsCache;
}

/**
 * Влияние пути на рельеф в точке: вес 0..1 и целевая высота дна.
 *
 * Берётся БЛИЖАЙШИЙ сегмент, а не сегмент с максимальным весом. Разница
 * принципиальна: у обрыва водопада сегмент короткий (2 метра), и внутренний
 * радиус сглаживания перекрывает его целиком — по «максимальному весу»
 * побеждал соседний, более длинный сегмент, и обрыв просто не вырезался
 * (рельеф оставался ровным). По минимуму расстояния каждая точка честно
 * получает высоту той части русла, к которой она ближе.
 */
function carve(x: number, z: number, segs: Seg[], inner: number, outer: number) {
  let bestD = Infinity;
  let bestBed = 0;
  for (const s of segs) {
    const wx = x - s.ax;
    const wz = z - s.az;
    const vx = s.bx - s.ax;
    const vz = s.bz - s.az;
    const t = clamp01((wx * vx + wz * vz) / s.len2);
    const cx = s.ax + vx * t;
    const cz = s.az + vz * t;
    const d = Math.hypot(x - cx, z - cz);
    if (d >= bestD) continue;
    bestD = d;
    bestBed = s.ah + (s.bh - s.ah) * t;
  }
  if (bestD > outer) return { w: 0, bed: 0 };
  return { w: smoothstep(outer, inner, bestD), bed: bestBed };
}

/**
 * Площадки: локальное выравнивание под рукотворные объекты (смотровая на
 * вершине, площадь руин, балкон над обрывом). Без них статуя на склоне 33°
 * либо висит в воздухе, либо утопает основанием.
 * `h` не задан — выравниваем по высоте в центре площадки.
 */
export const FLATS: { x: number; z: number; r: number; blend: number; h?: number }[] = [
  // ⚠️ Радиусы сглаживания держим тесными: площадка вершины с blend 17
  // «выплёскивалась» в кальдеру и поднимала дно озера на 60 метров.
  // Смотровая ВРЕЗАНА в вершину (h ниже пика), а не поставлена на неё: площадка
  // на самом острие давала подход с уклоном 2.9 — по такому не поднимешься.
  { x: -12, z: -58, r: 6, blend: 18, h: 66 },
  { x: 74, z: 44, r: 17, blend: 28 }, // площадь руин
  { x: 65, z: -45, r: 6.5, blend: 12 }, // секретный балкон
  { x: -98, z: -34, r: 9, blend: 17 }, // площадка у грота
];

/** Расстояние от точки до отрезка — основа рукотворного хребта. */
function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const vx = bx - ax;
  const vz = bz - az;
  const wx = px - ax;
  const wz = pz - az;
  const len2 = vx * vx + vz * vz || 1;
  const t = clamp01((wx * vx + wz * vz) / len2);
  const cx = ax + vx * t;
  const cz = az + vz * t;
  return { d: Math.hypot(px - cx, pz - cz), t };
}

/**
 * Аналитическая высота рельефа.
 *
 * Слои складываются осознанно, а не «шум и хватит»:
 *  1. маска острова с изломанной шумом береговой линией;
 *  2. рукотворный хребет вдоль заданной оси — чтобы вершина и смотровая
 *     площадка гарантированно оказались в известной точке, а не там, где
 *     случайно повезло шуму;
 *  3. холмы fbm для средних форм;
 *  4. чаша кальдеры с озером (вычитание) и её вал;
 *  5. выравнивание пляжа у самой воды.
 */
function heightBase(x: number, z: number): number {
  const d = Math.hypot(x, z);

  // 1. Береговая линия: радиус модулирован крупным шумом → бухты и мысы.
  const coast = WORLD.shore * (1 + fbm(x * 0.0062 + 11, z * 0.0062 - 7, 3) * 0.19);
  const mask = smoothstep(coast, coast * 0.52, d);
  if (mask <= 0.0001) return -6; // дно океана — сразу и без вычислений

  // 2. Хребет: падение высоты от оси + хребтовой шум по всей длине.
  const seg = distToSegment(x, z, ...WORLD.ridgeA, ...WORLD.ridgeB);
  // Профиль вдоль оси: у концов хребет ниже, в середине — главная вершина.
  const along = 0.45 + 0.55 * Math.sin(seg.t * Math.PI);
  const across = smoothstep(74, 6, seg.d);
  const rock = ridged(x * 0.0135 + 3, z * 0.0135 + 19, 5);
  const ridge = across * along * (WORLD.peak * (0.42 + rock * 0.72));

  // 3. Холмы и мелкая пластика.
  const hills = (fbm(x * 0.0125, z * 0.0125, 5) * 0.5 + 0.5) * 13;
  const detail = fbm(x * 0.062, z * 0.062, 3) * 1.5;

  let h = mask * (2.2 + hills + ridge) + detail * mask;

  // 4. Кальдера. Внутри вала рельеф ЗАМЕНЯЕТСЯ плоским дном, а не «продавливается»
  //    пропорционально: при пропорциональном вычитании чаша получалась узкой
  //    воронкой, и озеро наливалось лужей радиусом четыре метра вместо
  //    восемнадцати. Плоское дно + плавный переход к валу дают настоящее озеро.
  const L = WORLD.lake;
  const dl = Math.hypot(x - L.x, z - L.z);
  const rim = smoothstep(L.r * 1.72, L.r * 1.14, dl) * (1 - smoothstep(L.r * 1.12, L.r * 0.92, dl));
  h += rim * 6.4;
  const bowl = smoothstep(L.r * 1.04, L.r * 0.66, dl);
  const floorH = L.level - 4.4 + fbm(x * 0.05 + 5, z * 0.05 - 3, 2) * 0.9;
  h = h * (1 - bowl) + floorH * bowl;

  // 5. Пляж: у воды рельеф выполаживается, иначе берег выглядит обрубленным.
  const beachBlend = smoothstep(coast * 0.98, coast * 0.74, d);
  h *= 0.24 + 0.76 * beachBlend;

  // Ниже нуля уходим полого — это подводный склон, а не стена.
  return h < 0 ? h * 1.9 : h;
}

/** Рельеф с рекой, но без троп — нужен как основа для «самоукладки» троп. */
function heightWithRiver(x: number, z: number): number {
  let h = heightBase(x, z);

  // Площадки выравнивают рельеф до объектов и троп, иначе тропа «ложилась бы
  // на землю» до выравнивания и повисала бы над готовой площадкой.
  for (const f of FLATS) {
    const d = Math.hypot(x - f.x, z - f.z);
    if (d > f.blend) continue;
    const w = smoothstep(f.blend, f.r, d);
    const target = f.h ?? heightBase(f.x, f.z);
    h = h * (1 - w) + target * w;
  }

  const r = carve(x, z, RIVER_SEGS, 5, 15);
  if (r.w <= 0) return h;
  // Русло не «подсыпает» рельеф: вода не может течь выше берега.
  return r.bed < h ? h * (1 - r.w) + r.bed * r.w : h;
}

/**
 * Итоговая высота: рельеф + площадки + русло реки с обрывом + тропы.
 * Тропы с высотой NaN ложатся на землю (берут высоту из heightWithRiver),
 * с заданной — прорезают перевал в валу кальдеры.
 */
export function heightAt(x: number, z: number): number {
  let h = heightWithRiver(x, z);
  for (const segs of trailSegs()) {
    const t = carve(x, z, segs, 3.4, 14);
    if (t.w > 0) h = h * (1 - t.w) + t.bed * t.w;
  }
  // Русло восстанавливаем ПОСЛЕ троп узким проходом: там, где тропа переходит
  // реку, она иначе засыпала бы брод и превратила его в плотину — вода
  // визуально текла бы в гору.
  const ford = carve(x, z, RIVER_SEGS, 3, 7.5);
  if (ford.w > 0 && ford.bed < h) h = h * (1 - ford.w) + ford.bed * ford.w;
  return h;
}

/** Насколько точка «на тропе» (0..1) — для цвета грунта и запрета растительности. */
export function trailWeight(x: number, z: number): number {
  let w = 0;
  for (const segs of trailSegs()) {
    const t = carve(x, z, segs, 2.6, 8.5);
    if (t.w > w) w = t.w;
  }
  return w;
}

/** Насколько точка в русле реки (0..1) — вода и галька вместо травы. */
export function riverWeight(x: number, z: number): number {
  return carve(x, z, RIVER_SEGS, 3.4, 9).w;
}

// ── Поле высот ─────────────────────────────────────────────────────────

export type Biome = 'sand' | 'grass' | 'forest' | 'rock' | 'snow';

/**
 * Дискретизированный рельеф. `res` — число вершин по стороне.
 * Отдаёт высоту, нормаль и уклон в любой точке с билинейной интерполяцией —
 * ровно те значения, которые видит игрок в меше.
 */
export class HeightField {
  readonly res: number;
  readonly half: number;
  readonly step: number;
  readonly heights: Float32Array;

  constructor(res: number, half = WORLD.half) {
    this.res = res;
    this.half = half;
    this.step = (half * 2) / (res - 1);
    this.heights = new Float32Array(res * res);
    for (let j = 0; j < res; j++) {
      const z = -half + j * this.step;
      for (let i = 0; i < res; i++) {
        const x = -half + i * this.step;
        this.heights[j * res + i] = heightAt(x, z);
      }
    }
  }

  /** Высота в мировых координатах (билинейно). За краем — дно океана. */
  sample(x: number, z: number): number {
    const { res, half, step, heights } = this;
    const fx = (x + half) / step;
    const fz = (z + half) / step;
    if (fx < 0 || fz < 0 || fx >= res - 1 || fz >= res - 1) return -6;
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - j;
    const h00 = heights[j * res + i];
    const h10 = heights[j * res + i + 1];
    const h01 = heights[(j + 1) * res + i];
    const h11 = heights[(j + 1) * res + i + 1];
    return (h00 * (1 - tx) + h10 * tx) * (1 - tz) + (h01 * (1 - tx) + h11 * tx) * tz;
  }

  /** Нормаль поверхности (центральные разности по шагу сетки). */
  normal(x: number, z: number, out: [number, number, number] = [0, 1, 0]) {
    const e = this.step;
    const hL = this.sample(x - e, z);
    const hR = this.sample(x + e, z);
    const hD = this.sample(x, z - e);
    const hU = this.sample(x, z + e);
    const nx = hL - hR;
    const nz = hD - hU;
    const ny = 2 * e;
    const len = Math.hypot(nx, ny, nz) || 1;
    out[0] = nx / len;
    out[1] = ny / len;
    out[2] = nz / len;
    return out;
  }

  /** Уклон 0..1 (0 — горизонталь, 1 — вертикаль). */
  slope(x: number, z: number): number {
    const n = this.normal(x, z);
    return clamp01(1 - n[1]);
  }
}

/** Биом по высоте и уклону — единый источник правды для цвета и растительности. */
export function biomeAt(h: number, slope: number): Biome {
  if (h < WORLD.beach) return 'sand';
  if (h > 44 && slope < 0.62) return 'snow';
  if (slope > 0.52 || h > 38) return 'rock';
  if (h > 7 && h < 34 && slope < 0.34) return 'forest';
  return 'grass';
}

/**
 * Детерминированная россыпь точек по площади острова.
 *
 * Спираль по золотому углу вместо Math.random: распределение равномернее
 * (нет пустот и сгустков), и главное — воспроизводимо, поэтому лес не
 * «перетасовывается» при каждом входе в игру и совпадает с коллизиями.
 */
export function* scatterPoints(count: number, radius: number, seed = 0) {
  const golden = 2.399963229;
  for (let i = 0; i < count; i++) {
    const a = i * golden + seed;
    const r = radius * Math.sqrt((i + 0.5) / count);
    yield [Math.cos(a) * r, Math.sin(a) * r, i] as [number, number, number];
  }
}

/** Псевдослучайное 0..1 по индексу — для вариаций масштаба, поворота, оттенка. */
export function rnd(i: number, salt = 0): number {
  return hash(i * 73856093 + salt * 19349663, i * 83492791 - salt * 2971215073);
}
