'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { DeviceTier } from '@/lib/motion';
import { HeightField, WORLD, rnd } from './terrain';

/**
 * Живность острова: птицы в небе, бабочки над лугами, олени на склонах.
 *
 * Птицы и бабочки — InstancedMesh с маханием крыльями в вершинном шейдере:
 * смещение по Y пропорционально расстоянию вершины от оси тела, поэтому одна
 * геометрия и один draw call дают сотню независимо машущих существ.
 * Считать это на CPU (по два поворота крыльев на существо) стоило бы двух
 * матриц на кадр каждому и десятков вызовов рисования.
 *
 * Олени сложнее: у них походка и поведение, поэтому они собраны из отдельных
 * узлов (5 мешей на особь) и их всего несколько.
 */

const FLAP_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uRate;
  uniform float uAmp;
  attribute float aPhase;
  varying vec3 vNormalW;

  void main() {
    vec3 p = position;
    // Крылья: чем дальше вершина от осевой линии тела, тем больше ход.
    float span = abs(p.x);
    p.y += sin(uTime * uRate + aPhase * 6.2831) * span * uAmp;

    #ifdef USE_INSTANCING
      vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
      vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
    #else
      vec4 world = modelMatrix * vec4(p, 1.0);
      vNormalW = normalize(mat3(modelMatrix) * normal);
    #endif
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FLAP_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uSunDir;
  varying vec3 vNormalW;
  void main() {
    // Простое двустороннее освещение: крылья видно и снизу, на просвет.
    float d = abs(dot(normalize(vNormalW), normalize(uSunDir)));
    vec3 c = uColor * (0.55 + 0.6 * d);
    gl_FragColor = vec4(c, 1.0);
  }
`;

function wingGeometry(span: number, chord: number): THREE.BufferGeometry {
  // Тело + два крыла как треугольники. Плоская «птичья галочка» —
  // на дистанции в полсотни метров этого достаточно, а стоит 4 треугольника.
  const g = new THREE.BufferGeometry();
  const s = span;
  const c = chord;
  const pos = new Float32Array([
    // левое крыло
    0, 0, -c * 0.5, -s, 0, c * 0.1, 0, 0, c * 0.6,
    // правое крыло
    0, 0, -c * 0.5, 0, 0, c * 0.6, s, 0, c * 0.1,
    // тело
    -c * 0.16, 0, -c * 0.7, c * 0.16, 0, -c * 0.7, 0, 0, c * 0.9,
  ]);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

type Flyer = {
  /** Центр орбиты. */
  cx: number;
  cy: number;
  cz: number;
  radius: number;
  speed: number;
  phase: number;
  bob: number;
  scale: number;
};

/** Стая птиц: широкие круги над островом на разных высотах. */
export function Birds({ tier }: { tier: DeviceTier }) {
  const count = tier === 'low' ? 12 : tier === 'mid' ? 24 : 40;
  // wingGeometry(span, chord): span — ПОЛОВИНА размаха. 0.55 → 1.1 м базово,
  // с масштабом до ~2 м. Прежняя единица давала четырёхметровых птиц.
  const geometry = useMemo(() => wingGeometry(0.55, 0.85), []);
  const mesh = useRef<THREE.InstancedMesh>(null);

  const flyers = useMemo<Flyer[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        cx: (rnd(i, 3) - 0.5) * 150,
        cy: 34 + rnd(i, 5) * 46,
        cz: (rnd(i, 7) - 0.5) * 150,
        radius: 22 + rnd(i, 11) * 52,
        speed: 0.11 + rnd(i, 13) * 0.15,
        phase: rnd(i, 17),
        bob: 1.4 + rnd(i, 19) * 2.6,
        scale: 1 + rnd(i, 23) * 0.8,
      })),
    [count],
  );

  const phases = useMemo(() => {
    const a = new Float32Array(count);
    for (let i = 0; i < count; i++) a[i] = flyers[i].phase;
    return a;
  }, [count, flyers]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRate: { value: 7.5 },
      uAmp: { value: 0.55 },
      uColor: { value: new THREE.Color('#2b2822') },
      uSunDir: { value: new THREE.Vector3(0.46, 0.37, 0.81).normalize() },
    }),
    [],
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const f = flyers[i];
      const a = t * f.speed + f.phase * 6.283;
      v.set(
        f.cx + Math.cos(a) * f.radius,
        f.cy + Math.sin(t * 0.4 + f.phase * 3) * f.bob,
        f.cz + Math.sin(a) * f.radius,
      );
      // Разворот по касательной к орбите + крен в поворот.
      e.set(0, -a + Math.PI / 2, Math.sin(a) * 0.22);
      q.setFromEuler(e);
      s.setScalar(f.scale);
      mat.compose(v, q, s);
      m.setMatrixAt(i, mat);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false}>
      <shaderMaterial
        vertexShader={FLAP_VERT}
        fragmentShader={FLAP_FRAG}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
      <instancedBufferAttribute attach="geometry-attributes-aPhase" args={[phases, 1]} />
    </instancedMesh>
  );
}

/** Бабочки: короткие петли над лугами, у самой земли. */
export function Butterflies({ hf, tier }: { hf: HeightField; tier: DeviceTier }) {
  const count = tier === 'low' ? 18 : tier === 'mid' ? 42 : 80;
  // 6 см на крыло: бабочка размером с ладонь, а не с воздушного змея.
  const geometry = useMemo(() => wingGeometry(0.06, 0.055), []);
  const mesh = useRef<THREE.InstancedMesh>(null);

  const spots = useMemo(() => {
    // Держим бабочек там, где есть цветы: открытые луга среднего пояса.
    const out: Flyer[] = [];
    for (let i = 0; out.length < count && i < count * 12; i++) {
      const a = i * 2.399963229;
      const r = 100 * Math.sqrt(((i * 0.618033988749895) % 1));
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = hf.sample(x, z);
      if (h < 3.2 || h > 26 || hf.slope(x, z) > 0.26) continue;
      out.push({
        cx: x,
        cy: h + 0.9,
        cz: z,
        radius: 1.4 + rnd(i, 31) * 3.4,
        speed: 0.5 + rnd(i, 37) * 0.8,
        phase: rnd(i, 41),
        bob: 0.35 + rnd(i, 43) * 0.5,
        scale: 0.85 + rnd(i, 47) * 0.7,
      });
    }
    return out;
  }, [hf, count]);

  const phases = useMemo(() => {
    const a = new Float32Array(spots.length);
    for (let i = 0; i < spots.length; i++) a[i] = spots[i].phase;
    return a;
  }, [spots]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uRate: { value: 22 },
      uAmp: { value: 1.5 },
      uColor: { value: new THREE.Color('#f2d08a') },
      uSunDir: { value: new THREE.Vector3(0.46, 0.37, 0.81).normalize() },
    }),
    [],
  );

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    const m = mesh.current;
    if (!m) return;
    const t = clock.elapsedTime;
    const mat = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const s = new THREE.Vector3();
    for (let i = 0; i < spots.length; i++) {
      const f = spots[i];
      const a = t * f.speed + f.phase * 6.283;
      // Восьмёрка вместо круга — полёт бабочки не бывает равномерным.
      v.set(
        f.cx + Math.sin(a) * f.radius,
        f.cy + Math.abs(Math.sin(a * 2.1)) * f.bob,
        f.cz + Math.sin(a * 2) * f.radius * 0.6,
      );
      e.set(0.3, -a * 1.4, Math.sin(a * 3) * 0.4);
      q.setFromEuler(e);
      s.setScalar(f.scale);
      mat.compose(v, q, s);
      m.setMatrixAt(i, mat);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  if (!spots.length) return null;

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, spots.length]} frustumCulled={false}>
      <shaderMaterial
        vertexShader={FLAP_VERT}
        fragmentShader={FLAP_FRAG}
        uniforms={uniforms}
        side={THREE.DoubleSide}
      />
      <instancedBufferAttribute attach="geometry-attributes-aPhase" args={[phases, 1]} />
    </instancedMesh>
  );
}

// ── Олени ──────────────────────────────────────────────────────────────

type DeerState = {
  x: number;
  z: number;
  yaw: number;
  targetX: number;
  targetZ: number;
  /** 0 — стоит и пасётся, 1 — идёт, 2 — убегает. */
  mode: 0 | 1 | 2;
  timer: number;
  step: number;
};

/**
 * Олень: корпус одним мешем, четыре ноги — отдельными (их надо анимировать).
 * Пасётся, бродит между случайными точками и убегает, если подойти ближе
 * восьми метров, — реакция на игрока делает мир живым сильнее, чем ещё
 * пятьсот деревьев.
 */
function Deer({
  hf,
  player,
  seed,
}: {
  hf: HeightField;
  player: React.MutableRefObject<THREE.Vector3>;
  seed: number;
}) {
  const group = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Mesh | null)[]>([null, null, null, null]);
  const head = useRef<THREE.Group>(null);

  const st = useRef<DeerState>({
    x: 0,
    z: 0,
    yaw: 0,
    targetX: 0,
    targetZ: 0,
    mode: 0,
    timer: 0,
    step: 0,
  });

  // Начальное место: ровный участок среднего пояса.
  useMemo(() => {
    for (let i = 0; i < 400; i++) {
      const a = (i + seed * 37) * 2.399963229;
      const r = 90 * Math.sqrt(((i * 0.618033988749895 + seed * 0.31) % 1));
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = hf.sample(x, z);
      if (h > 4 && h < 24 && hf.slope(x, z) < 0.2) {
        st.current.x = st.current.targetX = x;
        st.current.z = st.current.targetZ = z;
        return;
      }
    }
    st.current.x = st.current.targetX = 20;
    st.current.z = st.current.targetZ = 40;
  }, [hf, seed]);

  useFrame(({ clock }, dt) => {
    const s = st.current;
    const g = group.current;
    if (!g) return;
    const d = Math.min(dt, 0.05);

    const dxP = s.x - player.current.x;
    const dzP = s.z - player.current.z;
    const distP = Math.hypot(dxP, dzP);

    if (distP < 9) {
      // Убегаем от игрока: цель — точка в противоположную сторону.
      s.mode = 2;
      s.timer = 2.4;
      const len = distP || 1;
      s.targetX = s.x + (dxP / len) * 26;
      s.targetZ = s.z + (dzP / len) * 26;
    }

    s.timer -= d;
    if (s.timer <= 0) {
      if (s.mode === 0) {
        // Пасся — идём к новой точке.
        s.mode = 1;
        const a = rnd(Math.floor(clock.elapsedTime * 3) + seed, 7) * Math.PI * 2;
        const r = 12 + rnd(Math.floor(clock.elapsedTime) + seed, 11) * 22;
        s.targetX = s.x + Math.cos(a) * r;
        s.targetZ = s.z + Math.sin(a) * r;
        s.timer = 6 + rnd(seed, 13) * 5;
      } else {
        s.mode = 0;
        s.timer = 3 + rnd(Math.floor(clock.elapsedTime) + seed, 17) * 5;
      }
    }

    const speed = s.mode === 2 ? 7.5 : s.mode === 1 ? 1.9 : 0;
    if (speed > 0) {
      let dx = s.targetX - s.x;
      let dz = s.targetZ - s.z;
      const len = Math.hypot(dx, dz);
      if (len < 1.2) {
        s.mode = 0;
        s.timer = Math.min(s.timer, 1.5);
      } else {
        dx /= len;
        dz /= len;
        const nx = s.x + dx * speed * d;
        const nz = s.z + dz * speed * d;
        // Не заходим в воду и на отвесы — иначе олень уплывёт в океан.
        const nh = hf.sample(nx, nz);
        if (nh > WORLD.beach - 1 && hf.slope(nx, nz) < 0.5) {
          s.x = nx;
          s.z = nz;
        } else {
          s.mode = 0;
          s.timer = 1;
        }
        const want = Math.atan2(dx, dz);
        // Плавный доворот по кратчайшей дуге.
        let diff = want - s.yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        s.yaw += diff * Math.min(1, d * 5);
        s.step += speed * d * 2.6;
      }
    }

    g.position.set(s.x, hf.sample(s.x, s.z), s.z);
    g.rotation.y = s.yaw;

    // Походка: пары ног в противофазе. В покое ноги стоят, голова опускается.
    for (let i = 0; i < 4; i++) {
      const leg = legs.current[i];
      if (!leg) continue;
      const off = i < 2 ? 0 : Math.PI;
      const side = i % 2 ? Math.PI : 0;
      leg.rotation.x = speed > 0 ? Math.sin(s.step + off + side) * 0.55 : 0;
    }
    if (head.current) {
      const graze = s.mode === 0 ? 1 : 0;
      const target = graze ? 0.85 + Math.sin(clock.elapsedTime * 1.4) * 0.1 : 0.12;
      head.current.rotation.x += (target - head.current.rotation.x) * Math.min(1, d * 3);
    }
  });

  const fur = <meshStandardMaterial color="#8a6a4a" roughness={0.86} metalness={0} />;

  return (
    <group ref={group}>
      <group scale={0.92}>
        {/* Корпус */}
        <mesh castShadow position={[0, 1.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.42, 1.0, 6, 12]} />
          {fur}
        </mesh>
        {/* Шея и голова — отдельная группа: она опускается при выпасе */}
        <group ref={head} position={[0, 1.42, 0.62]}>
          <mesh castShadow position={[0, 0.22, 0.16]} rotation={[0.5, 0, 0]}>
            <capsuleGeometry args={[0.16, 0.5, 5, 10]} />
            {fur}
          </mesh>
          <mesh castShadow position={[0, 0.46, 0.46]} rotation={[0.9, 0, 0]}>
            <capsuleGeometry args={[0.15, 0.3, 5, 10]} />
            {fur}
          </mesh>
          {/* Рога */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.11, 0.6, 0.34]}>
              <mesh castShadow rotation={[-0.4, 0, s * 0.4]}>
                <cylinderGeometry args={[0.022, 0.032, 0.42, 4, 1]} />
                <meshStandardMaterial color="#6b5636" roughness={0.7} />
              </mesh>
              <mesh castShadow position={[s * 0.1, 0.24, 0.02]} rotation={[-0.2, 0, s * 0.9]}>
                <cylinderGeometry args={[0.016, 0.022, 0.26, 4, 1]} />
                <meshStandardMaterial color="#6b5636" roughness={0.7} />
              </mesh>
            </group>
          ))}
        </group>
        {/* Ноги */}
        {[
          [-0.24, 0.44],
          [0.24, 0.44],
          [-0.24, -0.44],
          [0.24, -0.44],
        ].map(([lx, lz], i) => (
          <mesh
            key={i}
            ref={(m) => {
              legs.current[i] = m;
            }}
            castShadow
            position={[lx, 0.62, lz]}
          >
            <capsuleGeometry args={[0.075, 0.72, 4, 8]} />
            {fur}
          </mesh>
        ))}
        {/* Хвост */}
        <mesh position={[0, 1.34, -0.62]}>
          <sphereGeometry args={[0.12, 8, 6]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

export function Wildlife({
  hf,
  tier,
  player,
}: {
  hf: HeightField;
  tier: DeviceTier;
  player: React.MutableRefObject<THREE.Vector3>;
}) {
  const deerCount = tier === 'low' ? 1 : tier === 'mid' ? 2 : 4;
  return (
    <group>
      <Birds tier={tier} />
      <Butterflies hf={hf} tier={tier} />
      {Array.from({ length: deerCount }, (_, i) => (
        <Deer key={i} hf={hf} player={player} seed={i + 1} />
      ))}
    </group>
  );
}
