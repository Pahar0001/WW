'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DeviceTier } from '@/lib/motion';

/**
 * Небо, солнце и облака острова.
 *
 * Единая палитра атмосферы (ATMO) — источник правды для неба, тумана, воды и
 * света сцены. Если бы каждый компонент выбирал цвета сам, горизонт не совпал
 * бы с туманом и остров выглядел бы вырезанным из другой фотографии.
 *
 * Солнце стоит низко (около 21°) намеренно: длинные тени и скользящий свет —
 * то, что отличает кинематографичный кадр от «полдня в редакторе уровней».
 */

export const ATMO = {
  /** Направление НА солнце (нормализованное). */
  sunDir: new THREE.Vector3(0.46, 0.37, 0.81).normalize(),
  sunColor: new THREE.Color('#ffd9a3'),
  /** Тёплый свет / прохладная тень — база кинематографичного грейда. */
  fillColor: new THREE.Color('#8fb0d8'),
  zenith: new THREE.Color('#3a6fbe'),
  horizon: new THREE.Color('#a9c4dd'),
  haze: new THREE.Color('#d8d2bf'),
  fog: new THREE.Color('#bcc6cc'),
  waterShallow: new THREE.Color('#57b6ad'),
  waterDeep: new THREE.Color('#0e3a5a'),
  lakeShallow: new THREE.Color('#63bdba'),
  lakeDeep: new THREE.Color('#194f6b'),
};

/**
 * Плотность экспоненциального тумана — ОДНО значение на всю сцену.
 *
 * Живёт здесь, а не в двух местах, потому что собственные шейдеры воды не
 * получают туман сцены автоматически и считают его сами. Пока константа была
 * записана дважды, любая правка плотности расходилась: горы уже растворялись в
 * дымке, а океан у горизонта оставался насыщенно синим, и мир выглядел
 * вклеенным в чужую фотографию.
 */
export const FOG_DENSITY = 0.0011;

/** Мировая позиция солнечного диска — далеко, но внутри дальней плоскости. */
export const SUN_POS = ATMO.sunDir.clone().multiplyScalar(620);

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    // Направление от камеры к точке купола: небо не должно зависеть от того,
    // где стоит игрок, поэтому купол всегда центрирован на камере.
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uHaze;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);
    float up = clamp(d.y, -1.0, 1.0);

    // Вертикальный градиент: у горизонта плотная дымка, к зениту — глубокая синь.
    float t = pow(clamp(up * 1.05 + 0.06, 0.0, 1.0), 0.62);
    vec3 col = mix(uHorizon, uZenith, t);

    // Дымка у самого горизонта: маскирует край террейна и «сажает» остров в
    // воздух. Полоса узкая (множитель 5.2) и не добита до единицы — при
    // широкой дымке всё небо становилось молочным и кадр терял глубину.
    col = mix(col, uHaze, pow(1.0 - clamp(abs(up) * 5.2, 0.0, 1.0), 2.4) * 0.72);

    // Рассеяние вокруг солнца + сам диск.
    float sd = max(dot(d, normalize(uSunDir)), 0.0);
    col += uSunColor * pow(sd, 7.0) * 0.55;
    col += uSunColor * pow(sd, 900.0) * 6.0;
    // Отражённый свет неба под горизонтом — чтобы низ купола не был чёрным.
    col = mix(col, uHaze * 0.72, clamp(-up * 2.2, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Купол неба. Следует за камерой и не участвует в тенях/глубине. */
export function SkyDome() {
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      uZenith: { value: ATMO.zenith },
      uHorizon: { value: ATMO.horizon },
      uHaze: { value: ATMO.haze },
      uSunColor: { value: ATMO.sunColor },
      uSunDir: { value: ATMO.sunDir },
    }),
    [],
  );

  useFrame(({ camera }) => {
    if (mesh.current) mesh.current.position.copy(camera.position);
  });

  return (
    <mesh ref={mesh} frustumCulled={false} renderOrder={-1000}>
      <sphereGeometry args={[900, 32, 20]} />
      <shaderMaterial
        vertexShader={SKY_VERT}
        fragmentShader={SKY_FRAG}
        uniforms={uniforms}
        side={THREE.BackSide}
        depthWrite={false}
        depthTest={false}
        toneMapped
      />
    </mesh>
  );
}

/** Мягкий «клубок» — текстура для облачных биллбордов. */
function makePuffTexture(): THREE.Texture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;

  // Облако — сумма нескольких мягких кругов, а не один градиент: у одного
  // круга силуэт читается как шар, у суммы — как кучевое облако.
  const blobs: [number, number, number][] = [
    [0.5, 0.56, 0.3],
    [0.34, 0.6, 0.22],
    [0.66, 0.6, 0.24],
    [0.44, 0.44, 0.2],
    [0.6, 0.46, 0.18],
    [0.24, 0.66, 0.15],
    [0.78, 0.66, 0.14],
  ];
  ctx.globalCompositeOperation = 'lighter';
  for (const [bx, by, br] of blobs) {
    const g = ctx.createRadialGradient(bx * S, by * S, 0, bx * S, by * S, br * S);
    g.addColorStop(0, 'rgba(255,255,255,0.62)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.24)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Облачный слой: биллборды на двух высотах, медленно уходящие по ветру.
 * Ушедшее за границу облако возвращается с другой стороны — поле бесконечное
 * без пересоздания геометрии.
 */
export function Clouds({ tier }: { tier: DeviceTier }) {
  const tex = useMemo(() => makePuffTexture(), []);
  const group = useRef<THREE.Group>(null);
  const count = tier === 'low' ? 14 : tier === 'mid' ? 26 : 40;
  const SPAN = 900;

  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const g = 0.618033988749895;
        const rx = ((i * g) % 1) - 0.5;
        const rz = (((i * 2 + 1) * g * 1.7) % 1) - 0.5;
        const layer = i % 3;
        return {
          x: rx * SPAN,
          y: 105 + layer * 42 + (((i * g * 5.1) % 1) - 0.5) * 26,
          z: rz * SPAN,
          scale: 90 + ((i * g * 3.3) % 1) * 150 + layer * 30,
          speed: 1.1 + ((i * g * 7.7) % 1) * 1.5,
          opacity: 0.3 + ((i * g * 2.2) % 1) * 0.34,
        };
      }),
    [count],
  );

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    for (let i = 0; i < g.children.length; i++) {
      const c = g.children[i];
      c.position.x += items[i].speed * dt;
      if (c.position.x > SPAN / 2) c.position.x -= SPAN;
    }
  });

  return (
    <group ref={group}>
      {items.map((c, i) => (
        <sprite key={i} position={[c.x, c.y, c.z]} scale={[c.scale, c.scale * 0.55, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            opacity={c.opacity}
            depthWrite={false}
            // Обычное наложение, а не аддитивное: аддитивные облака на ярком
            // небе выгорают в белые кляксы и теряют силуэт.
            blending={THREE.NormalBlending}
          />
        </sprite>
      ))}
    </group>
  );
}
