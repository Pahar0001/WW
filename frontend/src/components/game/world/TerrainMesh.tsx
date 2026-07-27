'use client';

import { useMemo } from 'react';
import * as THREE from 'three';
import { HeightField, WORLD, fbm, riverWeight, trailWeight } from './terrain';

/**
 * Меш острова.
 *
 * Два решения, которые дают «дорогую» картинку почти бесплатно:
 *
 * 1. Биомы и затенение ЗАПЕЧЕНЫ В ЦВЕТА ВЕРШИН. Песок, трава, лес, камень,
 *    снег, тропы и галька русла смешиваются по высоте и уклону один раз при
 *    загрузке. Никакого триплanar-шейдера с шестью текстурами — а выглядит
 *    богаче, потому что переходы плавные и учитывают рельеф.
 *
 * 2. Ambient occlusion считается по горизонту на CPU и тоже уходит в цвет
 *    вершин. Это честное затенение впадин и подножий склонов, которое стоит
 *    НОЛЬ кадрового времени — в отличие от SSAO-прохода, съедающего 2–4 мс
 *    каждый кадр и мылящего края. Пост-эффекту остаётся только «кино».
 *
 * Мелкая фактура поверхности — тайловая normal-карта, сгенерированная на
 * canvas в рантайме (никаких файлов и сетевых запросов).
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0 || 1));
  return t * t * (3 - 2 * t);
};

// Палитра острова. Тёплая земля / прохладный камень / кремовый снег —
// та же температурная логика, что и в цветокоррекции сайта.
const C = {
  sandWet: new THREE.Color('#c6ac80'),
  sandDry: new THREE.Color('#e6d2a6'),
  grass: new THREE.Color('#7d9749'),
  grassDry: new THREE.Color('#9ca755'),
  forest: new THREE.Color('#527238'),
  rock: new THREE.Color('#867f70'),
  rockDark: new THREE.Color('#68625a'),
  snow: new THREE.Color('#eef2f8'),
  trail: new THREE.Color('#c2ab84'),
  gravel: new THREE.Color('#9b9a8d'),
};

/**
 * Ambient occlusion по горизонту: для каждой вершины ищем максимальный угол
 * подъёма рельефа в нескольких направлениях. Чем выше «стены» вокруг — тем
 * темнее точка. Ровное поле остаётся полностью освещённым.
 */
function bakeAO(hf: HeightField, x: number, z: number, h: number): number {
  const DIRS = 6;
  const STEPS = [2.5, 6, 13, 26];
  let occl = 0;
  for (let d = 0; d < DIRS; d++) {
    const a = (d / DIRS) * Math.PI * 2 + 0.4;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    let maxTan = 0;
    for (const r of STEPS) {
      const dh = hf.sample(x + dx * r, z + dz * r) - h;
      if (dh > 0) maxTan = Math.max(maxTan, dh / r);
    }
    // atan → 0..1 доля закрытого небосвода в этом направлении.
    occl += Math.atan(maxTan) / (Math.PI / 2);
  }
  return clamp01(1 - (occl / DIRS) * 0.92);
}

/** Тайловая normal-карта: мелкая «крупа» поверхности. */
function makeDetailNormal(): THREE.Texture {
  const S = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  const d = img.data;

  // Высотное поле из нескольких октав хеш-шума, затем численный градиент → нормаль.
  const h = new Float32Array(S * S);
  const at = (x: number, y: number) => h[((y + S) % S) * S + ((x + S) % S)];
  const rand = (i: number) => {
    let v = i * 374761393;
    v = (v ^ (v >> 13)) * 1274126177;
    return ((v ^ (v >> 16)) >>> 0) / 4294967295;
  };
  for (let oct = 0; oct < 3; oct++) {
    const cell = 32 >> oct;
    const amp = 1 / (oct + 1.6);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const gx = Math.floor(x / cell);
        const gy = Math.floor(y / cell);
        const tx = (x % cell) / cell;
        const ty = (y % cell) / cell;
        const f = (t: number) => t * t * (3 - 2 * t);
        const g = (a: number, b: number) => rand(((a % (S / cell)) + 1) * 91 + ((b % (S / cell)) + 1) * 613 + oct * 7919);
        const v =
          (g(gx, gy) * (1 - f(tx)) + g(gx + 1, gy) * f(tx)) * (1 - f(ty)) +
          (g(gx, gy + 1) * (1 - f(tx)) + g(gx + 1, gy + 1) * f(tx)) * f(ty);
        h[y * S + x] += v * amp;
      }
    }
  }

  const strength = 2.4;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const ny = (at(x, y - 1) - at(x, y + 1)) * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * S + x) * 4;
      d[i] = ((nx / len) * 0.5 + 0.5) * 255;
      d[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      d[i + 2] = (1 / len) * 0.5 * 255 + 127;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  // 190 повторов на 330 метров — тайл 1.7 м. При 70 повторах узор читался
  // не как фактура грунта, а как камуфляжные пятна размером с человека.
  tex.repeat.set(190, 190);
  tex.anisotropy = 4;
  return tex;
}

export function buildTerrainGeometry(hf: HeightField) {
  const res = hf.res;
  const half = hf.half;
  const step = hf.step;
  const count = res * res;

  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const colors = new Float32Array(count * 3);

  const n: [number, number, number] = [0, 1, 0];
  const col = new THREE.Color();

  for (let j = 0; j < res; j++) {
    const z = -half + j * step;
    for (let i = 0; i < res; i++) {
      const x = -half + i * step;
      const k = j * res + i;
      const h = hf.heights[k];

      positions[k * 3] = x;
      positions[k * 3 + 1] = h;
      positions[k * 3 + 2] = z;

      hf.normal(x, z, n);
      normals[k * 3] = n[0];
      normals[k * 3 + 1] = n[1];
      normals[k * 3 + 2] = n[2];

      uvs[k * 2] = i / (res - 1);
      uvs[k * 2 + 1] = j / (res - 1);

      // ── Смешивание биомов ──
      const slope = clamp01(1 - n[1]);
      // Крупный шум оттенка: без него трава — однородная зелёная простыня.
      // ⚠️ Раньше здесь семплировалось поле высот со сдвинутыми координатами —
      // за его границей (|x| > 97) возвращалось дно океана, и вся периферия
      // острова получала один и тот же оттенок. Нужен именно шум.
      const tint = fbm(x * 0.045 + 400, z * 0.045 - 250, 3) * 0.5 + 0.5;
      const patch = smooth(0.32, 0.72, tint);

      col.copy(C.sandWet);
      // Мокрый песок у самой воды → сухой выше
      col.lerp(C.sandDry, smooth(0.05, 2.2, h));
      // Трава
      const grass = C.grass.clone().lerp(C.grassDry, patch);
      col.lerp(grass, smooth(WORLD.beach - 0.4, WORLD.beach + 3.2, h));
      // Лесная подстилка в среднем поясе
      col.lerp(C.forest, smooth(8, 17, h) * (1 - smooth(30, 40, h)) * 0.72);
      // Камень по уклону и высоте
      const rock = C.rock.clone().lerp(C.rockDark, patch);
      col.lerp(rock, Math.max(smooth(0.3, 0.52, slope), smooth(34, 46, h)));
      // Снег на вершинах, но не на отвесах — на них он не держится
      col.lerp(C.snow, smooth(46, 58, h) * (1 - smooth(0.42, 0.62, slope)));
      // Галька русла и натоптанная тропа поверх всего
      col.lerp(C.gravel, riverWeight(x, z) * 0.7);
      col.lerp(C.trail, trailWeight(x, z) * 0.7);

      // ── Запечённое затенение ──
      // Нижняя граница 0.62, а не 0.42: при более глубоком AO пляж и тропы
      // сливались в серо-бурую грязь — запечённая тень не должна подменять
      // собой освещение сцены, её задача только подчёркивать впадины.
      const ao = bakeAO(hf, x, z, h);
      col.multiplyScalar(0.62 + 0.38 * ao);

      colors[k * 3] = col.r;
      colors[k * 3 + 1] = col.g;
      colors[k * 3 + 2] = col.b;
    }
  }

  // Индексы: два треугольника на ячейку.
  const quads = (res - 1) * (res - 1);
  const index = count > 65535 ? new Uint32Array(quads * 6) : new Uint16Array(quads * 6);
  let p = 0;
  for (let j = 0; j < res - 1; j++) {
    for (let i = 0; i < res - 1; i++) {
      const a = j * res + i;
      const b = a + 1;
      const c = a + res;
      const d = c + 1;
      index[p++] = a; index[p++] = c; index[p++] = b;
      index[p++] = b; index[p++] = c; index[p++] = d;
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeBoundingSphere();
  return geo;
}

export function Terrain({ hf, receiveShadow = true }: { hf: HeightField; receiveShadow?: boolean }) {
  const geometry = useMemo(() => buildTerrainGeometry(hf), [hf]);
  const normalMap = useMemo(() => makeDetailNormal(), []);

  return (
    <mesh geometry={geometry} receiveShadow={receiveShadow} castShadow={false}>
      <meshStandardMaterial
        vertexColors
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.42, 0.42)}
        roughness={0.94}
        metalness={0}
        dithering
      />
    </mesh>
  );
}
