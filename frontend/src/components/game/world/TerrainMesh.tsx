'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DeviceTier } from '@/lib/motion';
import { HeightField, groundColor, riverWeight } from './terrain';

/**
 * Меш материка.
 *
 * Три решения, которые дают «дорогую» картинку почти бесплатно:
 *
 * 1. Биомы и затенение ЗАПЕЧЕНЫ В ЦВЕТА ВЕРШИН. Материал поверхности,
 *    палитра зоны, тропы и галька русла смешиваются один раз при загрузке
 *    функцией `groundColor` — той же самой, по которой красится мини-карта.
 *    Никакого триплanar-шейдера с шестью текстурами, а выглядит богаче:
 *    переходы плавные и учитывают и рельеф, и регион.
 *
 * 2. Ambient occlusion считается по горизонту на CPU и тоже уходит в цвет
 *    вершин. Честное затенение впадин и подножий склонов за НОЛЬ кадрового
 *    времени — в отличие от SSAO-прохода, съедающего 2–4 мс каждый кадр.
 *
 * 3. Рельеф нарезан на ЧАНКИ с двумя уровнями детализации. Мир вырос в 6.5
 *    раза по площади, и единым мешем это 630 000 треугольников, которые
 *    рисуются целиком даже когда 90 % из них за спиной. Сотня отдельных
 *    мешей отсекается по пирамиде видимости бесплатно (это делает three.js),
 *    а дальние к тому же рисуются вчетверо более редкой сеткой.
 *
 * Мелкая фактура поверхности — тайловая normal-карта, сгенерированная на
 * canvas в рантайме (никаких файлов и сетевых запросов).
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Чанков по стороне. `res − 1` обязано делиться на это число нацело. */
export const CHUNKS = 10;

/** Во сколько раз реже сетка у дальнего уровня детализации. */
const FAR_STRIDE = 4;

/**
 * Ambient occlusion по горизонту: для каждой вершины ищем максимальный угол
 * подъёма рельефа в нескольких направлениях. Чем выше «стены» вокруг — тем
 * темнее точка. Ровное поле остаётся полностью освещённым.
 */
function bakeAO(hf: HeightField, x: number, z: number, h: number): number {
  const DIRS = 5;
  const STEPS = [3, 9, 22];
  let occl = 0;
  for (let d = 0; d < DIRS; d++) {
    const a = (d / DIRS) * Math.PI * 2 + 0.4;
    const dx = Math.cos(a);
    const dz = Math.sin(a);
    let maxTan = 0;
    for (const r of STEPS) {
      const dh = hf.sample(x + dx * r, z + dz * r) - h;
      if (dh > 0) {
        const t = dh / r;
        if (t > maxTan) maxTan = t;
      }
    }
    // atan → 0..1 доля закрытого небосвода в этом направлении.
    occl += Math.atan(maxTan) / (Math.PI / 2);
  }
  return clamp01(1 - (occl / DIRS) * 0.92);
}

/**
 * Цвета и нормали рельефа, посчитанные один раз на всё поле высот.
 *
 * Живут отдельно от геометрии, потому что оба уровня детализации читают ОДИН
 * массив: дальняя сетка просто берёт каждую четвёртую вершину. Пересчитывать
 * цвет для неё заново — это ещё 20 000 вызовов `groundColor` на ровном месте.
 *
 * Считается порциями (`buildRows`) по той же причине, что и само поле высот:
 * на высоком качестве это 315 000 вершин по ~3 мкс, то есть почти секунда
 * сплошной работы — синхронно вкладка бы просто замерла.
 */
export class TerrainData {
  readonly hf: HeightField;
  readonly colors: Float32Array;
  readonly normals: Float32Array;
  private built = 0;

  constructor(hf: HeightField) {
    this.hf = hf;
    this.colors = new Float32Array(hf.res * hf.res * 3);
    this.normals = new Float32Array(hf.res * hf.res * 3);
  }

  buildRows(rows: number): number {
    const { hf, colors, normals } = this;
    const { res, half, step } = hf;
    const end = Math.min(res, this.built + rows);
    const n: [number, number, number] = [0, 1, 0];
    const rgb: [number, number, number] = [0, 0, 0];

    for (let j = this.built; j < end; j++) {
      const z = -half + j * step;
      for (let i = 0; i < res; i++) {
        const x = -half + i * step;
        const k = j * res + i;
        const h = hf.heights[k];

        hf.normal(x, z, n);
        normals[k * 3] = n[0];
        normals[k * 3 + 1] = n[1];
        normals[k * 3 + 2] = n[2];

        // Дно океана игрок не видит никогда — под водой лежит непрозрачная
        // плоскость. Красить и затенять его значит потратить треть всего
        // бюджета загрузки на то, чего нет в кадре.
        if (h < -3) {
          colors[k * 3] = 0.14;
          colors[k * 3 + 1] = 0.16;
          colors[k * 3 + 2] = 0.17;
          continue;
        }

        const slope = clamp01(1 - n[1]);
        groundColor(x, z, h, slope, rgb);

        // Галька русла поверх материала зоны.
        const rw = riverWeight(x, z);
        if (rw > 0.01) {
          const g = rw * 0.6;
          rgb[0] += (0.44 - rgb[0]) * g;
          rgb[1] += (0.43 - rgb[1]) * g;
          rgb[2] += (0.39 - rgb[2]) * g;
        }

        // Нижняя граница 0.62, а не 0.42: при более глубоком AO пляж и тропы
        // сливались в серо-бурую грязь — запечённая тень не должна подменять
        // собой освещение сцены, её задача только подчёркивать впадины.
        const ao = 0.62 + 0.38 * bakeAO(hf, x, z, h);
        colors[k * 3] = rgb[0] * ao;
        colors[k * 3 + 1] = rgb[1] * ao;
        colors[k * 3 + 2] = rgb[2] * ao;
      }
    }
    this.built = end;
    return end / res;
  }

  get complete() {
    return this.built >= this.hf.res;
  }
}

/**
 * Геометрия одного чанка.
 *
 * Вокруг каждого чанка идёт «юбка» — кольцо вершин, опущенное на два метра
 * вниз. Без неё на стыке подробной и редкой сетки видна щель в небо: соседние
 * чанки аппроксимируют один и тот же склон с разным шагом и расходятся по
 * высоте на десятки сантиметров. Юбка закрывает щель полоской земли и стоит
 * четыре десятка вершин на чанк.
 */
export function buildChunkGeometry(
  data: TerrainData,
  cx: number,
  cz: number,
  stride: number,
): THREE.BufferGeometry {
  const { hf, colors, normals } = data;
  const { res, half, step } = hf;
  const segs = (res - 1) / CHUNKS;
  const i0 = cx * segs;
  const j0 = cz * segs;
  const n = segs / stride; // ячеек по стороне чанка
  const side = n + 1; // вершин по стороне
  const skirtCount = side * 4;
  const count = side * side + skirtCount;

  const positions = new Float32Array(count * 3);
  const norm = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);

  const put = (v: number, gi: number, gj: number, drop: number) => {
    const k = gj * res + gi;
    positions[v * 3] = -half + gi * step;
    positions[v * 3 + 1] = hf.heights[k] - drop;
    positions[v * 3 + 2] = -half + gj * step;
    norm[v * 3] = normals[k * 3];
    norm[v * 3 + 1] = normals[k * 3 + 1];
    norm[v * 3 + 2] = normals[k * 3 + 2];
    col[v * 3] = colors[k * 3];
    col[v * 3 + 1] = colors[k * 3 + 1];
    col[v * 3 + 2] = colors[k * 3 + 2];
    uvs[v * 2] = gi / (res - 1);
    uvs[v * 2 + 1] = gj / (res - 1);
  };

  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      put(j * side + i, i0 + i * stride, j0 + j * stride, 0);
    }
  }

  // Юбка: четыре ряда по краям, опущенные вниз.
  let s = side * side;
  const skirtStart = s;
  for (let i = 0; i <= n; i++) put(s++, i0 + i * stride, j0, 2.2); // север
  for (let i = 0; i <= n; i++) put(s++, i0 + i * stride, j0 + n * stride, 2.2); // юг
  for (let j = 0; j <= n; j++) put(s++, i0, j0 + j * stride, 2.2); // запад
  for (let j = 0; j <= n; j++) put(s++, i0 + n * stride, j0 + j * stride, 2.2); // восток

  const tris = n * n * 2 + n * 2 * 4;
  const index = count > 65535 ? new Uint32Array(tris * 3) : new Uint16Array(tris * 3);
  let p = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const a = j * side + i;
      const b = a + 1;
      const c = a + side;
      const d = c + 1;
      index[p++] = a; index[p++] = c; index[p++] = b;
      index[p++] = b; index[p++] = c; index[p++] = d;
    }
  }
  // Полосы юбки. Порядок обхода подобран так, чтобы наружная нормаль смотрела
  // от чанка — иначе юбка отбрасывает тень внутрь и по краям идёт тёмный кант.
  const strip = (top: (i: number) => number, bottom: number, flip: boolean) => {
    for (let i = 0; i < n; i++) {
      const a = top(i);
      const b = top(i + 1);
      const c = bottom + i;
      const d = bottom + i + 1;
      if (flip) {
        index[p++] = a; index[p++] = b; index[p++] = c;
        index[p++] = b; index[p++] = d; index[p++] = c;
      } else {
        index[p++] = a; index[p++] = c; index[p++] = b;
        index[p++] = b; index[p++] = c; index[p++] = d;
      }
    }
  };
  strip((i) => i, skirtStart, true);
  strip((i) => n * side + i, skirtStart + side, false);
  strip((j) => j * side, skirtStart + side * 2, false);
  strip((j) => j * side + n, skirtStart + side * 3, true);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setIndex(new THREE.BufferAttribute(index, 1));
  geo.computeBoundingSphere();
  return geo;
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
        const g = (a: number, b: number) =>
          rand(((a % (S / cell)) + 1) * 91 + ((b % (S / cell)) + 1) * 613 + oct * 7919);
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
  // Тайл ~1.7 м. При крупном тайле узор читается не как фактура грунта, а как
  // камуфляжные пятна размером с человека.
  tex.repeat.set(490, 490);
  tex.anisotropy = 4;
  return tex;
}

/** Расстояние, дальше которого чанк рисуется редкой сеткой. */
const LOD_NEAR = 190;

export function Terrain({
  data,
  tier,
  receiveShadow = true,
}: {
  data: TerrainData;
  tier: DeviceTier;
  receiveShadow?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const normalMap = useMemo(() => makeDetailNormal(), []);

  const chunks = useMemo(() => {
    const half = data.hf.half;
    const size = (half * 2) / CHUNKS;
    const out: {
      near: THREE.BufferGeometry;
      far: THREE.BufferGeometry;
      cx: number;
      cz: number;
    }[] = [];
    for (let cz = 0; cz < CHUNKS; cz++) {
      for (let cx = 0; cx < CHUNKS; cx++) {
        out.push({
          near: buildChunkGeometry(data, cx, cz, 1),
          far: buildChunkGeometry(data, cx, cz, FAR_STRIDE),
          cx: -half + (cx + 0.5) * size,
          cz: -half + (cz + 0.5) * size,
        });
      }
    }
    return out;
  }, [data]);

  useEffect(
    () => () => {
      for (const c of chunks) {
        c.near.dispose();
        c.far.dispose();
      }
      normalMap.dispose();
    },
    [chunks, normalMap],
  );

  // Переключение уровня детализации: сам показ/скрытие стоит доли микросекунды,
  // отсечение по пирамиде видимости three.js делает сам.
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  useFrame(({ camera }) => {
    const list = meshes.current;
    for (let i = 0; i < chunks.length; i++) {
      const near = list[i * 2];
      const far = list[i * 2 + 1];
      if (!near || !far) continue;
      const c = chunks[i];
      const d = Math.hypot(camera.position.x - c.cx, camera.position.z - c.cz);
      const detailed = d < LOD_NEAR;
      near.visible = detailed;
      far.visible = !detailed;
    }
  });

  return (
    <group ref={group}>
      {chunks.map((c, i) => (
        <group key={i}>
          <mesh
            ref={(m) => {
              meshes.current[i * 2] = m;
            }}
            geometry={c.near}
            receiveShadow={receiveShadow}
            castShadow={false}
          >
            <meshStandardMaterial
              vertexColors
              normalMap={normalMap}
              normalScale={new THREE.Vector2(0.42, 0.42)}
              roughness={0.94}
              metalness={0}
              dithering
            />
          </mesh>
          <mesh
            ref={(m) => {
              meshes.current[i * 2 + 1] = m;
            }}
            geometry={c.far}
            // Дальние чанки не принимают тень: карта теней покрывает 62 метра
            // вокруг героя, туда они всё равно не попадают, а проход по ним
            // стоит кадрового времени.
            receiveShadow={false}
            castShadow={false}
            visible={false}
          >
            <meshStandardMaterial
              vertexColors
              normalMap={tier === 'low' ? null : normalMap}
              normalScale={new THREE.Vector2(0.3, 0.3)}
              roughness={0.96}
              metalness={0}
              dithering
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
