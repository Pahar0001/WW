'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { GlobeMarker } from '@/lib/country-coords';

const GOLD = '#d8b878';
const R = 2.2;

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

/** Кликабельный маркер страны: золотая точка + пульс; hover — подпись, клик — маршрут. */
function Marker({
  marker,
  hovered,
  onHover,
  onLeave,
  onSelect,
}: {
  marker: GlobeMarker & { pos: THREE.Vector3 };
  hovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  const halo = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!halo.current) return;
    // Мягкий «дышащий» пульс; на hover — заметнее.
    const t = clock.elapsedTime * 1.6;
    const s = (hovered ? 1.9 : 1.25) + Math.sin(t) * 0.18;
    halo.current.scale.setScalar(s);
    (halo.current.material as THREE.MeshBasicMaterial).opacity = hovered ? 0.5 : 0.22;
  });
  return (
    <group position={marker.pos}>
      {/* Невидимая крупная зона клика — тапать по точке легко и на мобильном */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover();
        }}
        onPointerOut={onLeave}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        <sphereGeometry args={[0.16, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {/* Ядро точки */}
      <mesh scale={hovered ? 1.55 : 1}>
        <sphereGeometry args={[0.038, 12, 12]} />
        <meshBasicMaterial color={hovered ? '#f0dcae' : GOLD} />
      </mesh>
      {/* Свечение-гало */}
      <mesh ref={halo}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color={GOLD} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Подпись при наведении — стеклянная плашка в стиле сайта */}
      {hovered && (
        <Html position={[0, 0.14, 0]} center distanceFactor={7} zIndexRange={[20, 0]}>
          <button
            type="button"
            onClick={onSelect}
            className="pointer-events-auto flex items-center gap-2 whitespace-nowrap rounded-full border border-[#d8b878]/45 bg-[#0d0b08]/85 px-4 py-2 text-[13px] text-white shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[#d8b878]" />
            {marker.name}
            <span className="text-[#d8b878]">смотреть маршрут →</span>
          </button>
        </Html>
      )}
    </group>
  );
}

function Globe({
  reduced,
  markers,
  particleCount,
}: {
  reduced: boolean;
  markers: GlobeMarker[];
  particleCount: number;
}) {
  const group = useRef<THREE.Group>(null);
  const router = useRouter();
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

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

  const markerPoints = useMemo(
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

  // Курсор-«рука» над маркером.
  useEffect(() => {
    document.body.style.cursor = hoveredSlug ? 'pointer' : '';
    return () => {
      document.body.style.cursor = '';
    };
  }, [hoveredSlug]);

  useFrame((state, dt) => {
    if (!group.current) return;
    // Вращение замирает, пока пользователь целится в страну.
    if (!reduced && !hoveredSlug) group.current.rotation.y += dt * 0.06;
    // Subtle parallax toward the pointer.
    const px = state.pointer.x * 0.25;
    const py = state.pointer.y * 0.2;
    group.current.rotation.x += (py - group.current.rotation.x) * 0.05;
    group.current.position.x += (px - group.current.position.x) * 0.05;
  });

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
      {/* Кликабельные страны */}
      {markerPoints.map((m) => (
        <Marker
          key={m.slug}
          marker={m}
          hovered={hoveredSlug === m.slug}
          onHover={() => setHoveredSlug(m.slug)}
          onLeave={() => setHoveredSlug((s) => (s === m.slug ? null : s))}
          onSelect={() => router.push(`/trips/${m.slug}`)}
        />
      ))}
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

function Rig() {
  const { camera } = useThree();
  useFrame((state) => {
    camera.position.x += (state.pointer.x * 0.6 - camera.position.x) * 0.03;
    camera.position.y += (-state.pointer.y * 0.4 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export function Hero3D({ markers = [] }: { markers?: GlobeMarker[] }) {
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Перф: на мобильных — вдвое меньше частиц (WebGL на low-end).
  const particleCount =
    typeof window !== 'undefined' && window.innerWidth < 768 ? 1300 : 2600;

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

  return (
    <div ref={wrap} className="h-full w-full">
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 42 }}
        dpr={[1, 2]}
        frameloop={visible ? 'always' : 'never'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <fog attach="fog" args={['#0d0b08', 7, 13]} />
        <ambientLight intensity={0.6} />
        <Globe reduced={reduced} markers={markers} particleCount={particleCount} />
        <Dust />
        {!reduced && <Rig />}
      </Canvas>
    </div>
  );
}
