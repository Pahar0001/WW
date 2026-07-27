'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { AnimName, Character } from './controller';
import { RUN_SPEED } from './controller';
import { makeGlowTexture } from '@/components/fx/Volumetric';

/**
 * Путешественник Vela — персонаж с процедурной анимацией.
 *
 * Почему не готовая модель с Mixamo:
 *  скачивание с Mixamo требует входа в аккаунт Adobe, которого у ассистента
 *  нет, а «похожие бесплатные» GLB со сторонних зеркал приходят без внятной
 *  лицензии. Процедурный риг решает это радикально: ноль сетевых запросов,
 *  ноль байт ассетов, чистая лицензия и полный контроль над каждым кадром —
 *  можно смешивать походку со скоростью и наклоном в вираже, чего запечённый
 *  клип не умеет.
 *
 * Скелет — вложенные <group>, кости — капсулы. Анимация: целевые углы на
 * состояние (стоит / шаг / бег / прыжок / падение / приземление / радость),
 * а переход между состояниями делает экспоненциальное сглаживание — то есть
 * блендинг получается бесплатно и всегда плавный.
 *
 * Фаза цикла берётся из ПРОЙДЕННОГО ПУТИ (см. controller), поэтому стопы не
 * скользят по земле при разгоне и торможении.
 */

// ── Материалы ──────────────────────────────────────────────────────────
const COAT = '#d9cbb0';
const COAT_DARK = '#b8a888';
const TROUSERS = '#3f3a31';
const LEATHER = '#6d4c30';
const SCARF = '#c79a4e';
const SKIN = '#d8b48f';

/** Плащ и шарф — ткань: физический материал с sheen даёт мягкий «пушок». */
function Cloth({ color, sheen = 0.6 }: { color: string; sheen?: number }) {
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.78}
      metalness={0}
      sheen={sheen}
      sheenColor="#fff3dd"
      sheenRoughness={0.6}
    />
  );
}

function Leather({ color = LEATHER }: { color?: string }) {
  return <meshStandardMaterial color={color} roughness={0.62} metalness={0.05} />;
}

// ── Позы ───────────────────────────────────────────────────────────────

type Pose = {
  /** Вертикальное смещение корпуса относительно земли. */
  lift: number;
  /** Наклон вперёд (рад). */
  lean: number;
  /** Крен в вираже (рад). */
  roll: number;
  hipsRot: number;
  torsoTwist: number;
  headPitch: number;
  headYaw: number;
  armL: number;
  armR: number;
  armSpreadL: number;
  armSpreadR: number;
  foreL: number;
  foreR: number;
  thighL: number;
  thighR: number;
  shinL: number;
  shinR: number;
  footL: number;
  footR: number;
  cloak: number;
};

const ZERO: Pose = {
  lift: 0, lean: 0, roll: 0, hipsRot: 0, torsoTwist: 0, headPitch: 0, headYaw: 0,
  armL: 0, armR: 0, armSpreadL: 0.14, armSpreadR: 0.14, foreL: 0.2, foreR: 0.2,
  thighL: 0, thighR: 0, shinL: 0, shinR: 0, footL: 0, footR: 0, cloak: 0,
};

/**
 * Целевая поза для состояния. Все амплитуды подобраны так, чтобы силуэт
 * читался с игровой дистанции (5–9 м): мелкие «реалистичные» углы на таком
 * удалении просто не видны, а крупные превращают героя в марионетку.
 */
function computePose(anim: AnimName, phase: number, t: number, speed: number, turn: number): Pose {
  const p = { ...ZERO };
  const norm = Math.min(1, speed / RUN_SPEED);
  p.roll = THREE.MathUtils.clamp(-turn * 0.06, -0.22, 0.22);

  switch (anim) {
    case 'walk':
    case 'run': {
      const run = anim === 'run';
      const amp = run ? 0.82 : 0.52;
      const s = Math.sin(phase);
      const c = Math.cos(phase);

      p.lean = run ? 0.2 + norm * 0.1 : 0.07;
      // Корпус подпрыгивает дважды за цикл — на каждый шаг.
      p.lift = Math.abs(Math.sin(phase)) * (run ? 0.085 : 0.045) - (run ? 0.03 : 0);
      p.hipsRot = -s * (run ? 0.2 : 0.12);
      p.torsoTwist = s * (run ? 0.24 : 0.15);
      p.headYaw = -s * 0.06;
      p.headPitch = run ? 0.06 : 0.02;

      p.thighL = s * amp;
      p.thighR = -s * amp;
      // Колено сгибается только назад: max(0, …) вместо симметричного синуса,
      // иначе нога выгибается в обратную сторону — самая заметная ошибка
      // в самодельных походках.
      p.shinL = -Math.max(0, -Math.sin(phase + 0.7)) * (run ? 1.5 : 0.95);
      p.shinR = -Math.max(0, -Math.sin(phase + Math.PI + 0.7)) * (run ? 1.5 : 0.95);
      p.footL = Math.max(0, Math.sin(phase + 1.2)) * 0.4;
      p.footR = Math.max(0, Math.sin(phase + Math.PI + 1.2)) * 0.4;

      // Руки в противофазе с ногами.
      p.armL = -s * amp * 0.72 - (run ? 0.3 : 0);
      p.armR = s * amp * 0.72 - (run ? 0.3 : 0);
      p.foreL = (run ? 0.95 : 0.42) + Math.max(0, c) * 0.25;
      p.foreR = (run ? 0.95 : 0.42) + Math.max(0, -c) * 0.25;
      p.armSpreadL = 0.1 + (run ? 0.06 : 0);
      p.armSpreadR = 0.1 + (run ? 0.06 : 0);
      p.cloak = -0.1 - norm * 0.42;
      break;
    }

    case 'jump': {
      p.lean = 0.14;
      p.thighL = 0.7;
      p.thighR = 0.34;
      p.shinL = -1.15;
      p.shinR = -0.5;
      p.armL = -1.9;
      p.armR = -1.9;
      p.armSpreadL = 0.34;
      p.armSpreadR = 0.34;
      p.foreL = 0.25;
      p.foreR = 0.25;
      p.headPitch = -0.14;
      p.cloak = -0.62;
      break;
    }

    case 'fall': {
      p.lean = -0.06;
      p.thighL = 0.26;
      p.thighR = -0.2;
      p.shinL = -0.5;
      p.shinR = -0.25;
      // Руки в стороны — узнаваемая поза свободного падения.
      p.armL = -0.5;
      p.armR = -0.5;
      p.armSpreadL = 1.15;
      p.armSpreadR = 1.15;
      p.foreL = 0.6;
      p.foreR = 0.6;
      p.headPitch = -0.2;
      p.cloak = -0.75;
      break;
    }

    case 'land': {
      p.lift = -0.24;
      p.lean = 0.34;
      p.thighL = 0.6;
      p.thighR = 0.6;
      p.shinL = -1.05;
      p.shinR = -1.05;
      p.footL = 0.42;
      p.footR = 0.42;
      p.armL = 0.5;
      p.armR = 0.5;
      p.armSpreadL = 0.5;
      p.armSpreadR = 0.5;
      p.foreL = 1.1;
      p.foreR = 1.1;
      p.headPitch = 0.24;
      p.cloak = 0.2;
      break;
    }

    case 'celebrate': {
      const hop = Math.abs(Math.sin(t * 6.2));
      p.lift = hop * 0.2;
      p.lean = -0.1;
      p.armL = -2.5;
      p.armR = -2.5;
      p.armSpreadL = 0.55 + hop * 0.25;
      p.armSpreadR = 0.55 + hop * 0.25;
      p.foreL = 0.1;
      p.foreR = 0.1;
      p.headPitch = -0.3;
      p.thighL = hop * 0.35;
      p.thighR = -hop * 0.35;
      p.shinL = -hop * 0.5;
      p.shinR = -hop * 0.3;
      p.cloak = -0.3 - hop * 0.2;
      break;
    }

    default: {
      // Покой: дыхание, перенос веса и редкие взгляды по сторонам.
      const breath = Math.sin(t * 1.35);
      p.lift = breath * 0.012;
      p.lean = 0.03 + breath * 0.014;
      p.hipsRot = Math.sin(t * 0.42) * 0.05;
      p.torsoTwist = Math.sin(t * 0.42 + 0.6) * 0.06;
      // Взгляд «включается» волнами: длинные паузы, короткие повороты.
      const glance = Math.max(0, Math.sin(t * 0.24) - 0.55) / 0.45;
      p.headYaw = Math.sin(t * 0.9) * 0.55 * glance;
      p.headPitch = -0.04 + Math.sin(t * 0.7) * 0.06 * glance;
      p.armL = 0.04 + breath * 0.02;
      p.armR = 0.04 - breath * 0.02;
      p.foreL = 0.3;
      p.foreR = 0.3;
      p.thighL = 0.02;
      p.thighR = -0.02;
      p.shinL = -0.05;
      p.shinR = -0.03;
      p.cloak = 0.02 + breath * 0.03;
      break;
    }
  }
  return p;
}

// ── Компонент ──────────────────────────────────────────────────────────

type J = THREE.Group | null;

export function Traveler({
  character,
  castShadow = true,
}: {
  character: React.MutableRefObject<Character>;
  castShadow?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const hips = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const foreL = useRef<THREE.Group>(null);
  const foreR = useRef<THREE.Group>(null);
  const thighL = useRef<THREE.Group>(null);
  const thighR = useRef<THREE.Group>(null);
  const shinL = useRef<THREE.Group>(null);
  const shinR = useRef<THREE.Group>(null);
  const footL = useRef<THREE.Group>(null);
  const footR = useRef<THREE.Group>(null);
  const cloak = useRef<THREE.Group>(null);
  const scarf = useRef<J[]>([null, null, null]);
  const splash = useRef<THREE.Points>(null);

  // Текущая (сглаженная) поза — блендинг между состояниями.
  const cur = useRef<Pose>({ ...ZERO });
  const splashTex = useMemo(
    () => makeGlowTexture('rgba(240,250,255,1)', 'rgba(214,238,248,0.55)'),
    [],
  );

  useFrame(({ clock }, dt) => {
    const c = character.current;
    const d = Math.min(dt, 0.05);
    const t = clock.elapsedTime;

    const want = computePose(c.anim, c.phase, t, c.speed, c.turn);
    const k = 1 - Math.exp(-16 * d); // сглаживание, не зависящее от FPS
    const p = cur.current;
    for (const key of Object.keys(want) as (keyof Pose)[]) {
      p[key] += (want[key] - p[key]) * k;
    }

    if (root.current) {
      root.current.position.set(c.pos.x, c.pos.y, c.pos.z);
      root.current.rotation.y = c.yaw;
    }
    if (body.current) {
      // Вброд герой погружается: корпус опускается на глубину воды.
      body.current.position.y = p.lift - c.wade * 0.55;
      body.current.rotation.set(p.lean, 0, p.roll);
    }
    if (hips.current) hips.current.rotation.y = p.hipsRot;
    if (torso.current) torso.current.rotation.y = p.torsoTwist;
    if (head.current) head.current.rotation.set(p.headPitch, p.headYaw, 0);

    if (armL.current) armL.current.rotation.set(p.armL, 0, p.armSpreadL);
    if (armR.current) armR.current.rotation.set(p.armR, 0, -p.armSpreadR);
    if (foreL.current) foreL.current.rotation.x = p.foreL;
    if (foreR.current) foreR.current.rotation.x = p.foreR;

    if (thighL.current) thighL.current.rotation.x = p.thighL;
    if (thighR.current) thighR.current.rotation.x = p.thighR;
    if (shinL.current) shinL.current.rotation.x = p.shinL;
    if (shinR.current) shinR.current.rotation.x = p.shinR;
    if (footL.current) footL.current.rotation.x = p.footL;
    if (footR.current) footR.current.rotation.x = p.footR;

    if (cloak.current) {
      // Плащ отстаёт от корпуса и парусит на скорости.
      cloak.current.rotation.x = p.cloak;
      cloak.current.rotation.z = -p.roll * 1.6 + Math.sin(t * 2.1) * 0.02;
    }
    // Шарф: каждая секция догоняет предыдущую с задержкой — простейшая
    // «верёвочная» динамика, читается как развевающаяся ткань.
    for (let i = 0; i < scarf.current.length; i++) {
      const s = scarf.current[i];
      if (!s) continue;
      const lag = 0.35 + i * 0.3;
      const wind = Math.sin(t * 2.4 - i * 0.8) * 0.16;
      s.rotation.x += (-0.25 - Math.min(1, c.speed / RUN_SPEED) * lag - s.rotation.x) * k;
      s.rotation.z += (wind - s.rotation.z) * k;
    }

    // Брызги при ходьбе по воде.
    if (splash.current) {
      splash.current.visible = c.wade > 0.12 && c.speed > 1.2;
      if (splash.current.visible) {
        splash.current.rotation.y = t * 3;
        splash.current.scale.setScalar(0.8 + Math.abs(Math.sin(c.phase * 2)) * 0.5);
      }
    }
  });

  const capsule = (r: number, len: number) => <capsuleGeometry args={[r, len, 5, 10]} />;

  return (
    <group ref={root}>
      <group ref={body}>
        {/* ── Ноги ── */}
        <group ref={hips} position={[0, 0.92, 0]}>
          {(
            [
              ['L', -0.115, thighL, shinL, footL],
              ['R', 0.115, thighR, shinR, footR],
            ] as const
          ).map(([side, x, thigh, shin, foot]) => (
            <group key={side} ref={thigh} position={[x, 0, 0]}>
              <mesh castShadow={castShadow} position={[0, -0.22, 0]}>
                {capsule(0.085, 0.3)}
                <meshStandardMaterial color={TROUSERS} roughness={0.82} />
              </mesh>
              <group ref={shin} position={[0, -0.44, 0]}>
                <mesh castShadow={castShadow} position={[0, -0.2, 0]}>
                  {capsule(0.07, 0.28)}
                  <meshStandardMaterial color={TROUSERS} roughness={0.82} />
                </mesh>
                <group ref={foot} position={[0, -0.42, 0]}>
                  {/* Сапог */}
                  <mesh castShadow={castShadow} position={[0, 0.02, 0.045]}>
                    <boxGeometry args={[0.11, 0.09, 0.24]} />
                    <Leather />
                  </mesh>
                  <mesh castShadow={castShadow} position={[0, 0.12, -0.01]}>
                    <cylinderGeometry args={[0.075, 0.08, 0.16, 8, 1]} />
                    <Leather color="#5c3f28" />
                  </mesh>
                </group>
              </group>
            </group>
          ))}
        </group>

        {/* ── Корпус ── */}
        <group ref={torso} position={[0, 0.92, 0]}>
          {/* Куртка */}
          <mesh castShadow={castShadow} position={[0, 0.22, 0]}>
            {capsule(0.155, 0.28)}
            <Cloth color={COAT} />
          </mesh>
          {/* Ремень */}
          <mesh position={[0, 0.045, 0]}>
            <cylinderGeometry args={[0.163, 0.163, 0.06, 12, 1]} />
            <Leather color="#4e3620" />
          </mesh>
          <mesh position={[0, 0.045, 0.16]}>
            <boxGeometry args={[0.06, 0.05, 0.02]} />
            <meshStandardMaterial color="#b9924e" roughness={0.3} metalness={0.9} />
          </mesh>

          {/* Рюкзак */}
          <group position={[0, 0.26, -0.19]}>
            <mesh castShadow={castShadow}>
              <boxGeometry args={[0.24, 0.32, 0.16]} />
              <Leather color="#79512f" />
            </mesh>
            <mesh position={[0, 0.19, 0]}>
              <boxGeometry args={[0.25, 0.07, 0.17]} />
              <Leather color="#5f3f24" />
            </mesh>
            {/* Свёрнутый спальник сверху */}
            <mesh position={[0, 0.26, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.055, 0.055, 0.3, 8, 1]} />
              <Cloth color="#a8724a" sheen={0.3} />
            </mesh>
          </group>

          {/* Плечи и руки */}
          {(
            [
              ['L', -0.2, armL, foreL],
              ['R', 0.2, armR, foreR],
            ] as const
          ).map(([side, x, arm, fore]) => (
            <group key={side} ref={arm} position={[x, 0.38, 0]}>
              <mesh castShadow={castShadow} position={[0, -0.14, 0]}>
                {capsule(0.055, 0.2)}
                <Cloth color={COAT_DARK} />
              </mesh>
              <group ref={fore} position={[0, -0.3, 0]}>
                <mesh castShadow={castShadow} position={[0, -0.13, 0]}>
                  {capsule(0.048, 0.18)}
                  <Cloth color={COAT_DARK} />
                </mesh>
                {/* Кисть */}
                <mesh position={[0, -0.27, 0]}>
                  <sphereGeometry args={[0.052, 8, 6]} />
                  <meshStandardMaterial color={SKIN} roughness={0.75} />
                </mesh>
              </group>
            </group>
          ))}

          {/* Шея, голова, шляпа */}
          <group ref={head} position={[0, 0.46, 0]}>
            <mesh position={[0, 0.02, 0]}>
              <cylinderGeometry args={[0.042, 0.05, 0.08, 8, 1]} />
              <meshStandardMaterial color={SKIN} roughness={0.75} />
            </mesh>
            <mesh castShadow={castShadow} position={[0, 0.14, 0]}>
              <sphereGeometry args={[0.108, 16, 14]} />
              <meshStandardMaterial color={SKIN} roughness={0.72} />
            </mesh>
            {/* Волосы */}
            <mesh position={[0, 0.17, -0.015]}>
              <sphereGeometry args={[0.112, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
              <meshStandardMaterial color="#3c2c1e" roughness={0.9} />
            </mesh>
            {/* Шляпа с широкими полями — силуэт узнаётся мгновенно */}
            <mesh castShadow={castShadow} position={[0, 0.225, 0]}>
              <cylinderGeometry args={[0.145, 0.145, 0.012, 18, 1]} />
              <Cloth color="#c2b394" sheen={0.25} />
            </mesh>
            <mesh castShadow={castShadow} position={[0, 0.265, 0]}>
              <cylinderGeometry args={[0.086, 0.098, 0.085, 14, 1]} />
              <Cloth color="#c2b394" sheen={0.25} />
            </mesh>
            <mesh position={[0, 0.235, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 0.02, 14, 1]} />
              <meshStandardMaterial color={SCARF} roughness={0.7} />
            </mesh>
          </group>

          {/* Шарф: воротник + три развевающиеся секции */}
          <mesh position={[0, 0.42, 0]}>
            <torusGeometry args={[0.075, 0.032, 8, 14]} />
            <Cloth color={SCARF} />
          </mesh>
          <group ref={(g) => { scarf.current[0] = g; }} position={[0.02, 0.4, -0.05]}>
            <mesh castShadow={castShadow} position={[0, -0.11, -0.02]}>
              <boxGeometry args={[0.1, 0.22, 0.022]} />
              <Cloth color={SCARF} />
            </mesh>
            <group ref={(g) => { scarf.current[1] = g; }} position={[0, -0.22, -0.02]}>
              <mesh castShadow={castShadow} position={[0, -0.1, -0.02]}>
                <boxGeometry args={[0.092, 0.2, 0.02]} />
                <Cloth color="#b98c42" />
              </mesh>
              <group ref={(g) => { scarf.current[2] = g; }} position={[0, -0.2, -0.02]}>
                <mesh castShadow={castShadow} position={[0, -0.09, -0.02]}>
                  <boxGeometry args={[0.082, 0.18, 0.018]} />
                  <Cloth color={SCARF} />
                </mesh>
              </group>
            </group>
          </group>

          {/* Плащ: конус за спиной, парусит на бегу */}
          {/* Узкий и короткий: широкий конус читался как платье, а не как
              дорожный плащ, и полностью скрывал работу ног. */}
          <group ref={cloak} position={[0, 0.44, -0.07]}>
            <mesh castShadow={castShadow} position={[0, -0.3, -0.03]}>
              <coneGeometry args={[0.25, 0.66, 14, 1, true]} />
              <Cloth color="#8f7c5c" sheen={0.8} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Брызги на мелкой воде */}
      <points ref={splash} position={[0, 0.06, 0]} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array(
                Array.from({ length: 26 }, (_, i) => {
                  const a = (i / 26) * Math.PI * 2;
                  const r = 0.22 + ((i * 0.618) % 1) * 0.3;
                  return [Math.cos(a) * r, ((i * 0.37) % 1) * 0.34, Math.sin(a) * r];
                }).flat(),
              ),
              3,
            ]}
          />
        </bufferGeometry>
        {/* map обязателен — иначе капли рисуются квадратами. */}
        <pointsMaterial
          map={splashTex}
          size={0.1}
          sizeAttenuation
          color="#eaf6fa"
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
