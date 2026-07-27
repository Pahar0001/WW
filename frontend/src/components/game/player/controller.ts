'use client';

import * as THREE from 'three';
import { HeightField, WORLD, waterLevelAt } from '../world/terrain';
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
};

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
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // Не воруем клавиши у полей ввода (карточка региона содержит ссылки).
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      input.jumpAt = performance.now();
    }
    down.add(e.code);
    recompute();
    onKey?.(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => {
    down.delete(e.code);
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

  // Подъём в гору замедляет: уклон под ногами напрямую режет цель по скорости.
  const slope = hf.slope(c.pos.x, c.pos.z);
  const slopePenalty = 1 - Math.min(0.55, Math.max(0, slope - 0.12) * 1.1);
  const wadePenalty = c.wade > 0.05 ? 1 - Math.min(0.55, c.wade * 0.5) : 1;
  const maxSpeed = (input.run && !frozen ? RUN_SPEED : WALK_SPEED) * slopePenalty * wadePenalty;

  const targetVX = wishX * maxSpeed;
  const targetVZ = wishZ * maxSpeed;
  const a = (c.grounded ? ACCEL : AIR_ACCEL) * d;
  c.vel.x += (targetVX - c.vel.x) * Math.min(1, a / Math.max(1, maxSpeed || 1) * 3);
  c.vel.z += (targetVZ - c.vel.z) * Math.min(1, a / Math.max(1, maxSpeed || 1) * 3);
  // Трение в покое, иначе герой бесконечно скользит.
  if (wishLen < 0.01 && c.grounded) {
    const damp = Math.max(0, 1 - d * 12);
    c.vel.x *= damp;
    c.vel.z *= damp;
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
    c.vel.y = JUMP_V;
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
