'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Объёмный свет для сцен Vela: солнечный диск, световые конусы и поле пыли.
 *
 * Почему НЕ пост-эффект GodRays:
 *  GodRays требует, чтобы источник был реальным объектом в кадре, даёт артефакты
 *  на краях экрана при перекрытии и стоит дополнительный проход по всему кадру.
 *  Аддитивная геометрия + bloom из CinematicPost дают тот же кинематографичный
 *  результат, работают на всех тирах (включая low, где композера нет вовсе) и
 *  полностью управляемы художественно.
 *
 * Все текстуры генерируются в рантайме на canvas — ни одного сетевого запроса
 * и ни одного файла в репозитории.
 */

/**
 * Радиальный градиент «мягкая точка света» — база для солнца, пылинок,
 * брызг и любых частиц.
 *
 * Экспортируется, потому что `pointsMaterial` БЕЗ карты рисует квадраты:
 * это самый заметный признак дешёвой графики, и повторять генератор в каждом
 * файле с частицами не нужно.
 */
export function makeGlowTexture(inner = 'rgba(255,246,224,1)', mid = 'rgba(255,214,140,0.42)') {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.28, mid);
  g.addColorStop(1, 'rgba(255,190,110,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Солнце: ядро + два ореола разного размера. Три слоя вместо одного —
 * иначе диск читается как плоский спрайт, а не как источник света.
 */
export function SunGlow({
  position = [0, 0, 0],
  scale = 1,
  intensity = 1,
}: {
  position?: [number, number, number];
  scale?: number;
  intensity?: number;
}) {
  const tex = useMemo(() => makeGlowTexture(), []);
  const halo = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!halo.current) return;
    // Дыхание ореола: ±4% за ~7 секунд. Больше — уже мигание.
    const b = 1 + Math.sin(clock.elapsedTime * 0.9) * 0.04;
    halo.current.scale.setScalar(b);
  });

  return (
    <group position={position} scale={scale}>
      <group ref={halo}>
        <sprite scale={[1, 1, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            opacity={0.95 * intensity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
        <sprite scale={[3.2, 3.2, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            opacity={0.34 * intensity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
        <sprite scale={[8, 8, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            opacity={0.14 * intensity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      </group>
    </group>
  );
}

const SHAFT_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const SHAFT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uTime;
  uniform float uSeed;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    // Затухание по длине конуса: у источника плотно, к концу растворяется.
    float along = smoothstep(0.0, 0.16, vUv.y) * (1.0 - smoothstep(0.42, 1.0, vUv.y));

    // Грани, повёрнутые к камере, светят сильнее — конус читается объёмным,
    // а не как вырезанный из бумаги треугольник.
    float facing = abs(dot(normalize(vNormalW), normalize(vViewDir)));
    float body = mix(0.22, 1.0, pow(facing, 0.9));

    // Живое дыхание луча: две несинхронные синусоиды, чтобы не было ритма.
    float flicker = 0.82
      + 0.12 * sin(uTime * 0.7 + uSeed * 6.2831)
      + 0.06 * sin(uTime * 1.9 + uSeed * 12.0);

    float a = along * body * uIntensity * flicker;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

/**
 * Световые конусы, расходящиеся из одной точки (солнце/прореха в облаках).
 * Углы и длины разведены детерминированно — при каждом монтировании картина
 * одинаковая, без «мигания» на ре-рендере.
 */
export function LightShafts({
  count = 5,
  origin = [0, 6, -4],
  target = [0, -2, 0],
  color = '#ffdca8',
  length = 14,
  spread = 1.1,
  intensity = 0.34,
}: {
  count?: number;
  origin?: [number, number, number];
  target?: [number, number, number];
  color?: string;
  length?: number;
  /** Разброс концов конусов вокруг цели, в мировых единицах. */
  spread?: number;
  intensity?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<THREE.ShaderMaterial[]>([]);
  const col = useMemo(() => new THREE.Color(color), [color]);

  const shafts = useMemo(() => {
    const o = new THREE.Vector3(...origin);
    const t = new THREE.Vector3(...target);
    const golden = 2.399963229;
    return Array.from({ length: count }, (_, i) => {
      // Детерминированный веер: золотой угол + разная длина каждого луча.
      const a = i * golden;
      const rad = spread * (0.35 + ((i * 0.37) % 1) * 0.9);
      const end = t.clone().add(new THREE.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad));
      const dir = end.clone().sub(o);
      const len = length * (0.72 + ((i * 0.61) % 1) * 0.55);
      const mid = o.clone().add(dir.clone().normalize().multiplyScalar(len * 0.5));
      // Кватернион, кладущий +Y конуса вдоль направления луча.
      const q = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.clone().normalize().negate(),
      );
      return {
        position: mid.toArray() as [number, number, number],
        quaternion: q,
        length: len,
        radius: len * (0.09 + ((i * 0.23) % 1) * 0.07),
        seed: (i * 0.618) % 1,
      };
    });
  }, [count, origin, target, length, spread]);

  useFrame(({ clock }) => {
    for (const m of mats.current) {
      if (m) m.uniforms.uTime.value = clock.elapsedTime;
    }
  });

  return (
    <group ref={group}>
      {shafts.map((s, i) => (
        <mesh key={i} position={s.position} quaternion={s.quaternion}>
          <coneGeometry args={[s.radius, s.length, 18, 1, true]} />
          <shaderMaterial
            ref={(m) => {
              if (m) mats.current[i] = m as THREE.ShaderMaterial;
            }}
            vertexShader={SHAFT_VERT}
            fragmentShader={SHAFT_FRAG}
            uniforms={{
              uColor: { value: col },
              uIntensity: { value: intensity },
              uTime: { value: 0 },
              uSeed: { value: s.seed },
            }}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Поле парящей пыли. Одна геометрия Points с аддитивным спрайтом:
 * тысяча частиц = один draw call.
 *
 * Частицы медленно всплывают и заворачиваются по кругу, а всё поле мягко
 * реагирует на курсор — это главный источник ощущения «воздуха» в кадре.
 */
export function DustField({
  count = 700,
  radius = 12,
  height = 9,
  size = 0.07,
  color = '#f4e3c0',
  opacity = 0.5,
  speed = 0.16,
  mouseInfluence = 0.5,
}: {
  count?: number;
  radius?: number;
  height?: number;
  size?: number;
  color?: string;
  opacity?: number;
  speed?: number;
  mouseInfluence?: number;
}) {
  const points = useRef<THREE.Points>(null);
  const { size: viewport } = useThree();
  const tex = useMemo(
    () => makeGlowTexture('rgba(255,250,235,1)', 'rgba(255,235,190,0.5)'),
    [],
  );

  const { positions, phases } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    const golden = 0.618033988749895;
    for (let i = 0; i < count; i++) {
      // Равномерное детерминированное облако: спираль по золотому углу,
      // радиус по sqrt для плотности без сгустка в центре.
      const a = i * 2.399963229;
      const r = radius * Math.sqrt(((i * golden) % 1));
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = (((i * golden * 3.7) % 1) - 0.5) * height;
      pos[i * 3 + 2] = Math.sin(a) * r;
      ph[i] = ((i * golden * 11.3) % 1) * Math.PI * 2;
    }
    return { positions: pos, phases: ph };
  }, [count, radius, height]);

  const base = useMemo(() => positions.slice(), [positions]);

  useFrame(({ clock, pointer }, dt) => {
    const p = points.current;
    if (!p) return;
    const t = clock.elapsedTime;
    const attr = p.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const ph = phases[i];
      // Всплытие с заворотом: y растёт, по кругу — лёгкое покачивание.
      let y = base[i3 + 1] + ((t * speed * (0.4 + (ph % 1))) % height);
      if (y > height / 2) y -= height;
      arr[i3] = base[i3] + Math.sin(t * 0.3 + ph) * 0.35;
      arr[i3 + 1] = y;
      arr[i3 + 2] = base[i3 + 2] + Math.cos(t * 0.26 + ph * 1.3) * 0.35;
    }
    attr.needsUpdate = true;

    // Поле целиком слегка сносит за курсором — параллакс без движения камеры.
    if (mouseInfluence) {
      const tx = pointer.x * mouseInfluence;
      const ty = -pointer.y * mouseInfluence * 0.6;
      p.position.x += (tx - p.position.x) * Math.min(1, dt * 2.2);
      p.position.y += (ty - p.position.y) * Math.min(1, dt * 2.2);
    }
    p.rotation.y = t * 0.012;
  });

  // Размер частицы в пикселях зависит от высоты канваса, иначе на 4K
  // пылинки превращаются в точки, а на мобильном — в кляксы.
  const pxScale = Math.min(2, Math.max(0.6, viewport.height / 900));

  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        size={size * pxScale}
        sizeAttenuation
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
