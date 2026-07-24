'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { GlobeMarker } from '@/lib/country-coords';

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

type MarkerPoint = GlobeMarker & { pos: THREE.Vector3 };

interface AimState {
  pointer: { x: number; y: number } | null; // NDC курсора (null — вне канваса)
  hovered: MarkerPoint | null; // «примагниченная» страна
  dragging: boolean;
  dragDx: number; // накопленный поворот от перетаскивания
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

  const positions = useMemo(() => {
    const N = particleCount;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const p = spherePoint(i, N, R);
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    }
    return arr;
  }, [particleCount]);

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
  const camDir = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, dt) => {
    if (!group.current) return;
    const aiming = aim.current.pointer !== null;

    // Перетаскивание вращает глобус руками; авто-вращение замирает, пока
    // пользователь целится (курсор над канвасом) — цели не убегают.
    if (aim.current.dragDx !== 0) {
      group.current.rotation.y += aim.current.dragDx;
      aim.current.dragDx = 0;
    } else if (!reduced && !aiming) {
      group.current.rotation.y += dt * 0.05;
    }
    // Никакого параллакса позиции группы: цели не смещаются под курсором.
    group.current.rotation.x += (0 - group.current.rotation.x) * 0.04;

    // ── Магнитный подбор ближайшей страны ──
    const p = aim.current.pointer;
    let best: MarkerPoint | null = null;
    if (p && !aim.current.dragging) {
      const { width, height } = state.size;
      state.camera.getWorldDirection(camDir);
      let bestD = SNAP_PX;
      for (const m of markerPoints) {
        world.copy(m.pos).applyMatrix4(group.current.matrixWorld);
        // Только лицевая сторона сферы (нормаль к камере).
        const facing = world.clone().normalize().dot(camDir) < -0.12;
        if (!facing) continue;
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
      {/* Wireframe shell for structure */}
      <mesh>
        <icosahedronGeometry args={[R, 3]} />
        <meshBasicMaterial color={GOLD} wireframe transparent opacity={0.05} />
      </mesh>
      {/* Particle surface */}
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={0.022}
          color={GOLD}
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
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
      {/* Подпись «примагниченной» страны — крупная, кликабельная */}
      {hovered && (
        <Html position={[0, 0.16, 0]} center distanceFactor={6.5} zIndexRange={[30, 0]}>
          <div className="pointer-events-none flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-[#d8b878]/50 bg-[#0d0b08]/90 px-5 py-2.5 text-sm text-white shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d8b878]" />
              <span className="font-medium">{marker.name}</span>
              <span className="text-[#d8b878]">открыть маршрут →</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

function Dust() {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const N = 380;
    const arr = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 16;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
    }
    return arr;
  }, []);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.01;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.02} color="#e8dcc0" transparent opacity={0.35} depthWrite={false} />
    </points>
  );
}

/** Плавный дрейф камеры — только пока пользователь НЕ целится в страну. */
function Rig({ aim }: { aim: React.MutableRefObject<AimState> }) {
  const { camera } = useThree();
  useFrame((state) => {
    const idle = aim.current.pointer === null;
    const tx = idle ? state.pointer.x * 0.5 : 0;
    const ty = idle ? -state.pointer.y * 0.35 : 0;
    camera.position.x += (tx - camera.position.x) * 0.02;
    camera.position.y += (ty - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function Hero3D({ markers = [] }: { markers?: GlobeMarker[] }) {
  const router = useRouter();
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Перф: на мобильных — вдвое меньше частиц (WebGL на low-end).
  const particleCount =
    typeof window !== 'undefined' && window.innerWidth < 768 ? 1300 : 2600;

  const aim = useRef<AimState>({ pointer: null, hovered: null, dragging: false, dragDx: 0 });
  const drag = useRef({ active: false, moved: 0, lastX: 0 });
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
      className="h-full w-full touch-pan-y select-none"
      onPointerMove={(e) => {
        aim.current.pointer = toNdc(e);
        if (process.env.NODE_ENV !== 'production') (window as any).__aim = aim.current;
        if (drag.current.active) {
          const dx = e.clientX - drag.current.lastX;
          drag.current.lastX = e.clientX;
          drag.current.moved += Math.abs(dx);
          aim.current.dragDx += dx * 0.004; // вращение глобуса рукой
          aim.current.dragging = drag.current.moved > 6;
        }
      }}
      onPointerDown={(e) => {
        drag.current = { active: true, moved: 0, lastX: e.clientX };
        aim.current.pointer = toNdc(e);
      }}
      onPointerUp={() => {
        const wasDrag = drag.current.moved > 6;
        drag.current.active = false;
        aim.current.dragging = false;
        // Клик (не перетаскивание) → открываем примагниченную страну.
        if (!wasDrag && aim.current.hovered) {
          router.push(`/trips/${aim.current.hovered.slug}`);
        }
      }}
      onPointerLeave={() => {
        aim.current.pointer = null;
        aim.current.dragging = false;
        drag.current.active = false;
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 42 }}
        dpr={[1, 2]}
        frameloop={visible ? 'always' : 'never'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        // События обрабатываем на обёртке (магнитный снапинг), r3f-рейкаст не нужен.
        events={undefined}
      >
        <fog attach="fog" args={['#0d0b08', 7, 13]} />
        <ambientLight intensity={0.6} />
        <Globe
          reduced={reduced}
          markers={markers}
          particleCount={particleCount}
          aim={aim}
          onHover={(m) => setHoveredName(m?.name ?? null)}
        />
        <Dust />
        {!reduced && <Rig aim={aim} />}
      </Canvas>
    </div>
  );
}
