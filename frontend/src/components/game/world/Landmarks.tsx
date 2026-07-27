'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ARTIFACTS, PUBLIC_REGIONS, REGIONS } from '../regions';
import { useGame } from '../state';
import { BRIDGES, HeightField, WORLD, rnd } from './terrain';
import { ruinsColumns } from './colliders';

/**
 * Рукотворные объекты острова: руины, статуи, грот, мост, смотровые площадки,
 * маяки регионов и артефакты.
 *
 * Всё строится из примитивов с материалами MeshPhysical/MeshStandard —
 * мрамор, латунь, тёмное дерево, обветренный камень. Ни одной внешней модели:
 * загрузка мира не зависит от сети, а лицензионных вопросов не возникает
 * вообще.
 */

// ── Материалы ──────────────────────────────────────────────────────────

/** Обветренный камень руин. */
function StoneMaterial({ tone = '#cbc3ad' }: { tone?: string }) {
  return <meshStandardMaterial color={tone} roughness={0.88} metalness={0.02} />;
}

/** Мрамор статуй: физический материал с лёгким подповерхностным «свечением». */
function MarbleMaterial() {
  return (
    <meshPhysicalMaterial
      color="#e8e2d4"
      roughness={0.42}
      metalness={0}
      clearcoat={0.35}
      clearcoatRoughness={0.5}
      sheen={0.5}
      sheenColor="#fff4e0"
    />
  );
}

/** Патинированная латунь — детали приборов и колец. */
function BrassMaterial() {
  return <meshStandardMaterial color="#b9924e" roughness={0.34} metalness={0.92} />;
}

function WoodMaterial({ tone = '#6b4f33' }: { tone?: string }) {
  return <meshStandardMaterial color={tone} roughness={0.78} metalness={0.03} />;
}

// ── Руины картографов ──────────────────────────────────────────────────

/**
 * Колонна: барабаны разной высоты, часть обрушена. Целая колонна выглядит
 * новой, а нужны именно руины — поэтому у каждой третьей верх сколот.
 */
function Column({
  position,
  height,
  broken,
  seed,
}: {
  position: [number, number, number];
  height: number;
  broken: boolean;
  seed: number;
}) {
  const drums = Math.max(1, Math.round(height / 1.4));
  return (
    <group position={position}>
      {/* База */}
      <mesh castShadow receiveShadow position={[0, 0.22, 0]}>
        <boxGeometry args={[1.5, 0.44, 1.5]} />
        <StoneMaterial />
      </mesh>
      {Array.from({ length: drums }).map((_, i) => {
        const skip = broken && i > drums - 2;
        if (skip) return null;
        const lean = broken && i === drums - 2 ? 0.12 : 0;
        return (
          <mesh
            key={i}
            castShadow
            receiveShadow
            position={[lean * 2, 0.44 + i * 1.4 + 0.7, 0]}
            rotation={[0, rnd(i + seed, 3) * 0.4, lean]}
          >
            <cylinderGeometry args={[0.52, 0.56, 1.4, 12, 1]} />
            <StoneMaterial tone={i % 2 ? '#c6bda6' : '#d2cab4'} />
          </mesh>
        );
      })}
      {!broken && (
        <mesh castShadow receiveShadow position={[0, 0.44 + drums * 1.4 + 0.18, 0]}>
          <boxGeometry args={[1.35, 0.36, 1.35]} />
          <StoneMaterial tone="#d6cdb6" />
        </mesh>
      )}
    </group>
  );
}

/** Статуя древнего путешественника: фигура в плаще с посохом. */
function TravelerStatue({
  position,
  rotation = 0,
  scale = 1,
}: {
  position: [number, number, number];
  rotation?: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {/* Пьедестал */}
      <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
        <cylinderGeometry args={[1.15, 1.35, 0.8, 10, 1]} />
        <StoneMaterial tone="#bdb49d" />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.95, 1.1, 0.24, 10, 1]} />
        <StoneMaterial tone="#cdc4ad" />
      </mesh>
      {/* Плащ-конус — читаемый силуэт с любой дистанции */}
      <mesh castShadow receiveShadow position={[0, 2.15, 0]}>
        <coneGeometry args={[0.86, 2.5, 14, 1]} />
        <MarbleMaterial />
      </mesh>
      {/* Торс и капюшон */}
      <mesh castShadow position={[0, 3.35, 0]}>
        <sphereGeometry args={[0.42, 16, 14]} />
        <MarbleMaterial />
      </mesh>
      <mesh castShadow position={[0, 3.62, -0.06]} rotation={[0.2, 0, 0]}>
        <coneGeometry args={[0.5, 0.7, 12, 1]} />
        <MarbleMaterial />
      </mesh>
      {/* Поднятая рука с посохом: жест «туда» — статуя работает указателем */}
      <mesh castShadow position={[0.52, 2.8, 0.18]} rotation={[0, 0, -0.7]}>
        <capsuleGeometry args={[0.12, 0.9, 6, 10]} />
        <MarbleMaterial />
      </mesh>
      <mesh castShadow position={[0.92, 3.1, 0.2]} rotation={[0, 0, 0.08]}>
        <cylinderGeometry args={[0.045, 0.045, 3.4, 6, 1]} />
        <WoodMaterial tone="#5a4029" />
      </mesh>
      {/* Латунное кольцо на посохе — единственная тёплая точка в мраморе */}
      <mesh castShadow position={[0.92, 4.72, 0.2]}>
        <torusGeometry args={[0.22, 0.045, 8, 20]} />
        <BrassMaterial />
      </mesh>
    </group>
  );
}

export function Ruins({ hf }: { hf: HeightField }) {
  const at = REGIONS.find((r) => r.id === 'ruins')!.at;
  const base = hf.sample(at[0], at[1]);

  // Раскладка колонн живёт в colliders.ts: её же читает физика камеры и
  // персонажа, чтобы коллизия не разошлась с тем, что видно в кадре.
  const columns = useMemo(() => ruinsColumns(hf, at), [hf, at]);

  const rubble = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const a = rnd(i, 23) * Math.PI * 2;
        const r = 4 + rnd(i, 29) * 12;
        const x = at[0] + Math.cos(a) * r;
        const z = at[1] + Math.sin(a) * r;
        return {
          pos: [x, hf.sample(x, z) + 0.2, z] as [number, number, number],
          rot: [rnd(i, 31) * 1.2, rnd(i, 37) * 3, rnd(i, 41) * 1.2] as [number, number, number],
          size: 0.6 + rnd(i, 43) * 1.5,
        };
      }),
    [hf, at],
  );

  return (
    <group>
      {/* Плита площади — «пол» города, слегка утопленный в грунт */}
      <mesh receiveShadow position={[at[0], base + 0.06, at[1]]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#b9b19c" roughness={0.92} metalness={0} />
      </mesh>
      {columns.map((c, i) => (
        <Column key={i} position={c.pos} height={c.h} broken={c.broken} seed={i} />
      ))}
      <TravelerStatue position={[at[0], base, at[1] + 1]} rotation={-0.7} scale={1.15} />
      {rubble.map((r, i) => (
        <mesh key={i} castShadow receiveShadow position={r.pos} rotation={r.rot}>
          <boxGeometry args={[r.size, r.size * 0.6, r.size * 0.8]} />
          <StoneMaterial tone={i % 3 ? '#c2b9a2' : '#ada492'} />
        </mesh>
      ))}
      {/* Обрушенная арка на входе */}
      <group position={[at[0] - 15, base, at[1]]}>
        <mesh castShadow receiveShadow position={[0, 2.6, -2.4]}>
          <boxGeometry args={[1.3, 5.2, 1.3]} />
          <StoneMaterial />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 2.6, 2.4]}>
          <boxGeometry args={[1.3, 5.2, 1.3]} />
          <StoneMaterial />
        </mesh>
        <mesh castShadow receiveShadow position={[0, 5.5, 0]} rotation={[0, 0, 0.04]}>
          <boxGeometry args={[1.5, 0.7, 6.4]} />
          <StoneMaterial tone="#d0c7b0" />
        </mesh>
      </group>
    </group>
  );
}

// ── Грот ───────────────────────────────────────────────────────────────

/**
 * Пещера: скальный массив с тёмным входом и светящимися кристаллами внутри.
 * Внутренность — полусфера с чёрным материалом: настоящая полость потребовала
 * бы CSG и коллизий, а нужен именно манящий тёмный проём.
 */
export function Grotto({ hf }: { hf: HeightField }) {
  const at = REGIONS.find((r) => r.id === 'grotto')!.at;
  const y = hf.sample(at[0], at[1]);
  const crystals = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        pos: [
          (rnd(i, 3) - 0.5) * 4.4,
          0.2 + rnd(i, 5) * 1.8,
          -2 - rnd(i, 7) * 2.2,
        ] as [number, number, number],
        s: 0.22 + rnd(i, 11) * 0.42,
        rot: rnd(i, 13) * 3,
      })),
    [],
  );

  return (
    <group position={[at[0], y, at[1]]}>
      {/* Массив скалы вокруг входа */}
      <mesh castShadow receiveShadow position={[0, 3.4, -5.5]}>
        <sphereGeometry args={[7.6, 18, 14]} />
        <meshStandardMaterial color="#6d675c" roughness={0.95} metalness={0.02} flatShading />
      </mesh>
      <mesh castShadow receiveShadow position={[-5.6, 2.2, -2.2]} rotation={[0.2, 0.7, 0.1]}>
        <sphereGeometry args={[4.2, 14, 11]} />
        <meshStandardMaterial color="#635d54" roughness={0.95} flatShading />
      </mesh>
      <mesh castShadow receiveShadow position={[5.8, 2, -2.6]} rotation={[0.1, -0.5, -0.15]}>
        <sphereGeometry args={[4.6, 14, 11]} />
        <meshStandardMaterial color="#6a645a" roughness={0.95} flatShading />
      </mesh>
      {/* Тёмный проём */}
      <mesh position={[0, 1.7, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <sphereGeometry args={[2.6, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshBasicMaterial color="#0a0908" side={THREE.BackSide} />
      </mesh>
      {/* Кристаллы: свет изнутри пещеры */}
      {crystals.map((c, i) => (
        <mesh key={i} position={c.pos} rotation={[0, c.rot, 0.2]} scale={[c.s, c.s * 2.4, c.s]}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#a98ff0"
            emissive="#7b5ce0"
            emissiveIntensity={1.6}
            roughness={0.25}
            metalness={0.1}
          />
        </mesh>
      ))}
      <pointLight position={[0, 1.6, -2.6]} color="#8f6ff0" intensity={9} distance={16} decay={2} />
    </group>
  );
}

// ── Мост через реку ────────────────────────────────────────────────────

export function Bridge({ bridge = BRIDGES[0] }: { bridge?: (typeof BRIDGES)[number] }) {
  const BRIDGE = bridge;
  const planks = 11;
  return (
    <group position={[BRIDGE.x, BRIDGE.deck, BRIDGE.z]} rotation={[0, BRIDGE.angle, 0]}>
      {Array.from({ length: planks }).map((_, i) => {
        const t = i / (planks - 1) - 0.5;
        // Настил слегка выгнут — прямой мост читается как доска, а не мост.
        const sag = Math.cos(t * Math.PI) * 0.32;
        return (
          <mesh key={i} castShadow receiveShadow position={[t * BRIDGE.span, sag, 0]}>
            <boxGeometry args={[BRIDGE.span / planks - 0.08, 0.12, 2.4]} />
            <WoodMaterial tone={i % 2 ? '#6d5136' : '#7a5c3d'} />
          </mesh>
        );
      })}
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* Перильные стойки */}
          {Array.from({ length: 5 }).map((_, i) => {
            const t = (i / 4 - 0.5) * 0.92;
            return (
              <mesh key={i} castShadow position={[t * BRIDGE.span, 0.5 + Math.cos(t * Math.PI) * 0.3, s * 1.1]}>
                <cylinderGeometry args={[0.055, 0.065, 1, 5, 1]} />
                <WoodMaterial tone="#5d452c" />
              </mesh>
            );
          })}
          {/* Верёвочный поручень */}
          <mesh position={[0, 1.02, s * 1.1]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, BRIDGE.span, 5, 1]} />
            <meshStandardMaterial color="#a08a63" roughness={0.95} />
          </mesh>
        </group>
      ))}
      {/* Опоры у берегов */}
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[s * BRIDGE.span * 0.46, -1.4, 0]}>
          <boxGeometry args={[0.9, 3, 2.6]} />
          <meshStandardMaterial color="#6f6a5e" roughness={0.94} />
        </mesh>
      ))}
    </group>
  );
}

// ── Смотровые площадки ─────────────────────────────────────────────────

/** Деревянный настил с перилами — на вершине и на секретном балконе. */
export function Lookout({
  position,
  rotation = 0,
  size = 5,
}: {
  position: [number, number, number];
  rotation?: number;
  size?: number;
}) {
  const posts = 8;
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh receiveShadow castShadow position={[0, 0.24, 0]}>
        <cylinderGeometry args={[size, size, 0.28, 20, 1]} />
        <WoodMaterial tone="#7b5d3c" />
      </mesh>
      {Array.from({ length: posts }).map((_, i) => {
        const a = (i / posts) * Math.PI * 2;
        // Разрыв в перилах — вход на площадку.
        if (i === 0) return null;
        return (
          <group key={i}>
            <mesh castShadow position={[Math.cos(a) * (size - 0.2), 0.9, Math.sin(a) * (size - 0.2)]}>
              <cylinderGeometry args={[0.08, 0.09, 1.2, 6, 1]} />
              <WoodMaterial tone="#5f472d" />
            </mesh>
          </group>
        );
      })}
      {/* Поручень. rotation обязателен: torusGeometry строится в плоскости XY,
          то есть СТОЯ. Без поворота поручень превращался в арку высотой во всю
          площадку — на вершине хребта и на секретном балконе в кадре стояло
          кольцо радиусом пять метров вместо перил на высоте пояса. Роза ветров
          ниже повёрнута правильно, отсюда и разница. */}
      <mesh position={[0, 1.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size - 0.2, 0.055, 6, 28]} />
        <meshStandardMaterial color="#8c6f4a" roughness={0.86} />
      </mesh>
      {/* Латунная роза ветров в центре настила */}
      <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.1, 0.05, 6, 24]} />
        <BrassMaterial />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, (i * Math.PI) / 2]}>
          <boxGeometry args={[0.07, 2.1, 0.02]} />
          <BrassMaterial />
        </mesh>
      ))}
    </group>
  );
}

// ── Маяки регионов ─────────────────────────────────────────────────────

/**
 * Маяк неоткрытого региона: световой столб + вращающееся кольцо на земле.
 * Единственный элемент, который «зовёт» игрока, — без него исследование
 * превращается в блуждание. После открытия маяк гаснет и остаётся только
 * приглушённое кольцо.
 */
function Beacon({
  position,
  tone,
  found,
}: {
  position: [number, number, number];
  tone: string;
  found: boolean;
}) {
  const ring = useRef<THREE.Mesh>(null);
  const shaft = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color(tone), [tone]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring.current) {
      ring.current.rotation.z = t * 0.35;
      const pulse = 1 + Math.sin(t * 1.6) * 0.06;
      ring.current.scale.setScalar(pulse);
    }
    if (shaft.current) {
      const m = shaft.current.material as THREE.MeshBasicMaterial;
      // Аддитивный столб рисуется двусторонним, поэтому фактическая яркость
      // удваивается. При 0.16 маяк вблизи выглядел не лучом, а вкопанным
      // белым конусом.
      m.opacity = (found ? 0.018 : 0.055) + Math.sin(t * 1.2) * 0.014;
    }
  });

  return (
    <group position={position}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <ringGeometry args={[2.1, 2.7, 40, 1]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={found ? 0.16 : 0.5}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={shaft} position={[0, 10, 0]}>
        <cylinderGeometry args={[1.1, 2.2, 20, 14, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.055}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {!found && (
        <pointLight position={[0, 2.4, 0]} color={color} intensity={5} distance={18} decay={2} />
      )}
    </group>
  );
}

export function RegionBeacons({ hf }: { hf: HeightField }) {
  const { discovered } = useGame();
  return (
    <group>
      {REGIONS.map((r) => {
        const found = discovered.includes(r.id);
        // Секретные места не подсвечиваются, пока не найдены — иначе они
        // перестают быть секретными.
        if (r.secret && !found) return null;
        return (
          <Beacon
            key={r.id}
            position={[r.at[0], hf.sample(r.at[0], r.at[1]), r.at[1]]}
            tone={r.tone}
            found={found}
          />
        );
      })}
    </group>
  );
}

// ── Артефакты ──────────────────────────────────────────────────────────

/** Парящий артефакт: латунный октаэдр в световом ореоле. */
function ArtifactPiece({ position }: { position: [number, number, number] }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.rotation.y = t * 0.8;
    g.position.y = position[1] + Math.sin(t * 1.3) * 0.22;
  });
  return (
    <group ref={group} position={position}>
      <mesh castShadow>
        <octahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial
          color="#e6c179"
          emissive="#c98f2c"
          emissiveIntensity={0.7}
          roughness={0.24}
          metalness={0.9}
        />
      </mesh>
      <mesh scale={1.9}>
        <sphereGeometry args={[0.42, 14, 12]} />
        <meshBasicMaterial
          color="#ffd89a"
          transparent
          opacity={0.13}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight color="#ffcf8a" intensity={4} distance={9} decay={2} />
    </group>
  );
}

export function Artifacts({ hf }: { hf: HeightField }) {
  const { artifacts } = useGame();
  return (
    <group>
      {ARTIFACTS.filter((a) => !artifacts.includes(a.id)).map((a) => (
        <ArtifactPiece
          key={a.id}
          position={[a.at[0], hf.sample(a.at[0], a.at[1]) + a.lift, a.at[1]]}
        />
      ))}
    </group>
  );
}

// ── Сборка всех объектов ───────────────────────────────────────────────

export function Landmarks({ hf }: { hf: HeightField }) {
  const summit = REGIONS.find((r) => r.id === 'summit')!.at;
  const balcony = REGIONS.find((r) => r.id === 'balcony')!.at;
  const cove = REGIONS.find((r) => r.id === 'cove')!.at;
  const forest = REGIONS.find((r) => r.id === 'forest')!.at;

  return (
    <group>
      <Ruins hf={hf} />
      <Grotto hf={hf} />
      {BRIDGES.map((b) => (
        <Bridge key={b.id} bridge={b} />
      ))}
      <Lookout
        position={[summit[0], hf.sample(summit[0], summit[1]) + 0.1, summit[1]]}
        size={5.4}
      />
      <Lookout
        position={[balcony[0], hf.sample(balcony[0], balcony[1]) + 0.1, balcony[1]]}
        rotation={0.6}
        size={3.6}
      />
      {/* Статуя-указатель у входа в лес и «страж» бухты */}
      <TravelerStatue
        position={[forest[0] + 4, hf.sample(forest[0] + 4, forest[1] - 3), forest[1] - 3]}
        rotation={2.1}
        scale={0.9}
      />
      <TravelerStatue
        position={[cove[0] - 9, hf.sample(cove[0] - 9, cove[1] - 6), cove[1] - 6]}
        rotation={-1.2}
        scale={0.8}
      />
      <RegionBeacons hf={hf} />
      <Artifacts hf={hf} />
    </group>
  );
}

/** Кладёт точку на поверхность — используется и снаружи (спавн, метки). */
export function groundAt(hf: HeightField, x: number, z: number, lift = 0) {
  return new THREE.Vector3(x, hf.sample(x, z) + lift, z);
}

export { WORLD };
