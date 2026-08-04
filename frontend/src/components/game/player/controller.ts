'use client';

import * as THREE from 'three';
import {
  HeightField,
  WORLD,
  waterLevelAt,
  surfaceAt,
  SURFACE_GRIP,
  type Surface,
} from '../world/terrain';
import { blocked, buildColliders } from '../world/colliders';

/**
 * Управление и физика путешественника.
 *
 * Физика своя, без cannon/rapier: у нас единственное подвижное тело и рельеф,
 * заданный полем высот. Точная высота земли известна аналитически, поэтому
 * «капсула против меша» здесь была бы миллионом лишних проверок и мегабайтом
 * зависимости ради того, что делают двадцать строк.
 */

// ── Ввод ───────────────────────────────────────────────────────────────

export const input = {
  /** −1..1 вперёд/назад в системе камеры. */
  forward: 0,
  /** −1..1 вправо/влево. */
  strafe: 0,
  run: false,
  /** Прыжок ставится в очередь и «живёт» 150 мс: нажатие за миг до касания
   *  земли всё равно сработает — иначе прыжок ощущается как рулетка. */
  jumpAt: -1,
  /** Накопленное движение мыши для орбиты камеры. */
  lookX: 0,
  lookY: 0,
  /** Накопленный зум. */
  zoom: 0,
  /** Тач-джойстик активен. */
  touch: false,
  /**
   * Кнопка действия (E) удерживается. Не «нажата один раз», а именно
   * УДЕРЖИВАЕТСЯ: работы вроде укладки настила требуют пары секунд, и
   * одиночное событие нажатия для них не подходит.
   */
  action: false,
  /**
   * Момент нажатия действия, буфер на 180 мс — ровно как у прыжка.
   *
   * Короткое нажатие целиком укладывается между двумя кадрами: keydown и keyup
   * приходят раньше, чем игровой цикл успевает прочитать `action`, и снимок
   * просто не делается. С буфером «щелчок» ловится независимо от того, куда он
   * попал по времени. Потребитель обязан сбросить значение в −1, иначе одно
   * нажатие сработает несколько кадров подряд.
   */
  actionAt: -1,
};

/**
 * Физический код клавиши, устойчивый к событиям без `code`.
 *
 * Управление держится на `event.code` осознанно: это ФИЗИЧЕСКАЯ клавиша, и
 * WASD работает одинаково в любой раскладке (на русской та же клавиша даёт
 * `key = 'ц'`, но `code = 'KeyW'`).
 *
 * Беда в том, что `code` заполнен не всегда: экранные и виртуальные клавиатуры,
 * часть программ доступности и синтетические события шлют только `key`, оставляя
 * `code` пустым. Тогда игра просто не реагировала на нажатия — молча, потому что
 * сравнение с 'KeyE' даёт false, а не ошибку. Здесь мы достраиваем код по `key`,
 * когда его нет; при заполненном `code` поведение не меняется совсем.
 */
const NAMED_KEYS: Record<string, string> = {
  ' ': 'Space',
  Spacebar: 'Space',
  Escape: 'Escape',
  Esc: 'Escape',
  Tab: 'Tab',
  Enter: 'Enter',
  Shift: 'ShiftLeft',
  ArrowUp: 'ArrowUp',
  ArrowDown: 'ArrowDown',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
};

export function keyCodeOf(e: KeyboardEvent): string {
  if (e.code) return e.code;
  const k = e.key;
  if (!k) return '';
  if (NAMED_KEYS[k]) return NAMED_KEYS[k];
  if (k.length === 1) {
    const up = k.toUpperCase();
    if (up >= 'A' && up <= 'Z') return `Key${up}`;
    if (up >= '0' && up <= '9') return `Digit${up}`;
  }
  return k;
}

const KEYS_FWD = ['KeyW', 'ArrowUp'];
const KEYS_BACK = ['KeyS', 'ArrowDown'];
const KEYS_LEFT = ['KeyA', 'ArrowLeft'];
const KEYS_RIGHT = ['KeyD', 'ArrowRight'];

/**
 * Подключает клавиатуру, мышь и тач. Возвращает функцию отключения.
 * `onKey` — хук для «горячих» клавиш интерфейса (карта, Esc).
 */
export function attachInput(
  target: HTMLElement,
  onKey?: (code: string) => void,
): () => void {
  const down = new Set<string>();

  const recompute = () => {
    let f = 0;
    let s = 0;
    for (const c of KEYS_FWD) if (down.has(c)) f += 1;
    for (const c of KEYS_BACK) if (down.has(c)) f -= 1;
    for (const c of KEYS_RIGHT) if (down.has(c)) s += 1;
    for (const c of KEYS_LEFT) if (down.has(c)) s -= 1;
    input.forward = Math.max(-1, Math.min(1, f));
    input.strafe = Math.max(-1, Math.min(1, s));
    input.run = down.has('ShiftLeft') || down.has('ShiftRight');
    input.action = down.has('KeyE');
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // Не воруем клавиши у полей ввода (карточка региона содержит ссылки).
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
    const code = keyCodeOf(e);
    if (code === 'Space') {
      e.preventDefault();
      input.jumpAt = performance.now();
    }
    // Ставим метку только на ПЕРВОМ нажатии: при удержании браузер повторяет
    // keydown, и метка обновлялась бы каждые ~30 мс, срабатывая многократно.
    if (code === 'KeyE' && !down.has('KeyE')) input.actionAt = performance.now();
    down.add(code);
    recompute();
    onKey?.(code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    down.delete(keyCodeOf(e));
    recompute();
  };
  const onBlur = () => {
    down.clear();
    recompute();
  };

  // ── Мышь: орбита перетаскиванием ──
  let dragging = false;
  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 && e.button !== 2) return;
    // ⚠️ Захват указателя на элементах интерфейса ломает клики: pointerup
    // уходит контейнеру вместо кнопки, и события click не возникает вовсе.
    // Именно из-за этого кнопка «Высадиться на остров» не срабатывала.
    const el = e.target as HTMLElement | null;
    if (el?.closest('button, a, input, textarea, select, [data-ui]')) return;
    dragging = true;
    // Захват может не удаться, если указателя с таким id уже нет (быстрый
    // клик, синтетические события, странные драйверы тачпадов). Орбита
    // работает и без захвата — ронять кадр из-за этого нельзя.
    try {
      target.setPointerCapture?.(e.pointerId);
    } catch {
      /* пусто */
    }
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    input.lookX += e.movementX || 0;
    input.lookY += e.movementY || 0;
  };
  const onPointerUp = (e: PointerEvent) => {
    dragging = false;
    try {
      target.releasePointerCapture?.(e.pointerId);
    } catch {
      /* пусто */
    }
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    input.zoom += Math.sign(e.deltaY) * 0.6;
  };
  const onContext = (e: Event) => e.preventDefault();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  target.addEventListener('pointerdown', onPointerDown);
  target.addEventListener('pointermove', onPointerMove);
  target.addEventListener('pointerup', onPointerUp);
  target.addEventListener('pointercancel', onPointerUp);
  target.addEventListener('wheel', onWheel, { passive: false });
  target.addEventListener('contextmenu', onContext);

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('blur', onBlur);
    target.removeEventListener('pointerdown', onPointerDown);
    target.removeEventListener('pointermove', onPointerMove);
    target.removeEventListener('pointerup', onPointerUp);
    target.removeEventListener('pointercancel', onPointerUp);
    target.removeEventListener('wheel', onWheel);
    target.removeEventListener('contextmenu', onContext);
    input.forward = 0;
    input.strafe = 0;
    input.run = false;
    input.action = false;
  };
}

// ── Состояние персонажа ────────────────────────────────────────────────

export type AnimName = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'land' | 'celebrate';

export type Character = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  /** Куда смотрит герой (рад, 0 = на +Z). */
  yaw: number;
  grounded: boolean;
  /** Горизонтальная скорость, м/с. */
  speed: number;
  /** Скорость поворота — для наклона в вираже. */
  turn: number;
  anim: AnimName;
  /** Фаза цикла шага. */
  phase: number;
  /** Время в воздухе. */
  air: number;
  /** Остаток времени приземления/празднования. */
  hold: number;
  /** Глубина воды под ногами (0 — сухо). */
  wade: number;
  /** Материал под ногами — для физики, звука шагов и подсказок в HUD. */
  surface: Surface;
  /** Насколько героя тащит вниз по склону, 0..1 — для позы и HUD. */
  slide: number;
};

export const WALK_SPEED = 4.3;
export const RUN_SPEED = 8.6;
const ACCEL = 26;
const AIR_ACCEL = 7;
const GRAVITY = 23;
const JUMP_V = 8.2;
/** Предел проходимого уклона в метрике (1 − n.y). 0.5 ≈ 60°. */
const MAX_SLOPE = 0.5;
/** Максимальная глубина, по которой можно идти вброд. */
const MAX_WADE = 1.15;

export function createCharacter(hf: HeightField): Character {
  const [sx, sz] = WORLD.spawn;
  return {
    pos: new THREE.Vector3(sx, hf.sample(sx, sz), sz),
    vel: new THREE.Vector3(),
    yaw: Math.PI, // смотрим от берега в глубь острова
    grounded: true,
    speed: 0,
    turn: 0,
    anim: 'idle',
    phase: 0,
    air: 0,
    hold: 0,
    wade: 0,
    surface: 'sand',
    slide: 0,
  };
}

/** Можно ли встать в точку: не слишком круто, не слишком глубоко, не в стене. */
export function walkable(hf: HeightField, x: number, z: number): boolean {
  const h = hf.sample(x, z);
  if (h < waterLevelAt(x, z) - MAX_WADE) return false;
  if (hf.slope(x, z) > MAX_SLOPE) return false;
  // За границей поля высот земли нет.
  if (Math.abs(x) > WORLD.half - 4 || Math.abs(z) > WORLD.half - 4) return false;
  // Колонны, пьедесталы и скалы грота: проверяем на уровне груди (h + 1),
  // чтобы низкие обломки можно было переступать, а колонну — нет.
  if (blocked(buildColliders(hf), x, h + 1, z, 0.35)) return false;
  return true;
}

/**
 * Один шаг симуляции.
 *
 * Порядок важен: сперва горизонтальное перемещение с проверкой проходимости,
 * потом вертикаль. Иначе персонаж успевал бы «залезть» на отвес за счёт того,
 * что гравитация ещё не применена.
 */
export function stepCharacter(
  c: Character,
  hf: HeightField,
  camYaw: number,
  dt: number,
  frozen: boolean,
) {
  const d = Math.min(dt, 0.05);

  // ── Желаемое направление в системе камеры ──
  const fx = -Math.sin(camYaw);
  const fz = -Math.cos(camYaw);
  const rx = -fz;
  const rz = fx;

  let wishX = 0;
  let wishZ = 0;
  if (!frozen) {
    wishX = fx * input.forward + rx * input.strafe;
    wishZ = fz * input.forward + rz * input.strafe;
    const len = Math.hypot(wishX, wishZ);
    if (len > 1) {
      wishX /= len;
      wishZ /= len;
    }
  }
  const wishLen = Math.hypot(wishX, wishZ);

  // ── Поверхность под ногами ──
  // `SURFACE_GRIP` был посчитан в terrain.ts вместе с материалами и до сих пор
  // лежал без дела: физика не различала лёд и камень. Теперь сцепление — единый
  // множитель разгона, торможения, прыжка и скатывания, поэтому лёд ведёт себя
  // как лёд без единой отдельной ветки «если ледник».
  const slope = hf.slope(c.pos.x, c.pos.z);
  const groundHere = hf.sample(c.pos.x, c.pos.z);
  c.surface = surfaceAt(c.pos.x, c.pos.z, groundHere, slope);
  const grip = SURFACE_GRIP[c.surface];

  // Подъём в гору замедляет: уклон под ногами напрямую режет цель по скорости.
  const slopePenalty = 1 - Math.min(0.55, Math.max(0, slope - 0.12) * 1.1);
  const wadePenalty = c.wade > 0.05 ? 1 - Math.min(0.55, c.wade * 0.5) : 1;
  const maxSpeed = (input.run && !frozen ? RUN_SPEED : WALK_SPEED) * slopePenalty * wadePenalty;

  const targetVX = wishX * maxSpeed;
  const targetVZ = wishZ * maxSpeed;

  // Разгон и торможение — через УСКОРЕНИЕ в м/с², а не через долю разницы за
  // кадр. Доля зависит от частоты кадров: прежняя формула на 144 Гц разгоняла
  // героя заметно резче, чем на 60, — та же ошибка, ради которой в motion.ts
  // живёт `damp()`. Сцепление здесь и создаёт инерцию: на льду набор скорости
  // и остановка занимают в шесть раз больше времени, чем на камне.
  // ⚠️ Разгон к цели применяется, только пока управление НАЖАТО (или герой в
  // воздухе). Иначе цель равна нулю, и та же формула начинает работать как
  // мощнейший тормоз: на льду она гасила 4.2 м/с² против 2.0 м/с² от склона —
  // скольжение вычислялось, показатель `slide` рос, а герой стоял на месте.
  // Отпущенное управление означает «не тормози», а не «остановись»; замедляет
  // после этого только трение ниже, и оно зависит от сцепления.
  if (wishLen > 0.01 || !c.grounded) {
    const accel = (c.grounded ? ACCEL * grip : AIR_ACCEL) * d;
    const dvx = targetVX - c.vel.x;
    const dvz = targetVZ - c.vel.z;
    const dv = Math.hypot(dvx, dvz);
    if (dv > 1e-4) {
      const step = Math.min(dv, accel);
      c.vel.x += (dvx / dv) * step;
      c.vel.z += (dvz / dv) * step;
    }
  } else {
    // Трение в покое, иначе герой едет вечно. По сцеплению: на камне он встаёт
    // за пятую долю секунды, на льду продолжает ехать секунду с лишним.
    const damp = Math.max(0, 1 - d * 12 * grip);
    c.vel.x *= damp;
    c.vel.z *= damp;
  }

  // Вода вязкая: помимо срезанной максимальной скорости — сопротивление, из-за
  // которого вбегание в воду гасит разгон, а не проносит героя по инерции.
  if (c.wade > 0.05) {
    const drag = Math.max(0, 1 - d * (1.2 + c.wade * 2.4));
    c.vel.x *= drag;
    c.vel.z *= drag;
  }

  // ── Скатывание ──
  // Горизонтальная часть нормали поля высот смотрит ВНИЗ по склону (nx ∝ −dh/dx),
  // поэтому направление скатывания берётся из неё напрямую. Порог зависит от
  // сцепления: камень (grip ≥ 1) не скользит никогда, лёд поедет уже с пологого.
  const slideStart = 0.18 + Math.min(1, grip) * 0.5;
  c.slide = 0;
  if (c.grounded && slope > slideStart && grip < 1) {
    const n = hf.normal(c.pos.x, c.pos.z);
    const dl = Math.hypot(n[0], n[2]);
    if (dl > 1e-4) {
      const force = GRAVITY * (slope - slideStart) * (1 - grip);
      c.vel.x += (n[0] / dl) * force * d;
      c.vel.z += (n[2] / dl) * force * d;
      c.slide = Math.min(1, (slope - slideStart) * (1 - grip) * 3);
    }
  }

  // ── Горизонтальное перемещение с проверкой рельефа ──
  const nx = c.pos.x + c.vel.x * d;
  const nz = c.pos.z + c.vel.z * d;
  if (walkable(hf, nx, nz)) {
    c.pos.x = nx;
    c.pos.z = nz;
  } else {
    // Скользим вдоль препятствия: пробуем оси по отдельности. Без этого
    // персонаж «прилипает» к любому склону, задев его углом.
    if (walkable(hf, nx, c.pos.z)) {
      c.pos.x = nx;
      c.vel.z *= 0.4;
    } else if (walkable(hf, c.pos.x, nz)) {
      c.pos.z = nz;
      c.vel.x *= 0.4;
    } else {
      c.vel.x *= 0.2;
      c.vel.z *= 0.2;
    }
  }

  // ── Вертикаль ──
  const ground = hf.sample(c.pos.x, c.pos.z);
  const water = waterLevelAt(c.pos.x, c.pos.z);
  c.wade = Math.max(0, Math.min(MAX_WADE, water - ground));

  const wantJump = !frozen && input.jumpAt > 0 && performance.now() - input.jumpAt < 150;
  if (c.grounded && wantJump) {
    // Оттолкнуться можно только от того, что держит: на льду прыжок вялый, а
    // по пояс в воде — почти никакой. Ниже 55 % не опускаемся, иначе прыжок
    // перестаёт читаться как прыжок и выглядит поломкой управления.
    const push = Math.min(1, grip) * (1 - Math.min(0.7, c.wade * 0.6));
    c.vel.y = JUMP_V * (0.55 + 0.45 * push);
    c.grounded = false;
    c.air = 0;
    input.jumpAt = -1;
  }

  if (!c.grounded) {
    c.vel.y -= GRAVITY * d;
    c.pos.y += c.vel.y * d;
    c.air += d;
    if (c.pos.y <= ground) {
      c.pos.y = ground;
      // Долгий полёт — приземление с приседом; короткий проходит незаметно.
      c.hold = c.air > 0.42 ? 0.3 : 0;
      c.grounded = true;
      c.vel.y = 0;
      c.air = 0;
    }
  } else {
    // На земле следуем рельефу. Быстрый спуск заставляет оторваться — так
    // получаются естественные прыжки с уступов.
    const drop = c.pos.y - ground;
    if (drop > 0.55) {
      c.grounded = false;
      c.vel.y = 0;
    } else {
      c.pos.y += (ground - c.pos.y) * Math.min(1, d * 18);
    }
  }

  // ── Курс ──
  c.speed = Math.hypot(c.vel.x, c.vel.z);
  if (wishLen > 0.05 && c.speed > 0.35) {
    const want = Math.atan2(c.vel.x, c.vel.z);
    let diff = want - c.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const rate = Math.min(1, d * 9);
    c.yaw += diff * rate;
    c.turn = diff * rate / Math.max(d, 1e-4);
  } else {
    c.turn *= Math.max(0, 1 - d * 6);
  }

  // ── Фаза шага и выбор анимации ──
  // Фаза привязана к пройденному пути, а не ко времени: ноги не «едут»
  // по земле при изменении скорости.
  c.phase += c.speed * d * 2.05;
  c.hold = Math.max(0, c.hold - d);

  if (c.hold > 0 && c.grounded && c.anim !== 'celebrate') c.anim = 'land';
  else if (c.anim === 'celebrate' && c.hold > 0) c.anim = 'celebrate';
  else if (!c.grounded) c.anim = c.vel.y > 0.4 ? 'jump' : 'fall';
  else if (c.speed < 0.4) c.anim = 'idle';
  else if (c.speed < WALK_SPEED * 1.22) c.anim = 'walk';
  else c.anim = 'run';
}

/** Запускает празднование (открытие региона, сбор всех артефактов). */
export function celebrate(c: Character, seconds = 2.2) {
  c.anim = 'celebrate';
  c.hold = seconds;
}
