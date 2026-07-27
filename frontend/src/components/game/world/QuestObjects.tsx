'use client';

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FRAGMENTS } from '../story';
import { PHOTOS, PICKUPS, WORKS } from '../quests';
import { useGame } from '../state';
import { HeightField, rnd } from './terrain';

/**
 * Предметы заданий в мире: фрагменты Карты, доски, знаки Ордена, ключи,
 * места работ и точки съёмки.
 *
 * Каждый вид отличается СИЛУЭТОМ, а не только цветом: игрок видит объект с
 * тридцати метров, в дымке и против солнца, и подкраска одной и той же
 * болванки в разные цвета там не читается вовсе. Фрагмент карты — плоский
 * лист, доска — брус, знак — стела с насечкой, ключ — стержень с бородкой.
 *
 * Всё собранное просто исчезает из списка: состояние живёт в сторе, отдельного
 * «удаления из сцены» не нужно — React снимает узел сам.
 */

/** Мягкое парение и вращение — общий приём для всех подбираемых предметов. */
function useHover(y: number, speed = 1.3, amp = 0.2, spin = 0.8) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const t = clock.elapsedTime;
    g.rotation.y = t * spin;
    g.position.y = y + Math.sin(t * speed) * amp;
  });
  return group;
}

/** Ореол вокруг предмета: без него находка теряется в траве. */
function Halo({ color, scale = 1.9, opacity = 0.13 }: { color: string; scale?: number; opacity?: number }) {
  return (
    <mesh scale={scale}>
      <sphereGeometry args={[0.42, 14, 12]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/**
 * Фрагмент Карты Мира — плоский лист пергамента с тиснением.
 * Главная коллекция игры, поэтому светится заметно теплее и ярче остальных.
 */
function FragmentPiece({ position }: { position: [number, number, number] }) {
  const group = useHover(position[1], 1.1, 0.24, 0.55);
  return (
    <group ref={group} position={position}>
      <mesh castShadow rotation={[Math.PI * 0.5, 0, 0]}>
        <planeGeometry args={[0.78, 0.62]} />
        <meshStandardMaterial
          color="#f0dfb4"
          emissive="#c9a04a"
          emissiveIntensity={0.5}
          roughness={0.7}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Линии на пергаменте: тонкая рамка даёт понять, что это чертёж. */}
      <mesh rotation={[Math.PI * 0.5, 0, 0]} position={[0, 0.012, 0]}>
        <ringGeometry args={[0.26, 0.3, 4]} />
        <meshBasicMaterial color="#8a6b32" transparent opacity={0.75} side={THREE.DoubleSide} />
      </mesh>
      <Halo color="#ffd89a" scale={2.4} opacity={0.17} />
      <pointLight color="#ffcf8a" intensity={6} distance={12} decay={2} />
    </group>
  );
}

/** Доска настила: брус с тёсаными краями. */
function Plank({ position }: { position: [number, number, number] }) {
  const group = useHover(position[1], 1.6, 0.1, 0.35);
  return (
    <group ref={group} position={position}>
      <mesh castShadow rotation={[0, 0.4, 0.06]}>
        <boxGeometry args={[1.5, 0.11, 0.34]} />
        <meshStandardMaterial color="#7d5a37" roughness={0.92} metalness={0} />
      </mesh>
      <Halo color="#e2b877" scale={1.5} opacity={0.1} />
    </group>
  );
}

/** Знак Ордена: узкая стела с насечкой. */
function Symbol({ position, seed }: { position: [number, number, number]; seed: number }) {
  const group = useHover(position[1], 1.2, 0.12, 0.6);
  const notches = useMemo(() => 2 + Math.floor(rnd(seed, 7) * 3), [seed]);
  return (
    <group ref={group} position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.26, 1.05, 0.16]} />
        <meshStandardMaterial color="#b8b0a0" roughness={0.66} metalness={0.15} />
      </mesh>
      {Array.from({ length: notches }).map((_, i) => (
        <mesh key={i} position={[0, 0.3 - i * 0.22, 0.09]}>
          <boxGeometry args={[0.18, 0.045, 0.03]} />
          <meshStandardMaterial
            color="#e6c179"
            emissive="#c98f2c"
            emissiveIntensity={0.8}
            roughness={0.3}
            metalness={0.8}
          />
        </mesh>
      ))}
      <Halo color="#d8cba8" scale={1.6} opacity={0.11} />
    </group>
  );
}

/** Ключ: стержень с бородкой и кольцом. */
function Key({ position }: { position: [number, number, number] }) {
  const group = useHover(position[1], 1.4, 0.16, 1.1);
  return (
    <group ref={group} position={position}>
      <mesh castShadow rotation={[0, 0, Math.PI * 0.5]}>
        <cylinderGeometry args={[0.045, 0.045, 0.72, 8]} />
        <meshStandardMaterial color="#c8a24a" roughness={0.34} metalness={0.92} />
      </mesh>
      <mesh position={[-0.36, 0, 0]}>
        <torusGeometry args={[0.13, 0.035, 8, 16]} />
        <meshStandardMaterial color="#c8a24a" roughness={0.34} metalness={0.92} />
      </mesh>
      {[0.22, 0.3].map((x, i) => (
        <mesh key={i} position={[x, -0.11, 0]}>
          <boxGeometry args={[0.05, 0.16, 0.05]} />
          <meshStandardMaterial color="#c8a24a" roughness={0.34} metalness={0.92} />
        </mesh>
      ))}
      <Halo color="#ffd89a" scale={1.7} opacity={0.14} />
      <pointLight color="#ffcf8a" intensity={3} distance={8} decay={2} />
    </group>
  );
}

/** Прочая находка — латунный октаэдр, как у артефактов. */
function Relic({ position }: { position: [number, number, number] }) {
  const group = useHover(position[1]);
  return (
    <group ref={group} position={position}>
      <mesh castShadow>
        <octahedronGeometry args={[0.4, 0]} />
        <meshStandardMaterial
          color="#e6c179"
          emissive="#c98f2c"
          emissiveIntensity={0.7}
          roughness={0.24}
          metalness={0.9}
        />
      </mesh>
      <Halo color="#ffd89a" />
      <pointLight color="#ffcf8a" intensity={4} distance={9} decay={2} />
    </group>
  );
}

/**
 * Место работ до выполнения: три вехи с натянутой между ними бечёвкой.
 * После выполнения узел исчезает — на его месте уже стоит починенный мост
 * или открытые ворота (их рисует `Landmarks`).
 */
function WorkSite({ position, result }: { position: [number, number, number]; result: 'bridge' | 'gate' }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = ring.current;
    if (!m) return;
    // Пульсация: метка должна быть заметна, но не мигать как аварийный маяк.
    const s = 1 + Math.sin(clock.elapsedTime * 1.4) * 0.08;
    m.scale.set(s, s, 1);
  });
  const r = result === 'gate' ? 3.4 : 2.6;
  return (
    <group position={position}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <ringGeometry args={[r, r + 0.22, 40]} />
        <meshBasicMaterial color="#e6c179" transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {[0, 2.094, 4.188].map((a, i) => (
        <mesh key={i} castShadow position={[Math.cos(a) * r, 0.6, Math.sin(a) * r]}>
          <cylinderGeometry args={[0.05, 0.06, 1.2, 6]} />
          <meshStandardMaterial color="#6b4f33" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Точка съёмки: рамка на двух стойках — «встань здесь и посмотри туда». */
function PhotoSpot({ position }: { position: [number, number, number] }) {
  const frame = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const m = frame.current;
    if (!m) return;
    m.rotation.z = Math.sin(clock.elapsedTime * 0.6) * 0.03;
  });
  return (
    <group position={position}>
      {[-0.7, 0.7].map((x, i) => (
        <mesh key={i} castShadow position={[x, 0.75, 0]}>
          <cylinderGeometry args={[0.05, 0.06, 1.5, 6]} />
          <meshStandardMaterial color="#6b4f33" roughness={0.9} />
        </mesh>
      ))}
      <mesh ref={frame} position={[0, 1.6, 0]}>
        <torusGeometry args={[0.62, 0.045, 8, 4]} />
        <meshStandardMaterial
          color="#e6c179"
          emissive="#c98f2c"
          emissiveIntensity={0.5}
          roughness={0.35}
          metalness={0.85}
        />
      </mesh>
    </group>
  );
}

export function QuestObjects({ hf }: { hf: HeightField }) {
  const { fragments, objectives, works } = useGame();

  return (
    <group>
      {FRAGMENTS.filter((f) => !fragments.includes(f.id)).map((f) => (
        <FragmentPiece
          key={f.id}
          position={[f.at[0], hf.sample(f.at[0], f.at[1]) + f.lift, f.at[1]]}
        />
      ))}

      {PICKUPS.filter((p) => !objectives.includes(p.id)).map((p, i) => {
        const pos: [number, number, number] = [p.at[0], hf.sample(p.at[0], p.at[1]) + p.lift, p.at[1]];
        if (p.look === 'plank') return <Plank key={p.id} position={pos} />;
        if (p.look === 'symbol') return <Symbol key={p.id} position={pos} seed={i + 1} />;
        if (p.look === 'key') return <Key key={p.id} position={pos} />;
        return <Relic key={p.id} position={pos} />;
      })}

      {WORKS.filter((w) => !works.includes(w.id)).map((w) => (
        <WorkSite
          key={w.id}
          position={[w.at[0], hf.sample(w.at[0], w.at[1]), w.at[1]]}
          result={w.result}
        />
      ))}

      {PHOTOS.filter((p) => !objectives.includes(p.id)).map((p) => (
        <PhotoSpot key={p.id} position={[p.at[0], hf.sample(p.at[0], p.at[1]), p.at[1]]} />
      ))}
    </group>
  );
}
