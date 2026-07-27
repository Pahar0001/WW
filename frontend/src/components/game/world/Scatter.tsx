'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DeviceTier } from '@/lib/motion';
import {
  HeightField,
  WORLD,
  lavaAt,
  riverWeight,
  rnd,
  scatterPoints,
  surfaceAt,
  trailWeight,
  waterLevelAt,
  zoneAt,
} from './terrain';

/**
 * Растительность и камни острова — всё через InstancedMesh.
 *
 * Бюджет рисования: 7 вызовов на весь лес, камни, цветы и траву. Раскладка
 * считается один раз при загрузке из того же поля высот, что и рельеф, поэтому
 * ни одно дерево не растёт в реке, на тропе или в озере.
 *
 * Трава — отдельная история: она нужна только у камеры, поэтому её экземпляры
 * живут в диске вокруг героя и «перематываются» на другую сторону, когда он
 * отходит. Так 4000 кустиков дают густой газон под ногами вместо редкой щетины
 * по всему острову.
 */

// ── Геометрия ──────────────────────────────────────────────────────────

/**
 * Склейка геометрий без BufferGeometryUtils: приводим всё к неиндексированному
 * виду и конкатенируем атрибуты. Двадцать строк против внешней зависимости,
 * версия которой у three и three-stdlib расходится.
 */
function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  let total = 0;
  for (const g of parts) total += g.getAttribute('position').count;

  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);
  const color = new Float32Array(total * 3);
  let off = 0;
  for (const g of parts) {
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    const n = g.getAttribute('normal') as THREE.BufferAttribute;
    const c = g.getAttribute('color') as THREE.BufferAttribute | undefined;
    position.set(p.array as Float32Array, off * 3);
    normal.set(n.array as Float32Array, off * 3);
    if (c) color.set(c.array as Float32Array, off * 3);
    else color.fill(1, off * 3, (off + p.count) * 3);
    off += p.count;
  }

  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(position, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  out.setAttribute('color', new THREE.BufferAttribute(color, 3));
  out.computeBoundingSphere();
  return out;
}

/** Красит геометрию в один цвет (вершинные цвета) — для склейки в один меш. */
function paint(geo: THREE.BufferGeometry, hex: string): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const count = g.getAttribute('position').count;
  const col = new THREE.Color(hex);
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = col.r;
    arr[i * 3 + 1] = col.g;
    arr[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/** Хвойное: три яруса конусов + ствол. Высота нормирована к 1. */
function coniferGeo(): THREE.BufferGeometry {
  const trunk = paint(new THREE.CylinderGeometry(0.035, 0.06, 0.42, 6, 1), '#4a3826');
  trunk.translate(0, 0.21, 0);
  const tiers = [
    { y: 0.42, r: 0.29, h: 0.4, c: '#3f5c33' },
    { y: 0.66, r: 0.23, h: 0.36, c: '#4a6b39' },
    { y: 0.86, r: 0.15, h: 0.3, c: '#567a41' },
  ].map((t) => {
    const g = paint(new THREE.ConeGeometry(t.r, t.h, 8, 1), t.c);
    g.translate(0, t.y + t.h / 2, 0);
    return g;
  });
  return mergeGeos([trunk, ...tiers]);
}

/** Широколиственное: ствол с развилкой + три кроны-кляксы. */
function broadleafGeo(): THREE.BufferGeometry {
  const trunk = paint(new THREE.CylinderGeometry(0.045, 0.075, 0.5, 6, 1), '#584129');
  trunk.translate(0, 0.25, 0);
  const branch = paint(new THREE.CylinderGeometry(0.022, 0.032, 0.3, 5, 1), '#584129');
  branch.rotateZ(0.5);
  branch.translate(0.08, 0.52, 0);

  const blobs = [
    { x: 0, y: 0.72, z: 0, r: 0.28, c: '#5d7c3c' },
    { x: 0.16, y: 0.62, z: 0.06, r: 0.2, c: '#688644' },
    { x: -0.13, y: 0.66, z: -0.08, r: 0.18, c: '#527036' },
  ].map((b) => {
    const g = paint(new THREE.IcosahedronGeometry(b.r, 1), b.c);
    g.scale(1, 0.82, 1);
    g.translate(b.x, b.y, b.z);
    return g;
  });
  return mergeGeos([trunk, branch, ...blobs]);
}

/** Пальма для пляжа: изогнутый ствол + веер листьев. */
function palmGeo(): THREE.BufferGeometry {
  const segs: THREE.BufferGeometry[] = [];
  const N = 5;
  for (let i = 0; i < N; i++) {
    const t = i / N;
    const g = paint(new THREE.CylinderGeometry(0.04 - t * 0.012, 0.05 - t * 0.012, 0.18, 5, 1), '#6b5334');
    // Ствол уводим по дуге — прямая пальма выглядит как столб.
    g.translate(Math.sin(t * 1.5) * 0.12, 0.09 + i * 0.17, 0);
    segs.push(g);
  }
  const leaves: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const g = paint(new THREE.ConeGeometry(0.075, 0.52, 4, 1), i % 2 ? '#4f7a3a' : '#5c8a42');
    g.scale(1, 1, 0.28);
    g.rotateX(Math.PI / 2.4);
    g.rotateY(a);
    g.translate(Math.sin(1.5) * 0.12 + Math.cos(a) * 0.2, 0.92, Math.sin(a) * 0.2);
    leaves.push(g);
  }
  return mergeGeos([...segs, ...leaves]);
}

/** Валун: икосаэдр с детерминированным смещением вершин. */
function rockGeo(seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(0.5, 1);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const k = 0.72 + rnd(i + seed * 977, 3) * 0.56;
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.78, pos.getZ(i) * k);
  }
  g.computeVertexNormals();
  return paint(g, '#7d776a');
}

/**
 * Одна былинка: суживающаяся к верхушке лента с изгибом.
 *
 * Плоский прямоугольник (первая версия) читался как воткнутая в землю
 * зелёная планка: у настоящей травы силуэт сужается и заваливается. Четыре
 * поперечных сегмента дают этот изгиб почти бесплатно — восемь треугольников.
 */
function bladeGeo(height: number, width: number, bend: number, lean: number): THREE.BufferGeometry {
  const SEG = 4;
  const positions: number[] = [];
  const colors: number[] = [];
  const index: number[] = [];
  const base = new THREE.Color('#465c2c');
  const tip = new THREE.Color('#9cb45e');
  const tmp = new THREE.Color();

  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG;
    // Ширина падает нелинейно — кончик почти острый.
    const w = width * (1 - t * t * 0.92) * 0.5;
    const y = height * t;
    // Изгиб растёт квадратично: у корня былинка стоит, к верхушке ложится.
    const z = bend * t * t;
    const x = lean * t * t;
    positions.push(x - w, y, z, x + w, y, z);
    tmp.copy(base).lerp(tip, t);
    colors.push(tmp.r, tmp.g, tmp.b, tmp.r, tmp.g, tmp.b);
  }
  for (let i = 0; i < SEG; i++) {
    const a = i * 2;
    index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

/** Кустик травы: пять былинок разной высоты и наклона из одной точки. */
function grassGeo(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.4;
    const h = 0.3 + ((i * 0.37) % 1) * 0.26;
    const g = bladeGeo(h, 0.052, 0.1 + ((i * 0.61) % 1) * 0.12, 0);
    g.rotateY(a);
    // Небольшой развал куста в стороны.
    g.rotateZ(Math.cos(a) * 0.16);
    g.rotateX(Math.sin(a) * 0.16);
    blades.push(g);
  }
  return mergeGeos(blades);
}

/** Цветок: стебель, венчик из лепестков и серединка. */
function flowerGeo(petal: string, heart: string): THREE.BufferGeometry {
  const stem = paint(new THREE.CylinderGeometry(0.008, 0.01, 0.26, 4, 1), '#5c7538');
  stem.translate(0, 0.13, 0);
  const petals: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const g = paint(new THREE.CircleGeometry(0.05, 5), petal);
    g.rotateX(-Math.PI / 2.6);
    g.rotateY(a);
    g.translate(Math.cos(a) * 0.045, 0.27, Math.sin(a) * 0.045);
    petals.push(g);
  }
  const core = paint(new THREE.SphereGeometry(0.022, 6, 5), heart);
  core.translate(0, 0.285, 0);
  return mergeGeos([stem, ...petals, core]);
}

// ── Ветер ──────────────────────────────────────────────────────────────

/**
 * Добавляет в стандартный материал покачивание от ветра.
 *
 * Инъекция в `begin_vertex` вместо своего шейдера — чтобы сохранить настоящее
 * PBR-освещение, тени и туман: собственный материал пришлось бы дублировать
 * ещё и в customDepthMaterial, иначе тени перестают совпадать.
 * Фаза берётся из позиции экземпляра — соседние растения не качаются в такт.
 */
function useWind(strength: number, height: number) {
  const time = useRef({ value: 0 });
  const onBeforeCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.uniforms.uWindTime = time.current;
      shader.uniforms.uWindStrength = { value: strength };
      shader.uniforms.uWindHeight = { value: height };
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform float uWindTime;
           uniform float uWindStrength;
           uniform float uWindHeight;`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           #ifdef USE_INSTANCING
             float wphase = instanceMatrix[3][0] * 0.31 + instanceMatrix[3][2] * 0.27;
           #else
             float wphase = 0.0;
           #endif
           float wy = clamp(transformed.y / uWindHeight, 0.0, 1.0);
           float gust = sin(uWindTime * 1.15 + wphase) * 0.7
                      + sin(uWindTime * 2.7 + wphase * 1.9) * 0.3;
           transformed.x += gust * pow(wy, 1.7) * uWindStrength;
           transformed.z += gust * pow(wy, 1.7) * uWindStrength * 0.45;`,
        );
    },
    [strength, height],
  );

  useFrame(({ clock }) => {
    time.current.value = clock.elapsedTime;
  });

  return onBeforeCompile;
}

// ── Раскладка ──────────────────────────────────────────────────────────

type Placement = { x: number; y: number; z: number; s: number; rot: number; tilt: number };

function place(
  hf: HeightField,
  count: number,
  radius: number,
  seed: number,
  accept: (h: number, slope: number, x: number, z: number) => boolean,
  scale: (i: number) => number,
): Placement[] {
  const out: Placement[] = [];
  // Кандидатов берём с запасом: фильтры по биому и уклону отбраковывают
  // большую часть точек, а нужно именно `count` растений.
  for (const [x, z, i] of scatterPoints(count * 4, radius, seed)) {
    if (out.length >= count) break;
    const h = hf.sample(x, z);
    const slope = hf.slope(x, z);
    if (!accept(h, slope, x, z)) continue;
    out.push({
      x,
      y: h,
      z,
      s: scale(i),
      rot: rnd(i, seed) * Math.PI * 2,
      // Наклон по рельефу, но не полностью: деревья растут вертикальнее склона.
      tilt: slope * 0.5,
    });
  }
  return out;
}

/** Общее правило: не на тропе, не в реке, не в водоёме, не под водой. */
function freeGround(hf: HeightField, x: number, z: number, h: number): boolean {
  if (trailWeight(x, z) > 0.3) return false;
  if (riverWeight(x, z) > 0.35) return false;
  // Уровень воды берём общий для всех пяти водоёмов, а не только для кратерного
  // озера: иначе в тарне, лагуне и оазисе деревья росли бы прямо из зеркала.
  const water = waterLevelAt(x, z);
  if (h < water + 1.2) return false;
  if (lavaAt(x, z)) return false;
  return true;
}

function InstancedGroup({
  geometry,
  items,
  color,
  wind,
  windHeight,
  castShadow,
  roughness = 0.86,
  tintFrom,
  tintTo,
}: {
  geometry: THREE.BufferGeometry;
  items: Placement[];
  color?: string;
  wind: number;
  windHeight: number;
  castShadow: boolean;
  roughness?: number;
  tintFrom?: string;
  tintTo?: string;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const onBeforeCompile = useWind(wind, windHeight);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    const from = tintFrom ? new THREE.Color(tintFrom) : null;
    const to = tintTo ? new THREE.Color(tintTo) : null;
    const c = new THREE.Color();

    items.forEach((it, i) => {
      e.set(it.tilt * Math.cos(it.rot), it.rot, it.tilt * Math.sin(it.rot));
      q.setFromEuler(e);
      v.set(it.x, it.y, it.z);
      s.setScalar(it.s);
      m.compose(v, q, s);
      mesh.setMatrixAt(i, m);
      if (from && to) {
        c.copy(from).lerp(to, rnd(i, 71));
        mesh.setColorAt(i, c);
      }
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, tintFrom, tintTo]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, Math.max(1, items.length)]}
      castShadow={castShadow}
      receiveShadow
      frustumCulled
    >
      <meshStandardMaterial
        vertexColors
        color={color ?? '#ffffff'}
        roughness={roughness}
        metalness={0}
        onBeforeCompile={onBeforeCompile}
      />
    </instancedMesh>
  );
}

export function Scatter({
  hf,
  tier,
  shadows,
}: {
  hf: HeightField;
  tier: DeviceTier;
  shadows: boolean;
}) {
  // Площадь мира выросла в 6.5 раза, поэтому выросли и количества — иначе лес
  // превращается в редкий парк. Инстансинг делает это почти бесплатным: у всей
  // растительности семь вызовов отрисовки независимо от числа растений.
  const counts = useMemo(() => {
    if (tier === 'low') return { conifer: 900, broadleaf: 850, palm: 150, rocks: 800, flowers: 900 };
    if (tier === 'mid') return { conifer: 2000, broadleaf: 1900, palm: 320, rocks: 1700, flowers: 2200 };
    return { conifer: 3400, broadleaf: 3200, palm: 520, rocks: 2800, flowers: 3800 };
  }, [tier]);

  const geos = useMemo(
    () => ({
      conifer: coniferGeo(),
      broadleaf: broadleafGeo(),
      palm: palmGeo(),
      rockA: rockGeo(1),
      rockB: rockGeo(7),
      flowerA: flowerGeo('#f0e2b8', '#d8a24a'),
      flowerB: flowerGeo('#e2b6d8', '#c86ea8'),
    }),
    [],
  );

  const items = useMemo(() => {
    const free = (x: number, z: number, h: number) => freeGround(hf, x, z, h);

    // Растительность привязана к ЗОНЕ, а не только к высоте с уклоном. В мире
    // с одним биомом высоты хватало; теперь на отметке 30 м может быть и
    // влажный лес, и пепловое поле вулкана, и красная глина каньона — правило
    // «h > 12 && h < 44» посадило бы сосны в кратер.
    const R = WORLD.shore;

    // Хвойные — подножия хребта, ледника и северные склоны.
    const conifer = place(
      hf,
      counts.conifer,
      R,
      11,
      (h, slope, x, z) => {
        const zone = zoneAt(x, z).id;
        if (zone === 'desert' || zone === 'volcano' || zone === 'canyon' || zone === 'cove') return false;
        return h > 22 && h < 92 && slope < 0.42 && free(x, z, h);
      },
      (i) => 5.2 + rnd(i, 21) * 4.6,
    );
    // Широколиственные — влажный средний пояс: лес, луга, окрестности озёр.
    const broadleaf = place(
      hf,
      counts.broadleaf,
      R,
      29,
      (h, slope, x, z) => {
        const zone = zoneAt(x, z).id;
        if (zone === 'desert' || zone === 'volcano' || zone === 'glacier' || zone === 'canyon') return false;
        const s = surfaceAt(x, z, h, slope);
        return (
          h > WORLD.beach + 1 && h < 60 && slope < 0.34 && (s === 'forest' || s === 'grass') && free(x, z, h)
        );
      },
      (i) => 4.6 + rnd(i, 33) * 4.2,
    );
    // Пальмы — узкая полоса пляжа плюс оазис. На вулканическом пепле и на
    // ледниковой морене пляж тоже есть, но пальм там быть не может.
    const palm = place(
      hf,
      counts.palm,
      R,
      53,
      (h, slope, x, z) => {
        const zone = zoneAt(x, z).id;
        if (zone === 'volcano' || zone === 'glacier' || zone === 'ridge') return false;
        const nearOasis = Math.hypot(x - 286, z - 96) < 46;
        if (nearOasis) return h > 9.5 && h < 18 && slope < 0.3 && free(x, z, h);
        return h > WORLD.beach - 2 && h < WORLD.beach + 3.4 && slope < 0.18 && free(x, z, h);
      },
      (i) => 5.4 + rnd(i, 47) * 2.6,
    );
    // Камни — где угодно, но крупные на скалах.
    const rocksA = place(
      hf,
      Math.round(counts.rocks * 0.6),
      R,
      71,
      (h, _s, x, z) => h > 0.6 && free(x, z, h),
      (i) => 0.9 + rnd(i, 59) * 2.4,
    );
    const rocksB = place(
      hf,
      Math.round(counts.rocks * 0.4),
      R,
      97,
      (h, slope, x, z) => h > 30 && slope > 0.18 && free(x, z, h),
      (i) => 1.8 + rnd(i, 61) * 4.4,
    );
    // Цветы — на открытых лугах, не в чаще и не в пустыне.
    const mk = (n: number, seed: number) =>
      place(
        hf,
        n,
        R,
        seed,
        (h, slope, x, z) => {
          const zone = zoneAt(x, z).id;
          if (zone === 'desert' || zone === 'volcano' || zone === 'glacier') return false;
          return h > WORLD.beach && h < 56 && slope < 0.24 && free(x, z, h);
        },
        (i) => 0.9 + rnd(i, seed) * 0.7,
      );

    return {
      conifer,
      broadleaf,
      palm,
      rocksA,
      rocksB,
      flowerA: mk(Math.round(counts.flowers * 0.6), 131),
      flowerB: mk(Math.round(counts.flowers * 0.4), 149),
    };
  }, [hf, counts]);

  return (
    <group>
      <InstancedGroup
        geometry={geos.conifer}
        items={items.conifer}
        wind={0.075}
        windHeight={1}
        castShadow={shadows}
        tintFrom="#c8d8b4"
        tintTo="#ffffff"
      />
      <InstancedGroup
        geometry={geos.broadleaf}
        items={items.broadleaf}
        wind={0.11}
        windHeight={1}
        castShadow={shadows}
        tintFrom="#d2e0b0"
        tintTo="#fff4d8"
      />
      <InstancedGroup
        geometry={geos.palm}
        items={items.palm}
        wind={0.16}
        windHeight={1}
        castShadow={shadows}
      />
      <InstancedGroup geometry={geos.rockA} items={items.rocksA} wind={0} windHeight={1} castShadow={shadows} roughness={0.95} tintFrom="#b9b3a6" tintTo="#ffffff" />
      <InstancedGroup geometry={geos.rockB} items={items.rocksB} wind={0} windHeight={1} castShadow={shadows} roughness={0.95} tintFrom="#a8a29a" tintTo="#f2eee4" />
      <InstancedGroup geometry={geos.flowerA} items={items.flowerA} wind={0.05} windHeight={0.32} castShadow={false} />
      <InstancedGroup geometry={geos.flowerB} items={items.flowerB} wind={0.05} windHeight={0.32} castShadow={false} />
    </group>
  );
}

/**
 * Газон вокруг героя.
 *
 * Диск радиусом ~34 м едет за игроком: как только он отходит от центра
 * больше чем на PATCH_STEP, экземпляры пересаживаются заново. Полная
 * пересадка 4000 матриц занимает около миллисекунды и случается раз в
 * несколько секунд ходьбы — на порядок дешевле, чем засеять травой весь
 * остров (тогда её либо не видно под ногами, либо в кадре сотни тысяч
 * полигонов, из которых 99% за пределами обзора).
 */
export function GrassField({
  hf,
  tier,
  target,
}: {
  hf: HeightField;
  tier: DeviceTier;
  target: React.MutableRefObject<THREE.Vector3>;
}) {
  // Пять былинок на кустик, поэтому «кустиков» нужно много меньше, чем
  // казалось: 3600 × 5 = 18 000 лент вокруг героя — это уже газон.
  const count = tier === 'low' ? 900 : tier === 'mid' ? 2200 : 3600;
  const RADIUS = tier === 'low' ? 18 : 26;
  const PATCH_STEP = 3;

  const geometry = useMemo(() => grassGeo(), []);
  const ref = useRef<THREE.InstancedMesh>(null);
  const center = useRef(new THREE.Vector3(1e9, 0, 1e9));
  const onBeforeCompile = useWind(0.13, 0.5);

  const reseed = (cx: number, cz: number) => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    let n = 0;
    for (const [ox, oz, i] of scatterPoints(count, RADIUS, 3)) {
      const x = cx + ox;
      const z = cz + oz;
      const h = hf.sample(x, z);
      const slope = hf.slope(x, z);
      // Газон растёт только там, где под ногами трава или лесная подстилка:
      // на дюнах, пепле, льду и красной глине былинки выглядели бы наклейками.
      const surf = surfaceAt(x, z, h, slope);
      const ok =
        (surf === 'grass' || surf === 'forest') &&
        h > WORLD.beach - 0.6 &&
        slope < 0.46 &&
        freeGround(hf, x, z, h);
      // Отбракованный кустик не удаляем, а прячем нулевым масштабом: менять
      // count у InstancedMesh на ходу — это пересоздание буферов каждый шаг.
      const scale = ok ? 0.8 + rnd(i, 17) * 0.7 : 0;
      e.set(0, rnd(i, 23) * Math.PI * 2, 0);
      q.setFromEuler(e);
      v.set(x, h, z);
      s.set(scale, scale * (0.8 + rnd(i, 29) * 0.6), scale);
      m.compose(v, q, s);
      mesh.setMatrixAt(n++, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
    // Сфера охвата — вокруг игрока, иначе frustum culling выкинет весь газон.
    mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, 0, cz), RADIUS + 8);
  };

  useFrame(() => {
    const p = target.current;
    if (Math.hypot(p.x - center.current.x, p.z - center.current.z) < PATCH_STEP) return;
    center.current.set(p.x, 0, p.z);
    reseed(p.x, p.z);
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, count]}
      castShadow={false}
      receiveShadow
      frustumCulled={false}
    >
      <meshStandardMaterial
        vertexColors
        roughness={0.9}
        metalness={0}
        side={THREE.DoubleSide}
        onBeforeCompile={onBeforeCompile}
      />
    </instancedMesh>
  );
}
