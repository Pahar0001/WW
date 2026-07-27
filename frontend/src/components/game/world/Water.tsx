'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DeviceTier } from '@/lib/motion';
import { BASINS, FALLS, HeightField, PathNode, RIVERS, WORLD, type Basin } from './terrain';
import { ATMO, FOG_DENSITY } from './Sky';
import { makeGlowTexture } from '@/components/fx/particles';

/**
 * Вся вода острова: океан, озеро в кальдере, река и водопад.
 *
 * Ключевой приём: береговая линия НЕ моделируется геометрией. Поле высот
 * рельефа загружается в float-текстуру, и водная плоскость просто отбрасывает
 * (discard) пиксели, где земля выше уровня воды. Отсюда бесплатно получаются:
 *  • точная кромка берега в любой бухте, без единого лишнего полигона;
 *  • цвет по глубине (бирюза на отмели → синь в глубине);
 *  • пена именно там, где мелко, — то есть у берега и на порогах.
 *
 * Попытка вырезать берег геометрией на такой изломанной линии дала бы либо
 * зубцы, либо десятки тысяч треугольников на кромку.
 */

/** Поле высот → float-текстура для шейдеров воды. */
export function makeHeightTexture(hf: HeightField): THREE.DataTexture {
  const tex = new THREE.DataTexture(hf.heights, hf.res, hf.res, THREE.RedFormat, THREE.FloatType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

const WATER_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uWaveH;
  uniform float uWaveS;
  uniform float uFlow;

  varying vec3 vWorld;
  varying vec3 vWaveNormal;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);

    // Волны в МИРОВЫХ координатах: разные куски воды (океан, озеро, река)
    // стыкуются без шва, потому что фаза зависит от мировой позиции, а не от
    // локального uv.
    //
    // В ГЕОМЕТРИИ оставлены только две самые длинные волны — зыбь. Мелкая рябь
    // ушла целиком в пиксельный шейдер (см. waveNormal), и вот почему: сетка
    // воды растянута на весь мир, у океана это 3.7 метра между вершинами, у
    // кратерного озера 2.2. Рябь с длиной волны 7 метров попадала на такую
    // сетку тремя точками на период — прямо на пределе Найквиста — и вместо
    // воды по всей плоскости шли ровные полосы шириной с дом. Зыбь длиной
    // в десятки метров такую сетку переживает спокойно.
    float t = uTime;
    float s = uWaveS;
    float swell = sin(world.x * s * 0.34 + t * 0.55) * 0.6
                + sin(world.z * s * 0.47 - t * 0.43) * 0.4;
    world.y += swell * uWaveH;

    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const WATER_FRAG = /* glsl */ `
  uniform sampler2D uHeight;
  uniform float uHalf;
  uniform float uLevel;
  uniform float uUseHeight;   // 1 — берег из рельефа, 0 — фиксированная глубина
  uniform float uFixedDepth;
  uniform vec3 uShallow;
  uniform vec3 uDeep;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uSky;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uFoam;
  uniform vec3 uFogColor;
  uniform float uFogDensity;

  uniform float uWaveH;
  uniform float uWaveS;

  varying vec3 vWorld;

  /**
   * Нормаль волн, посчитанная НА ПИКСЕЛЬ.
   *
   * Аналитическая производная тех же синусов, что и в вершинном шейдере, плюс
   * две высокочастотные октавы, которых в геометрии нет вовсе. Плотность
   * сетки перестаёт что-либо значить: рябь одинаково подробна и под ногами, и
   * на озере в ста метрах, и стоит это несколько инструкций на пиксель вместо
   * сотен тысяч лишних вершин.
   */
  vec3 waveNormal(vec3 p, float t, float s, float dist) {
    // Рябь гаснет с расстоянием. Дело не в экономии: на дальней воде период
    // ряби становится меньше пикселя, и вместо неё идёт муар — тёмная
    // «рябая» плёнка на горизонте. Глаз ждёт обратного: далёкая вода читается
    // гладкой и зеркалит небо. Затухание убирает муар и делает верно.
    float ripple = 1.0 - smoothstep(40.0, 190.0, dist);
    float dx = cos(p.x * s * 0.34 + t * 0.55) * s * 0.34 * 0.6
             + (cos((p.x + p.z) * s * 2.7 + t * 1.9) * s * 2.7 * 0.20
             +  cos((p.x - p.z) * s * 5.1 - t * 2.6) * s * 5.1 * 0.11) * ripple;
    float dz = cos(p.z * s * 0.47 - t * 0.43) * s * 0.47 * 0.4
             + (cos((p.x + p.z) * s * 2.7 + t * 1.9) * s * 2.7 * 0.20
             -  cos((p.x - p.z) * s * 5.1 - t * 2.6) * s * 5.1 * 0.11) * ripple;
    return normalize(vec3(-dx * uWaveH * 9.0, 1.0, -dz * uWaveH * 9.0));
  }

  // Компактный хеш-шум для рисунка пены.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  void main() {
    float depth = uFixedDepth;
    if (uUseHeight > 0.5) {
      vec2 uv = (vWorld.xz + uHalf) / (2.0 * uHalf);
      float ground = texture2D(uHeight, uv).r;
      depth = uLevel - ground;
      // Земля выше воды — здесь воды просто нет. Так берег получается
      // идеально по рельефу, без вырезания геометрии.
      if (depth <= 0.0) discard;
    }

    float viewDist = length(cameraPosition - vWorld);
    vec3 N = waveNormal(vWorld, uTime, uWaveS, viewDist);
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 L = normalize(uSunDir);

    // Цвет по глубине: отмель прозрачно-бирюзовая, глубина — плотная синь.
    // Шкала растянута с 7 до 14 метров вместе с ростом водоёмов: кратерное
    // озеро глубиной девять метров упиралось в неё целиком и выглядело
    // сплошной чернильной кляксой без единого перехода.
    float dn = clamp(depth / 14.0, 0.0, 1.0);
    vec3 col = mix(uShallow, uDeep, dn);

    // Френель: у горизонта вода зеркалит небо, под ногами — прозрачна.
    float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.2);
    col = mix(col, uSky, fres * 0.46);

    // Блик солнца по нормали волны. Показатель ниже, а множитель мягче, чем
    // «физически правильные» 220/1.9: узкий жёсткий блик на волновой сетке
    // распадается на муар из отдельных полос.
    vec3 H = normalize(L + V);
    col += uSunColor * pow(max(dot(N, H), 0.0), 90.0) * 1.1;
    // Рассеянная подсветка гребней.
    col += uSunColor * max(dot(N, L), 0.0) * 0.07;

    // Пена: полосы, «прилипшие» к берегу, дышащие во времени.
    float band = 1.0 - smoothstep(0.0, uFoam, depth);
    float pattern = noise(vWorld.xz * 1.6 + vec2(uTime * 0.35, -uTime * 0.22));
    float foam = smoothstep(0.42, 0.95, band * (0.55 + pattern * 0.75));
    col = mix(col, vec3(0.96, 0.97, 0.98), foam * 0.9);

    // Атмосферная перспектива. Собственный шейдер не получает туман сцены
    // автоматически, и без этой строки океан у горизонта оставался бы
    // насыщенно синим, пока горы уже растворились в дымке, — остров выглядел
    // бы вклеенным в чужую фотографию.
    float fogAmount = 1.0 - exp(-pow(viewDist * uFogDensity, 2.0));
    col = mix(col, uFogColor, clamp(fogAmount, 0.0, 1.0));

    // Отмель полупрозрачна — сквозь неё виден песок.
    float alpha = mix(0.55, uOpacity, dn) + foam * 0.4;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
  }
`;

type WaterUniforms = {
  uTime: { value: number };
  [k: string]: { value: unknown };
};

function useWaterMaterial(opts: {
  heightTex?: THREE.DataTexture;
  level: number;
  useHeight: boolean;
  fixedDepth?: number;
  shallow: THREE.Color;
  deep: THREE.Color;
  waveH: number;
  waveS: number;
  opacity: number;
  foam: number;
}) {
  const uniforms = useMemo<WaterUniforms>(
    () => ({
      uTime: { value: 0 },
      uHeight: { value: opts.heightTex ?? null },
      uHalf: { value: WORLD.half },
      uLevel: { value: opts.level },
      uUseHeight: { value: opts.useHeight ? 1 : 0 },
      uFixedDepth: { value: opts.fixedDepth ?? 1.2 },
      uShallow: { value: opts.shallow },
      uDeep: { value: opts.deep },
      uSunDir: { value: ATMO.sunDir },
      uSunColor: { value: ATMO.sunColor },
      uSky: { value: ATMO.horizon },
      uOpacity: { value: opts.opacity },
      uFoam: { value: opts.foam },
      uWaveH: { value: opts.waveH },
      uWaveS: { value: opts.waveS },
      uFlow: { value: 0 },
      // Должно совпадать с fogExp2 сцены (см. VelaIsland → Scene).
      uFogColor: { value: ATMO.fog },
      uFogDensity: { value: FOG_DENSITY },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opts.heightTex, opts.level, opts.useHeight],
  );
  return uniforms;
}

/** Океан вокруг острова. */
export function Ocean({ heightTex, tier }: { heightTex: THREE.DataTexture; tier: DeviceTier }) {
  const seg = tier === 'low' ? 110 : tier === 'mid' ? 170 : 240;
  const uniforms = useWaterMaterial({
    heightTex,
    level: 0,
    useHeight: true,
    shallow: ATMO.waterShallow,
    deep: ATMO.waterDeep,
    waveH: 0.26,
    waveS: 0.52,
    opacity: 0.96,
    foam: 0.7,
  });
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} renderOrder={2}>
      {/* Плоскость шире острова: за кромкой рельефа вода уходит к горизонту. */}
      <planeGeometry args={[WORLD.half * 2 + 40, WORLD.half * 2 + 40, seg, seg]} />
      <shaderMaterial
        vertexShader={WATER_VERT}
        fragmentShader={WATER_FRAG}
        uniforms={uniforms as never}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Открытое море за границей поля высот — чтобы горизонт не обрывался. */
export function OpenSea() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, 0]} renderOrder={1}>
      <planeGeometry args={[3000, 3000, 1, 1]} />
      <meshStandardMaterial color={ATMO.waterDeep} roughness={0.18} metalness={0.1} />
    </mesh>
  );
}

/**
 * Один водоём: та же механика берега через поле высот, свой уровень и палитра.
 *
 * Берег НЕ моделируется геометрией: поле высот уходит во float-текстуру, и
 * плоскость воды делает `discard` там, где земля выше зеркала. Отсюда даром
 * получается точная кромка в любой бухте, цвет по глубине и пена ровно на
 * отмели — при пяти водоёмах вместо одного это экономит пять наборов
 * береговой геометрии.
 */
function BasinWater({
  basin,
  heightTex,
  tier,
}: {
  basin: Basin;
  heightTex: THREE.DataTexture;
  tier: DeviceTier;
}) {
  const seg = tier === 'low' ? 32 : 64;
  const uniforms = useWaterMaterial({
    heightTex,
    level: basin.level,
    useHeight: true,
    shallow: ATMO.lakeShallow,
    deep: ATMO.lakeDeep,
    waveH: 0.09,
    waveS: 0.9,
    opacity: 0.94,
    foam: 0.5,
  });
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[basin.x, basin.level, basin.z]} renderOrder={2}>
      <planeGeometry args={[basin.r * 2.3, basin.r * 2.3, seg, seg]} />
      <shaderMaterial
        vertexShader={WATER_VERT}
        fragmentShader={WATER_FRAG}
        uniforms={uniforms as never}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Все пресные водоёмы мира: кратерное озеро, тарн, оазис, лагуна. */
export function Lakes({ heightTex, tier }: { heightTex: THREE.DataTexture; tier: DeviceTier }) {
  return (
    <>
      {BASINS.filter((b) => b.kind === 'water').map((b) => (
        <BasinWater key={b.id} basin={b} heightTex={heightTex} tier={tier} />
      ))}
    </>
  );
}

const LAVA_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorld;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += noise(p) * a; p *= 2.07; a *= 0.5; }
    return s;
  }

  void main() {
    vec2 p = vWorld.xz * 0.055;
    // Две конвекционные ячейки с разной скоростью: корка ползёт, трещины
    // между плитами светятся. Один слой читался бы как крашеная плоскость.
    float a = fbm(p + vec2(uTime * 0.021, uTime * -0.014));
    float b = fbm(p * 1.9 + vec2(uTime * -0.03, uTime * 0.024) + 11.0);
    float crust = smoothstep(0.34, 0.62, a * 0.65 + b * 0.45);

    vec3 hot = vec3(1.0, 0.62, 0.16);
    vec3 white = vec3(1.0, 0.92, 0.62);
    vec3 cold = vec3(0.14, 0.07, 0.06);
    // Жилы: чем тоньше корка, тем ярче и белее просвет.
    vec3 c = mix(mix(white, hot, smoothstep(0.0, 0.35, crust)), cold, smoothstep(0.35, 0.95, crust));
    // Медленная пульсация свечения — жерло «дышит».
    c *= 0.85 + 0.15 * sin(uTime * 0.7 + a * 6.0);
    gl_FragColor = vec4(c, 1.0);
  }
`;

const LAVA_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/**
 * Лавовое озеро в жерле вулкана. Непрозрачное и самосветящееся: у лавы нет
 * ни отражений, ни глубины, поэтому шейдер воды здесь не подходит совсем —
 * нужна ползущая корка с раскалёнными трещинами.
 */
export function LavaLakes() {
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
  });
  const lava = BASINS.filter((b) => b.kind === 'lava');
  if (!lava.length) return null;

  return (
    <>
      {lava.map((b) => (
        <mesh key={b.id} rotation={[-Math.PI / 2, 0, 0]} position={[b.x, b.level, b.z]}>
          <circleGeometry args={[b.r * 1.04, 56]} />
          <shaderMaterial vertexShader={LAVA_VERT} fragmentShader={LAVA_FRAG} uniforms={uniforms} />
        </mesh>
      ))}
      {/* Зарево над жерлом: тёплый свет снизу — главная причина, по которой
          вулкан читается издалека даже ночью. */}
      {lava.map((b) => (
        <pointLight
          key={`${b.id}-glow`}
          position={[b.x, b.level + 8, b.z]}
          color="#ff7326"
          intensity={140}
          distance={190}
          decay={2}
        />
      ))}
    </>
  );
}

/**
 * Река: лента по узлам русла. Вершины кладутся на профиль дна и приподняты на
 * пару десятков сантиметров — так вода видна и в брод, и в порогах.
 * Участок обрыва пропущен: там работает отдельный водопад.
 */
export function River({ hf }: { hf: HeightField }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const index: number[] = [];

    // Все реки мира — в одну геометрию: три отдельных меша дали бы три вызова
    // отрисовки и три одинаковых материала ради полутора тысяч треугольников.
    const addRiver = (nodes: PathNode[], baseWidth: number, endWidth: number) => {
      const first = positions.length / 3;
      for (let i = 0; i < nodes.length; i++) {
        const [x, z] = nodes[i];
        const prev = nodes[Math.max(0, i - 1)];
        const next = nodes[Math.min(nodes.length - 1, i + 1)];
        const dx = next[0] - prev[0];
        const dz = next[1] - prev[1];
        const len = Math.hypot(dx, dz) || 1;
        // Перпендикуляр к направлению течения.
        const px = -dz / len;
        const pz = dx / len;
        // Река расширяется к устью — от горного ручья до дельты.
        const w = baseWidth + (endWidth - baseWidth) * (i / (nodes.length - 1));
        for (const s of [-1, 1]) {
          const vx = x + px * w * s;
          const vz = z + pz * w * s;
          // Дно берём из готового рельефа — лента точно ложится в вырезанное русло.
          positions.push(vx, hf.sample(vx, vz) + 0.22, vz);
        }
      }
      for (let i = 0; i < nodes.length - 1; i++) {
        // Пролёт обрыва не заполняем — его закрывает занавес водопада.
        if (Math.abs(nodes[i + 1][2] - nodes[i][2]) > 8) continue;
        const a = first + i * 2;
        index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    };

    addRiver(RIVERS[0], 4.2, 9.5);
    addRiver(RIVERS[1], 3.0, 6.0);
    addRiver(RIVERS[2], 2.6, 5.0);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(index);
    geo.computeVertexNormals();
    return geo;
  }, [hf]);

  const uniforms = useWaterMaterial({
    level: 0,
    useHeight: false,
    fixedDepth: 1.1,
    shallow: new THREE.Color('#79c3c8'),
    deep: new THREE.Color('#276b78'),
    waveH: 0.05,
    waveS: 2.6,
    opacity: 0.86,
    foam: 0.42,
  });
  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <mesh geometry={geometry} renderOrder={3}>
      <shaderMaterial
        vertexShader={WATER_VERT}
        fragmentShader={WATER_FRAG}
        uniforms={uniforms as never}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

const FALL_FRAG = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }

  void main() {
    // Три слоя струй с разной скоростью — падающая вода не должна читаться
    // как одна прокручиваемая текстура.
    float t = uTime;
    float s1 = noise(vec2(vUv.x * 14.0, vUv.y * 5.0 - t * 2.1));
    float s2 = noise(vec2(vUv.x * 26.0 + 9.0, vUv.y * 9.0 - t * 3.4));
    float s3 = noise(vec2(vUv.x * 7.0 - 4.0, vUv.y * 3.0 - t * 1.3));
    float jets = s1 * 0.45 + s2 * 0.3 + s3 * 0.4;

    // Плотно у кромки, распыляется книзу.
    float top = smoothstep(0.0, 0.12, 1.0 - vUv.y);
    float spread = mix(1.0, 0.42, vUv.y);
    // Мягкие боковые края занавеса.
    float sides = smoothstep(0.0, 0.16, vUv.x) * smoothstep(0.0, 0.16, 1.0 - vUv.x);

    float a = clamp(jets * spread * sides + top * 0.5 * sides, 0.0, 1.0);
    // 0.55 вместо 0.92: при высокой плотности занавес читался как гладкая
    // бетонная стена бледно-голубого цвета, а не как падающая вода —
    // сквозь настоящий поток всегда просматривается скала за ним.
    a *= 0.55;
    if (a < 0.01) discard;
    gl_FragColor = vec4(uColor + vec3(jets * 0.18), a);
  }
`;

const FALL_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Водопад: занавес струй + брызги у подножия.
 * Занавес — двусторонняя плоскость на обрыве, вырезанном в рельефе (см. RIVER).
 */
export function Waterfall({ tier, fall = FALLS[0] }: { tier: DeviceTier; fall?: (typeof FALLS)[number] }) {
  const F = fall;
  const height = F.lipH - F.baseH;
  // Занавес разворачиваем ПОПЕРЁК течения. Раньше он был жёстко прибит к
  // плоскости XY: единственный водопад в мире падал строго вдоль +Z, и это
  // сходило с рук. Второй водопад (Ледяные Слёзы) уходит вбок, и неподвижный
  // занавес встал бы к потоку ребром — виден был бы отвес, а не вода.
  const angle = Math.atan2(F.base[0] - F.lip[0], F.base[1] - F.lip[1]);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uColor: { value: new THREE.Color('#cfe6ee') } }),
    [],
  );
  const dropTex = useMemo(
    () => makeGlowTexture('rgba(240,250,255,1)', 'rgba(210,236,246,0.5)'),
    [],
  );
  const mist = useRef<THREE.Points>(null);
  const mistCount = tier === 'low' ? 160 : tier === 'mid' ? 420 : 780;

  const mistGeo = useMemo(() => {
    const pos = new Float32Array(mistCount * 3);
    const seed = new Float32Array(mistCount);
    for (let i = 0; i < mistCount; i++) {
      const g = 0.618033988749895;
      pos[i * 3] = (((i * g) % 1) - 0.5) * F.width * 2.2;
      pos[i * 3 + 1] = ((i * g * 3.1) % 1) * 7;
      pos[i * 3 + 2] = (((i * g * 5.7) % 1) - 0.5) * 7;
      seed[i] = (i * g * 11.3) % 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seed, 1));
    return geo;
  }, [mistCount, F.width]);

  useFrame(({ clock }, dt) => {
    uniforms.uTime.value = clock.elapsedTime;
    const p = mist.current;
    if (!p) return;
    const attr = p.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < mistCount; i++) {
      const i3 = i * 3;
      // Брызги поднимаются и рассеиваются, затем возвращаются вниз.
      arr[i3 + 1] += dt * (1.4 + (i % 5) * 0.32);
      arr[i3] += Math.sin(clock.elapsedTime * 0.8 + i) * dt * 0.6;
      if (arr[i3 + 1] > 9) {
        arr[i3 + 1] = 0;
        arr[i3] = (((i * 0.618) % 1) - 0.5) * F.width * 2.2;
      }
    }
    attr.needsUpdate = true;
  });

  return (
    <group
      position={[(F.lip[0] + F.base[0]) / 2, 0, (F.lip[1] + F.base[1]) / 2]}
      rotation={[0, angle, 0]}
    >
      <mesh position={[0, F.baseH + height / 2, 0]}>
        <planeGeometry args={[F.width * 1.35, height, 1, 1]} />
        <shaderMaterial
          vertexShader={FALL_VERT}
          fragmentShader={FALL_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Второй занавес чуть смещён и уже — придаёт потоку толщину. */}
      <mesh position={[0, F.baseH + height / 2, 1.1]} scale={[0.72, 1, 1]}>
        <planeGeometry args={[F.width * 1.35, height, 1, 1]} />
        <shaderMaterial
          vertexShader={FALL_VERT}
          fragmentShader={FALL_FRAG}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <points ref={mist} geometry={mistGeo} position={[0, F.baseH, 1.5]}>
        {/* Карта обязательна: pointsMaterial без неё рисует КВАДРАТЫ, и вблизи
            брызги выглядели как рассыпанные бумажки. 0.35 м на каплю — при 1.5
            каждая была размером с человека. */}
        <pointsMaterial
          map={dropTex}
          size={0.4}
          sizeAttenuation
          color="#eef7fa"
          transparent
          opacity={0.55}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/** Все водопады мира. */
export function Waterfalls({ tier }: { tier: DeviceTier }) {
  return (
    <>
      {FALLS.map((f) => (
        <Waterfall key={f.id} tier={tier} fall={f} />
      ))}
    </>
  );
}
