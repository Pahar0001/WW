'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { Environment, Lightformer, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { GlobeMarker } from '@/lib/country-coords';
import GEO from '@/data/globe-geo.json';
import { CinematicPost } from '@/components/fx/CinematicPost';
import { clamp, detectTier, type DeviceTier } from '@/lib/motion';

const GOLD = '#d8b878';
const R = 2.2;
// «Магнитный» радиус: страна подсвечивается и кликается, если курсор ближе
// этого расстояния в пикселях — целиться в саму точку не нужно.
const SNAP_PX = 56;

// Fibonacci-sphere point (unit), scaled by radius.
function spherePoint(i: number, n: number, radius = 1): THREE.Vector3 {
  const y = 1 - (i / (n - 1)) * 2;
  const rad = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = i * 2.399963229; // golden angle
  return new THREE.Vector3(Math.cos(theta) * rad, y, Math.sin(theta) * rad).multiplyScalar(radius);
}

// Географическая точка → позиция на сфере (стандартная проекция lat/lng).
function latLngToVector3(lat: number, lng: number, radius = R): THREE.Vector3 {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/** Направление на Солнце для глобуса (совпадает с directionalLight сцены). */
const SUN_DIR = new THREE.Vector3(4, 2.5, 5).normalize();

/**
 * Земля: реальная текстура NASA Blue Marble (public domain) на физическом
 * материале с раздельной шероховатостью суши и океана.
 *
 * Главный приём реализма — «блик солнца по воде». Карты бликов у нас нет, но
 * она и не нужна: на снимке Blue Marble океан — единственное, где синий канал
 * заметно доминирует над красным и зелёным. По этой разнице прямо в шейдере
 * строится маска воды, и внутри неё шероховатость падает почти до зеркальной.
 * В результате океан ловит солнце ровно там, где должен, а суша остаётся
 * матовой — именно это отличает планету от наклеенной на шар картинки.
 *
 * Ровный clearcoat по всей сфере (как было раньше) давал лаковый отблеск и на
 * пустынях, и на льдах — выглядело как ёлочный шар.
 */
function EarthSphere() {
  const { gl } = useThree();
  const earthMap = useLoader(THREE.TextureLoader, '/globe/earth.jpg');
  earthMap.colorSpace = THREE.SRGBColorSpace;
  // Максимальная анизотропия: у края диска текстура идёт почти вдоль взгляда,
  // и без неё побережья превращаются в мыло.
  earthMap.anisotropy = gl.capabilities.getMaxAnisotropy();

  const onBeforeCompile = useMemo(
    () => (shader: THREE.WebGLProgramParametersWithUniforms) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         {
           // Маска воды: синий заметно выше красного и зелёного.
           vec4 earthTexel = texture2D( map, vMapUv );
           float ocean = smoothstep(
             0.015, 0.14,
             earthTexel.b - max( earthTexel.r, earthTexel.g )
           );
           // Вода — почти зеркало, суша — матовая.
           roughnessFactor = mix( roughnessFactor, 0.11, ocean );
         }`,
      );
    },
    [],
  );

  return (
    <mesh>
      <sphereGeometry args={[R * 0.998, 128, 128]} />
      <meshPhysicalMaterial
        map={earthMap}
        roughness={0.92}
        metalness={0}
        // Отражать в космосе почти нечего: слабое окружение оставлено только
        // ради подсветки блика, иначе океан выглядит пластиковым.
        envMapIntensity={0.18}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  );
}

// ── Процедурные облака ─────────────────────────────────────────────────

/** Хеш 3D-решётки → 0..1. */
function hash3(x: number, y: number, z: number): number {
  let h = x * 374761393 + y * 668265263 + z * 1274126177;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

const smoothT = (t: number) => t * t * (3 - 2 * t);

/** Трилинейный value-шум. 3D нужен, чтобы карта сходилась по долготе без шва. */
function valueNoise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = smoothT(x - ix), fy = smoothT(y - iy), fz = smoothT(z - iz);
  const c = (dx: number, dy: number, dz: number) => hash3(ix + dx, iy + dy, iz + dz);
  const x00 = c(0, 0, 0) + fx * (c(1, 0, 0) - c(0, 0, 0));
  const x10 = c(0, 1, 0) + fx * (c(1, 1, 0) - c(0, 1, 0));
  const x01 = c(0, 0, 1) + fx * (c(1, 0, 1) - c(0, 0, 1));
  const x11 = c(0, 1, 1) + fx * (c(1, 1, 1) - c(0, 1, 1));
  const y0 = x00 + fy * (x10 - x00);
  const y1 = x01 + fy * (x11 - x01);
  return y0 + fz * (y1 - y0);
}

function fbm3(x: number, y: number, z: number, octaves = 4): number {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise3(x * f, y * f, z * f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2.07;
  }
  return sum / norm;
}

/**
 * Карта облачности как маска прозрачности.
 *
 * ⚠️ Файл `public/globe/clouds.jpg`, лежавший тут раньше, оказался ПУСТЫМ:
 * 1600×800 сплошного белого, ни одного пикселя темнее 255. Аддитивным слоем он
 * намазывал ровную белую пелену на весь диск — это и была «туманность»,
 * из-за которой планета выглядела снятой сквозь молоко. Файл удалён.
 *
 * Здесь облачность СЧИТАЕТСЯ, причём по настоящей климатологии:
 *  • шум сэмплируется на цилиндре (3D по cos/sin долготы) — карта сходится по
 *    шву 0°/360°, чего плоский 2D-шум дать не может;
 *  • domain warping даёт закрученные фронты вместо ватных клякс;
 *  • плотность зависит от широты: густо на экваторе (ВЗК), разрыв в субтропиках
 *    (пояса высокого давления — там пустыни и ясное небо), снова густо в
 *    умеренных широтах (штормовые треки). Именно этот рисунок мозг узнаёт как
 *    «снимок Земли».
 */
function makeCloudAlphaMap(size = 512): THREE.CanvasTexture {
  const W = size, H = size >> 1;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  const d = img.data;

  const gauss = (v: number, c: number, w: number) => Math.exp(-(((v - c) / w) ** 2));

  for (let j = 0; j < H; j++) {
    const v = j / (H - 1);
    const lat = (0.5 - v) * 180;
    const alat = Math.abs(lat);
    // Доля неба, закрытая облаками, по широте.
    const cover =
      0.3 +
      0.3 * gauss(lat, 0, 13) + // внутритропическая зона конвергенции
      0.26 * gauss(alat, 56, 17) + // штормовые треки умеренных широт
      -0.19 * gauss(alat, 27, 11); // субтропические антициклоны

    // Сжатие по широте: у полюсов меридианы сходятся, и без коррекции
    // облака размазывались бы в кольца.
    const shrink = Math.max(0.15, Math.cos((lat * Math.PI) / 180));

    for (let i = 0; i < W; i++) {
      const u = i / W;
      const ang = u * Math.PI * 2;
      const cx = Math.cos(ang) * 2.6 * shrink;
      const cz = Math.sin(ang) * 2.6 * shrink;
      const cy = v * 5.2;

      // Domain warping: смещаем точку выборки другим шумом.
      const wx = fbm3(cx + 11, cy + 3, cz - 7, 3) - 0.5;
      const wy = fbm3(cx - 5, cy + 19, cz + 2, 3) - 0.5;
      const n = fbm3(cx + wx * 1.6, cy + wy * 1.6, cz, 4);

      const t = 1 - cover;
      const a = smoothT(Math.max(0, Math.min(1, (n - (t - 0.13)) / 0.24)));

      const k = (j * W + i) * 4;
      const val = Math.round(a * 255);
      d[k] = val;
      d[k + 1] = val; // alphaMap читает зелёный канал
      d[k + 2] = val;
      d[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace; // это маска, а не цвет
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Облака: белый ОСВЕЩЁННЫЙ слой, где карта работает маской прозрачности.
 * Настоящие облака ничего не излучают — их освещает то же солнце, и на
 * терминаторе они гаснут вместе с поверхностью. `alphaMap` +
 * meshStandardMaterial дают ровно это; аддитивный слой светился бы и ночью.
 */
function CloudLayer() {
  const cloudsMap = useMemo(() => makeCloudAlphaMap(), []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.008; // дрейф облаков
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[R * 1.008, 96, 96]} />
      <meshStandardMaterial
        color="#ffffff"
        alphaMap={cloudsMap}
        transparent
        opacity={0.9}
        roughness={1}
        metalness={0}
        depthWrite={false}
      />
    </mesh>
  );
}

const ATMO_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vec4 world = modelMatrix * vec4( position, 1.0 );
    vNormalW = normalize( mat3( modelMatrix ) * normal );
    vViewDir = normalize( cameraPosition - world.xyz );
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const ATMO_FRAG = /* glsl */ `
  uniform vec3 uSunDir;
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    // Оболочка отрисована изнутри (BackSide), поэтому нормаль смотрит внутрь —
    // разворачиваем её, иначе френель считается наизнанку.
    vec3 N = normalize( -vNormalW );
    float fres = pow( 1.0 - clamp( dot( N, normalize( vViewDir ) ), 0.0, 1.0 ), 3.0 );

    // Атмосфера светится только там, куда падает солнце: на ночной стороне
    // лимб гаснет. Ровное свечение по всему кругу читается как ореол вокруг
    // ёлочного шара, а не как воздух планеты.
    float sun = clamp( dot( N, normalize( uSunDir ) ), 0.0, 1.0 );
    float lit = pow( sun, 0.6 );

    float a = fres * lit * uIntensity;
    if ( a < 0.002 ) discard;
    gl_FragColor = vec4( uColor, a );
  }
`;

/**
 * Атмосфера: тонкий рэлеевский ободок по лимбу, гаснущий на ночной стороне.
 * Аддитивная оболочка с постоянной прозрачностью, стоявшая тут раньше, ровно
 * подсвечивала весь круг — из-за этого планета казалась завёрнутой в дымку.
 */
function Atmosphere() {
  const uniforms = useMemo(
    () => ({
      uSunDir: { value: SUN_DIR },
      uColor: { value: new THREE.Color('#6ea8ff') },
      uIntensity: { value: 0.85 },
    }),
    [],
  );
  return (
    <mesh>
      <sphereGeometry args={[R * 1.045, 96, 96]} />
      <shaderMaterial
        vertexShader={ATMO_VERT}
        fragmentShader={ATMO_FRAG}
        uniforms={uniforms}
        transparent
        side={THREE.BackSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

type MarkerPoint = GlobeMarker & { pos: THREE.Vector3 };

interface AimState {
  pointer: { x: number; y: number } | null; // NDC курсора (null — вне канваса)
  hovered: MarkerPoint | null; // «примагниченная» страна
  dragging: boolean;
  dragDx: number; // накопленный поворот от перетаскивания (по долготе)
  dragDy: number; // и по вертикали (наклон оси)
}

/**
 * «Магнитное» прицеливание: на каждом кадре проецируем страны в экранные
 * координаты и подсвечиваем ближайшую к курсору видимую (лицевая сторона
 * сферы) в радиусе SNAP_PX. Кликать можно рядом с точкой, не по ней.
 */
function Globe({
  reduced,
  markers,
  particleCount,
  aim,
  onHover,
}: {
  reduced: boolean;
  markers: GlobeMarker[];
  particleCount: number;
  aim: React.MutableRefObject<AimState>;
  onHover: (m: MarkerPoint | null) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const hoveredRef = useRef<MarkerPoint | null>(null);

  // Границы стран одним LineSegments (один draw call на все кольца).
  const borderPositions = useMemo(() => {
    const scale = GEO.scale as number;
    const rings = GEO.borders as number[][];
    const pts: number[] = [];
    for (const ring of rings) {
      const n = ring.length / 2;
      for (let i = 0; i < n - 1; i++) {
        const a = latLngToVector3(ring[i * 2] / scale, ring[i * 2 + 1] / scale, R * 1.006);
        const b = latLngToVector3(ring[(i + 1) * 2] / scale, ring[(i + 1) * 2 + 1] / scale, R * 1.006);
        pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
    return new Float32Array(pts);
  }, []);

  const markerPoints = useMemo<MarkerPoint[]>(
    () => markers.map((m) => ({ ...m, pos: latLngToVector3(m.lat, m.lng) })),
    [markers],
  );

  // Дуги-маршруты между реальными странами каталога (детерминированные пары —
  // без Math.random, чтобы не мигали при ре-рендере). Фолбэк — случайные точки.
  const arcs = useMemo(() => {
    const src: THREE.Vector3[] =
      markerPoints.length >= 4
        ? markerPoints.map((m) => m.pos)
        : Array.from({ length: 8 }).map((_, i) => spherePoint(i * 331, 2600, R));
    const pairs: [THREE.Vector3, THREE.Vector3][] = [];
    const n = src.length;
    for (let i = 0; i < Math.min(7, n - 1); i++) {
      const a = src[(i * 5) % n];
      const b = src[(i * 5 + Math.floor(n / 2)) % n];
      if (a !== b) pairs.push([a, b]);
    }
    return pairs.map(([a, b]) => {
      const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.35);
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      return curve.getPoints(48).map((v) => [v.x, v.y, v.z] as [number, number, number]);
    });
  }, [markerPoints]);

  const world = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    if (!group.current) return;
    const aiming = aim.current.pointer !== null;

    // Перетаскивание вращает глобус руками (по горизонтали и вертикали);
    // авто-вращение замирает, пока пользователь целится — цели не убегают.
    if (aim.current.dragDx !== 0 || aim.current.dragDy !== 0) {
      group.current.rotation.y += aim.current.dragDx;
      // Наклон ограничен ±72°: полюс не «переворачивается» вверх ногами.
      group.current.rotation.x = Math.max(
        -1.25,
        Math.min(1.25, group.current.rotation.x + aim.current.dragDy),
      );
      aim.current.dragDx = 0;
      aim.current.dragDy = 0;
    } else if (!reduced && !aiming) {
      group.current.rotation.y += dt * 0.05;
    }

    // ── Магнитный подбор ближайшей страны ──
    const p = aim.current.pointer;
    let best: MarkerPoint | null = null;
    if (p && !aim.current.dragging) {
      const { width, height } = state.size;
      // Видимость: маркер на ПЕРЕДНЕЙ (обращённой к камере) половине сферы,
      // если он БЛИЖЕ к камере, чем центр глобуса. Прежний тест по нормали
      // с порогом браковал приполярные страны (вся Европа на «макушке»
      // сферы видима, но её нормаль почти перпендикулярна взгляду) —
      // из-за этого наведение «не работало».
      const camDist = state.camera.position.length();
      let bestD = SNAP_PX;
      for (const m of markerPoints) {
        world.copy(m.pos).applyMatrix4(group.current.matrixWorld);
        if (world.distanceTo(state.camera.position) > camDist) continue; // за сферой
        world.project(state.camera);
        const dx = (world.x - p.x) * (width / 2);
        const dy = (world.y - p.y) * (height / 2);
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          bestD = d;
          best = m;
        }
      }
    }
    if (hoveredRef.current?.slug !== best?.slug) {
      hoveredRef.current = best;
      aim.current.hovered = best;
      onHover(best);
    }
  });

  const hovered = hoveredRef.current;

  return (
    <group ref={group}>
      {/* Реалистичная Земля: NASA Blue Marble (public domain), непрозрачная */}
      <EarthSphere />
      {/* Рэлеевский ободок атмосферы, гаснущий на ночной стороне */}
      <Atmosphere />
      {/* Границы стран: единый LineSegments, чуть над поверхностью */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[borderPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color="#f2e9d8" transparent opacity={0.28} depthWrite={false} />
      </lineSegments>
      {/* Glowing arcs */}
      {arcs.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color={GOLD}
          lineWidth={1.4}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
        />
      ))}
      {/* Тонкие дымные облака поверх планеты */}
      <CloudLayer />
      {/* Страны: точка + гало; подсветка — у «примагниченной» */}
      {markerPoints.map((m) => (
        <CountryDot key={m.slug} marker={m} hovered={hovered?.slug === m.slug} />
      ))}
    </group>
  );
}

function CountryDot({ marker, hovered }: { marker: MarkerPoint; hovered: boolean }) {
  const halo = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!halo.current || !core.current) return;
    const t = clock.elapsedTime * 1.6;
    const target = hovered ? 2.6 : 1.35 + Math.sin(t + marker.lat) * 0.15;
    halo.current.scale.setScalar(halo.current.scale.x + (target - halo.current.scale.x) * 0.15);
    (halo.current.material as THREE.MeshBasicMaterial).opacity = hovered ? 0.55 : 0.22;
    const cs = hovered ? 1.7 : 1;
    core.current.scale.setScalar(core.current.scale.x + (cs - core.current.scale.x) * 0.2);
  });
  return (
    <group position={marker.pos}>
      <mesh ref={core}>
        <sphereGeometry args={[0.042, 12, 12]} />
        <meshBasicMaterial color={hovered ? '#f5e4b8' : GOLD} />
      </mesh>
      <mesh ref={halo}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

/**
 * Студийное окружение из lightformer'ов — локальная замена HDRI.
 *
 * Готовый HDRI пришлось бы тянуть с CDN (несколько мегабайт и внешняя
 * зависимость на каждой загрузке страницы). Здесь карта окружения печётся
 * один раз в разрешении 128–256 из четырёх «софтбоксов»: тёплый key сбоку,
 * холодный rim сзади, мягкий fill сверху и слабый отражатель снизу. Именно
 * этот набор даёт физическому материалу дорогие протяжённые блики.
 */
function SpaceEnvironment({ tier }: { tier: DeviceTier }) {
  return (
    <Environment resolution={tier === 'high' ? 128 : 64} frames={1}>
      {/* Солнце: единственный по-настоящему яркий источник в кадре. */}
      <Lightformer form="circle" intensity={6} color="#fff6ec" position={[8, 5, 9]} scale={[3, 3, 1]} target={[0, 0, 0]} />
      {/* Едва различимая холодная заливка «звёздного неба»: без неё зеркальный
          океан отражает абсолютную черноту и выглядит мёртвым пластиком. */}
      <Lightformer form="rect" intensity={0.16} color="#2c3a58" position={[-9, 2, -7]} scale={[14, 10, 1]} target={[0, 0, 0]} />
      <Lightformer form="rect" intensity={0.1} color="#1e2740" position={[0, -8, 3]} scale={[12, 8, 1]} target={[0, 0, 0]} />
    </Environment>
  );
}

/**
 * Камера: параллакс по курсору + реакция на скролл.
 *
 * Скролл отъезжает камеру назад и слегка приподнимает её — планета «уходит»
 * вглубь кадра по мере чтения страницы. scrollY читаем прямо в useFrame:
 * это одно чтение свойства (не layout), дешевле подписки на события.
 */
function Rig({ aim, scrollReact }: { aim: React.MutableRefObject<AimState>; scrollReact: boolean }) {
  const { camera } = useThree();
  const wrap = useRef<HTMLElement | null>(null);
  const base = useRef(camera.position.z);

  useFrame((state, dt) => {
    const idle = aim.current.pointer === null;
    const tx = idle ? state.pointer.x * 0.55 : 0;
    const ty = idle ? -state.pointer.y * 0.4 : 0;
    const k = Math.min(1, dt * 1.6);
    camera.position.x += (tx - camera.position.x) * k;
    camera.position.y += (ty - camera.position.y) * k;

    if (scrollReact) {
      if (!wrap.current) {
        wrap.current = (state.gl.domElement.closest('[data-globe-wrap]') as HTMLElement) ?? null;
      }
      const el = wrap.current;
      if (el) {
        const r = el.getBoundingClientRect();
        // Прогресс прохождения секции через вьюпорт: 0 — она внизу экрана,
        // 1 — ушла вверх.
        const p = clamp((window.innerHeight - r.top) / (window.innerHeight + r.height));
        const z = base.current + (p - 0.5) * 1.5;
        camera.position.z += (z - camera.position.z) * k;
      }
    }
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function Hero3D({
  markers = [],
  onSelect,
  scrollReact = true,
}: {
  markers?: GlobeMarker[];
  /** Обработчик клика по стране. Без него — переход на маршрут (поведение hero). */
  onSelect?: (marker: GlobeMarker) => void;
  /** Отъезд камеры по мере прокрутки секции. Выключать во фиксированном hero. */
  scrollReact?: boolean;
}) {
  const router = useRouter();
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Класс устройства определяет и плотность пыли, и наличие пост-обработки:
  // на слабом железе композер съедает больше, чем даёт.
  const [tier, setTier] = useState<DeviceTier>('mid');
  useEffect(() => setTier(detectTier()), []);
  const particleCount = tier === 'low' ? 1300 : 2600;

  const aim = useRef<AimState>({ pointer: null, hovered: null, dragging: false, dragDx: 0, dragDy: 0 });
  // moved — МАКСИМАЛЬНОЕ смещение от точки нажатия (не накопленный путь!):
  // дрожащий палец/мышь при обычном клике не должны превращать его в драг.
  const drag = useRef({ active: false, moved: 0, lastX: 0, lastY: 0, startX: 0, startY: 0 });
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  // Перф: пауза рендера, когда герой вне вьюпорта (кадры не жгут батарею).
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    if (!wrap.current) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.05,
    });
    io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  // Курсор: «рука» над примагниченной страной, «grab» при перетаскивании.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    el.style.cursor = hoveredName ? 'pointer' : '';
  }, [hoveredName]);

  const toNdc = (e: { clientX: number; clientY: number }) => {
    const rect = wrap.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
    };
  };

  return (
    <div
      ref={wrap}
      data-globe-wrap
      className="relative h-full w-full touch-pan-y select-none"
      onPointerEnter={(e) => {
        aim.current.pointer = toNdc(e); // наведение работает сразу, без движения
      }}
      onPointerMove={(e) => {
        aim.current.pointer = toNdc(e);
        if (process.env.NODE_ENV !== 'production') (window as any).__aim = aim.current;
        if (drag.current.active) {
          const dx = e.clientX - drag.current.lastX;
          const dy = e.clientY - drag.current.lastY;
          drag.current.lastX = e.clientX;
          drag.current.lastY = e.clientY;
          drag.current.moved = Math.max(
            drag.current.moved,
            Math.hypot(e.clientX - drag.current.startX, e.clientY - drag.current.startY),
          );
          aim.current.dragDx += dx * 0.004; // вращение по долготе
          aim.current.dragDy += dy * 0.004; // наклон по вертикали
          aim.current.dragging = drag.current.moved > 10;
        }
      }}
      onPointerDown={(e) => {
        drag.current = { active: true, moved: 0, lastX: e.clientX, lastY: e.clientY, startX: e.clientX, startY: e.clientY };
        aim.current.pointer = toNdc(e);
      }}
      onPointerUp={() => {
        const wasDrag = drag.current.moved > 10;
        drag.current.active = false;
        aim.current.dragging = false;
        // Клик (не перетаскивание) → примагниченная страна.
        if (!wasDrag && aim.current.hovered) {
          const m = aim.current.hovered;
          if (onSelect) onSelect(m);
          else router.push(`/trips/${m.slug}`);
        }
      }}
      onPointerLeave={() => {
        aim.current.pointer = null;
        aim.current.dragging = false;
        drag.current.active = false;
      }}
    >
      {/* Подпись «примагниченной» страны — HTML-чип поверх канваса,
          прижат к низу обёртки: никогда не выезжает за границы фрейма. */}
      {hoveredName && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-10 flex justify-center px-4">
          <div className="flex max-w-full items-center gap-2.5 rounded-full border border-[#d8b878]/50 bg-[#0d0b08]/90 px-5 py-2.5 text-sm text-white shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#d8b878]" />
            <span className="truncate font-medium">{hoveredName}</span>
            <span className="shrink-0 whitespace-nowrap text-[#d8b878]">открыть →</span>
          </div>
        </div>
      )}
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 42 }}
        dpr={[1, tier === 'low' ? 1.5 : 2]}
        frameloop={visible ? 'always' : 'never'}
        gl={{ antialias: tier !== 'low', alpha: true, powerPreference: 'high-performance' }}
        // ACES + экспозиция чуть выше единицы: тёплые света уходят в кремовый,
        // а не в чистый белый. Кривая живёт на рендерере, а не в композере —
        // иначе на low-тире (без композера) картинка была бы другой.
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          // Океан на снимке Blue Marble имеет очень низкое альбедо: при
          // экспозиции 1.08 диск честно уходил в почти чёрный, и золотые метки
          // стран на нём терялись. 1.22 сохраняет терминатор, но возвращает
          // читаемость — это интерфейс, а не астрофото.
          gl.toneMappingExposure = 1.22;
        }}
        // События обрабатываем на обёртке (магнитный снапинг), r3f-рейкаст не нужен.
        events={undefined}
      >
        {/*
          Тумана в сцене НЕТ намеренно. Он начинался в семи единицах от камеры,
          то есть ровно на дальней половине шара, и затягивал лимб дымкой —
          планета выглядела снятой сквозь мутное стекло. В космосе между
          камерой и Землёй рассеивать нечего.

          Свет: одно почти белое солнце (Солнце — источник класса D65, тёплым
          его делает только земная атмосфера) плюс очень слабая заливка вместо
          прежней ambient 0.32: при сильной заливке ночная сторона светилась
          сама по себе и терминатор пропадал.
        */}
        <ambientLight intensity={0.16} />
        <directionalLight position={[4, 2.5, 5]} intensity={3.9} color="#fff6ec" />
        {/* Пепельный свет: ночная сторона не абсолютно чёрная, но и не «день». */}
        <directionalLight position={[-5, -1, -4]} intensity={0.22} color="#5f7fb0" />

        <Suspense fallback={null}>
          <SpaceEnvironment tier={tier} />
          <Globe
            reduced={reduced}
            markers={markers}
            particleCount={particleCount}
            aim={aim}
            onHover={(m) => setHoveredName(m?.name ?? null)}
          />
        </Suspense>

        {/*
          Ни солнечного гало, ни объёмных лучей, ни поля пыли вокруг планеты.
          Всё это — атмосферные эффекты, которым в вакууме взяться неоткуда:
          именно они читались как «туманность» и мешали увидеть саму Землю.
        */}

        {!reduced && <Rig aim={aim} scrollReact={scrollReact} />}
        {/*
          Пост-обработка сведена к оптике объектива: слабый bloom с высоким
          порогом ловит только солнечный блик по океану и золотые метки стран.
          Плёночное зерно убрано полностью (grain 0) — оно делает картинку
          «киношной», то есть ровно противоположной фотореализму, а виньетка
          оставлена едва заметной, чтобы кадр не расползался по краям.
        */}
        {!reduced && (
          <CinematicPost
            tier={tier}
            bloom={0.32}
            bloomThreshold={0.86}
            dof={false}
            vignette={0.16}
            grain={0}
            saturation={0.02}
            contrast={0.02}
          />
        )}
      </Canvas>
    </div>
  );
}
