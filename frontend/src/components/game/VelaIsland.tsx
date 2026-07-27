'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { detectTier, prefersReducedMotion, type DeviceTier } from '@/lib/motion';
import { CinematicPost } from '@/components/fx/CinematicPost';
import { HeightField, WORLD } from './world/terrain';
import { Terrain } from './world/TerrainMesh';
import { CraterLake, Ocean, OpenSea, River, Waterfall, makeHeightTexture } from './world/Water';
import { ATMO, Clouds, SkyDome } from './world/Sky';
import { GrassField, Scatter } from './world/Scatter';
import { Landmarks } from './world/Landmarks';
import { Wildlife } from './world/Wildlife';
import { Traveler } from './player/Traveler';
import { FollowCamera } from './camera/FollowCamera';
import {
  attachInput,
  celebrate,
  createCharacter,
  input,
  stepCharacter,
  type Character,
} from './player/controller';
import { ARTIFACTS, REGIONS } from './regions';
import { gameStore, live, useGame } from './state';
import { Briefing, Hud, LoadingScreen } from './hud/Hud';

/**
 * Vela Island — интерактивный трёхмерный мир проекта.
 *
 * Всё здесь процедурное: рельеф, вода, растительность, руины, персонаж и его
 * анимация. Ни одной внешней модели, текстуры или HDRI — мир весит столько,
 * сколько весит код, собирается за доли секунды и не зависит ни от CDN, ни от
 * чужих лицензий.
 *
 * Три уровня качества выбираются по устройству (см. detectTier):
 *   low  — 176² вершин рельефа, без теней, без пост-обработки;
 *   mid  — 224², тени 1024, bloom + грейд + зерно;
 *   high — 288², тени 2048, плюс глубина резкости и дисперсия.
 */

const RES: Record<DeviceTier, number> = { low: 176, mid: 224, high: 288 };

// ── Свет ───────────────────────────────────────────────────────────────

/**
 * Солнце с тенями, следующее за игроком.
 *
 * Ортографическая камера тени покрывает всего 62 метра вокруг героя и едет
 * вместе с ним. Накрыть весь остров (330 м) одной картой 2048 означало бы
 * 16 см на пиксель — тени превратились бы в лестницы. Здесь около 3 см.
 */
function SunLight({ character, tier }: { character: React.MutableRefObject<Character>; tier: DeviceTier }) {
  const light = useRef<THREE.DirectionalLight>(null);
  const offset = useMemo(() => ATMO.sunDir.clone().multiplyScalar(70), []);
  const shadows = tier !== 'low';

  useFrame(() => {
    const l = light.current;
    if (!l) return;
    const p = character.current.pos;
    l.position.set(p.x + offset.x, p.y + offset.y, p.z + offset.z);
    l.target.position.set(p.x, p.y, p.z);
    l.target.updateMatrixWorld();
  });

  return (
    <>
      <directionalLight
        ref={light}
        color={ATMO.sunColor}
        intensity={3.4}
        castShadow={shadows}
        shadow-mapSize-width={tier === 'high' ? 2048 : 1024}
        shadow-mapSize-height={tier === 'high' ? 2048 : 1024}
        shadow-camera-near={1}
        shadow-camera-far={190}
        shadow-camera-left={-31}
        shadow-camera-right={31}
        shadow-camera-top={31}
        shadow-camera-bottom={-31}
        // Отрицательный bias убирает акне на пологих поверхностях, normalBias —
        // «отрыв» тени от тонких объектов (стволы, перила).
        shadow-bias={-0.0005}
        shadow-normalBias={0.035}
      />
      {/* Небесный fill: прохладный свет сверху, тёплый отражённый от земли снизу.
          Интенсивность высокая осознанно: солнце стоит низко, и без плотного
          заполняющего света все склоны, отвёрнутые от него, проваливались в
          почти чёрный — в реальности их вытягивает свет неба. */}
      <hemisphereLight args={[ATMO.fillColor, '#8a7452', 1.25]} />
      <ambientLight intensity={0.24} />
    </>
  );
}

// ── Игровой цикл ───────────────────────────────────────────────────────

/**
 * Шаг симуляции и вся игровая логика. Живёт внутри Canvas, чтобы попасть в
 * общий useFrame, но состояние читает напрямую из стора (gameStore.get()),
 * а не через хук: замыкание в useFrame иначе устаревало бы между рендерами.
 */
function GameLoop({
  hf,
  character,
  playerPos,
}: {
  hf: HeightField;
  character: React.MutableRefObject<Character>;
  playerPos: React.MutableRefObject<THREE.Vector3>;
}) {
  const fpsAcc = useRef({ frames: 0, time: 0 });

  // Отладочная ручка (только dev): позволяет телепортировать героя и щупать
  // рельеф из консоли — например `__vela.to(74, 44)` к руинам. Тот же приём
  // уже используется в Hero3D для отладки прицеливания по глобусу.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    (window as unknown as Record<string, unknown>).__vela = {
      char: character,
      hf,
      input,
      live,
      to: (x: number, z: number) => {
        character.current.pos.set(x, hf.sample(x, z) + 0.5, z);
        character.current.vel.set(0, 0, 0);
      },
    };
  }, [hf, character]);

  useFrame((_state, dt) => {
    const g = gameStore.get();
    const c = character.current;
    const playing = g.phase === 'play';
    // Во время карточки региона герой замирает: управление отдано интерфейсу.
    stepCharacter(c, hf, live.camYaw, dt, !playing || g.paused || !!g.card);

    playerPos.current.copy(c.pos);
    live.x = c.pos.x;
    live.y = c.pos.y;
    live.z = c.pos.z;
    live.yaw = c.yaw;
    live.speed = c.speed;
    live.grounded = c.grounded;

    // FPS раз в полсекунды — для авто-подстройки качества.
    const acc = fpsAcc.current;
    acc.frames++;
    acc.time += dt;
    if (acc.time > 0.5) {
      live.fps = acc.frames / acc.time;
      acc.frames = 0;
      acc.time = 0;
    }

    if (!playing) return;

    // ── Регионы ──
    let best: { id: string; dist: number } | null = null;
    for (const r of REGIONS) {
      const d = Math.hypot(r.at[0] - c.pos.x, r.at[1] - c.pos.z);
      const found = g.discovered.includes(r.id);
      if (d < r.radius) {
        if (!found) {
          gameStore.discover(r);
          celebrate(c, 2);
        }
      }
      // Подсказка ведёт к ближайшему НЕоткрытому и НЕсекретному месту:
      // секреты игрок должен найти сам, иначе они перестают быть секретами.
      if (!found && !r.secret && (!best || d < best.dist)) best = { id: r.id, dist: d };
    }
    live.hintId = best?.id ?? null;
    live.hintDist = best?.dist ?? 0;

    // ── Артефакты ──
    for (const a of ARTIFACTS) {
      if (g.artifacts.includes(a.id)) continue;
      const d = Math.hypot(a.at[0] - c.pos.x, a.at[1] - c.pos.z);
      const dy = Math.abs(hf.sample(a.at[0], a.at[1]) + a.lift - (c.pos.y + 1));
      if (d < 2.2 && dy < 2.4) {
        gameStore.collect(a.id, a.name);
        if (g.artifacts.length + 1 === ARTIFACTS.length) {
          celebrate(c, 3);
          gameStore.info('Все артефакты найдены. Остров раскрыт полностью.');
        }
      }
    }
  });

  return null;
}

// ── Сцена ──────────────────────────────────────────────────────────────

function Scene({
  hf,
  heightTex,
  tier,
  character,
  playerPos,
  mode,
}: {
  hf: HeightField;
  heightTex: THREE.DataTexture;
  tier: DeviceTier;
  character: React.MutableRefObject<Character>;
  playerPos: React.MutableRefObject<THREE.Vector3>;
  mode: 'intro' | 'follow';
}) {
  const { gl } = useThree();
  const shadows = tier !== 'low';

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    // ACES ощутимо давит средние тона: при экспозиции 1.0 солнечный день
    // выглядел пасмурным. 1.28 возвращает свет, не выжигая небо.
    gl.toneMappingExposure = 1.28;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
  }, [gl]);

  return (
    <>
      {/* Экспоненциальный туман: атмосферная перспектива, из-за которой
          далёкие хребты уходят в дымку и остров кажется большим. */}
      <fogExp2 attach="fog" args={[ATMO.fog.getHex(), 0.0026]} />

      <SkyDome />
      <Clouds tier={tier} />
      <SunLight character={character} tier={tier} />

      <Terrain hf={hf} receiveShadow={shadows} />
      <OpenSea />
      <Ocean heightTex={heightTex} tier={tier} />
      <CraterLake heightTex={heightTex} tier={tier} />
      <River hf={hf} />
      <Waterfall tier={tier} />

      <Scatter hf={hf} tier={tier} shadows={shadows} />
      <GrassField hf={hf} tier={tier} target={playerPos} />
      <Landmarks hf={hf} />
      <Wildlife hf={hf} tier={tier} player={playerPos} />

      <Traveler character={character} castShadow={shadows} />

      <FollowCamera character={character} hf={hf} mode={mode} />
      <GameLoop hf={hf} character={character} playerPos={playerPos} />

      <CinematicPost
        tier={tier}
        bloom={0.55}
        bloomThreshold={0.75}
        // Мягкая глубина резкости: размывается только далёкий план, герой и
        // всё вокруг него остаются резкими — иначе игра «плывёт».
        dof={{ focusDistance: 0.021, focalLength: 0.22, bokehScale: 2.1 }}
        vignette={0.38}
        grain={0.026}
        saturation={0.06}
        contrast={0.04}
      />
    </>
  );
}

// ── Тач-управление ─────────────────────────────────────────────────────

/**
 * Джойстик и кнопки для тач-устройств. Появляется только при первом касании:
 * на ноутбуке с тачскрином лишние элементы в кадре не нужны.
 */
function TouchControls() {
  const [visible, setVisible] = useState(false);
  const knob = useRef<HTMLDivElement>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const onTouch = () => {
      setVisible(true);
      input.touch = true;
      window.removeEventListener('touchstart', onTouch);
    };
    window.addEventListener('touchstart', onTouch, { passive: true });
    return () => window.removeEventListener('touchstart', onTouch);
  }, []);

  if (!visible) return null;

  const R = 52;
  const move = (e: React.PointerEvent) => {
    if (!origin.current) return;
    const dx = e.clientX - origin.current.x;
    const dy = e.clientY - origin.current.y;
    const len = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, len / R);
    input.strafe = (dx / len) * k;
    input.forward = (-dy / len) * k;
    // Полное отклонение = бег: отдельная кнопка «бежать» на телефоне неудобна.
    input.run = k > 0.86;
    if (knob.current) {
      knob.current.style.transform = `translate(${((dx / len) * k * R).toFixed(1)}px, ${((dy / len) * k * R).toFixed(1)}px)`;
    }
  };
  const end = () => {
    origin.current = null;
    input.forward = 0;
    input.strafe = 0;
    input.run = false;
    if (knob.current) knob.current.style.transform = '';
  };

  return (
    <div className="absolute inset-x-0 bottom-0 z-30 flex items-end justify-between p-6 md:hidden">
      <div
        className="pointer-events-auto relative grid h-32 w-32 place-items-center rounded-full border border-white/20 bg-black/25 backdrop-blur-md"
        onPointerDown={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          move(e);
        }}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
      >
        <div
          ref={knob}
          className="h-12 w-12 rounded-full border border-white/35 bg-white/25 transition-transform duration-100"
        />
      </div>
      <button
        type="button"
        aria-label="Прыжок"
        onPointerDown={() => {
          input.jumpAt = performance.now();
        }}
        className="pointer-events-auto grid h-20 w-20 place-items-center rounded-full border border-[#e6c179]/40 bg-black/30 text-xs uppercase tracking-[0.16em] text-[#e6c179] backdrop-blur-md active:scale-95"
      >
        Прыжок
      </button>
    </div>
  );
}

// ── Корневой компонент ─────────────────────────────────────────────────

export function VelaIsland() {
  const wrap = useRef<HTMLDivElement>(null);
  const { phase } = useGame();
  const [tier, setTier] = useState<DeviceTier>('mid');
  const [world, setWorld] = useState<{ hf: HeightField; heightTex: THREE.DataTexture } | null>(null);
  const [progress, setProgress] = useState(0.05);

  const character = useRef<Character | null>(null);
  const playerPos = useRef(new THREE.Vector3());

  // Прогресс прошлых заходов и класс устройства.
  useEffect(() => {
    gameStore.hydrate();
    setTier(prefersReducedMotion() ? 'low' : detectTier());
  }, []);

  // Полноэкранный режим: страница под сценой не должна прокручиваться.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // ── Сборка мира по шагам ──
  // Между шагами отдаём кадр браузеру, иначе экран загрузки не успел бы
  // отрисоваться и пользователь смотрел бы на белый экран.
  useEffect(() => {
    let cancelled = false;
    const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));

    (async () => {
      setProgress(0.12);
      await nextFrame();
      const hf = new HeightField(RES[tier]);
      if (cancelled) return;

      setProgress(0.55);
      await nextFrame();
      const heightTex = makeHeightTexture(hf);
      if (cancelled) return;

      setProgress(0.78);
      await nextFrame();
      character.current = createCharacter(hf);
      playerPos.current.copy(character.current.pos);
      live.x = character.current.pos.x;
      live.z = character.current.pos.z;

      setProgress(0.95);
      await nextFrame();
      if (cancelled) return;
      setWorld({ hf, heightTex });
      setProgress(1);
      gameStore.ready();
    })();

    return () => {
      cancelled = true;
    };
  }, [tier]);

  // Ввод и горячие клавиши.
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    return attachInput(el, (code) => {
      if (code === 'KeyM' || code === 'Tab') gameStore.toggleMap();
      if (code === 'Escape') {
        const g = gameStore.get();
        if (g.mapOpen) gameStore.toggleMap();
      }
    });
  }, [world]);

  const ready = world && character.current;

  return (
    <div
      ref={wrap}
      className="fixed inset-0 overflow-hidden bg-[#0d0b08] touch-none"
    >
      {ready && (
        <Canvas
          shadows={tier !== 'low'}
          dpr={tier === 'low' ? [0.75, 1] : tier === 'mid' ? [1, 1.5] : [1, 2]}
          camera={{ position: [0, 40, 120], fov: 58, near: 0.4, far: 1400 }}
          gl={{
            antialias: tier === 'high',
            powerPreference: 'high-performance',
            alpha: false,
            stencil: false,
          }}
        >
          <Suspense fallback={null}>
            <Scene
              hf={world.hf}
              heightTex={world.heightTex}
              tier={tier}
              character={character as React.MutableRefObject<Character>}
              playerPos={playerPos}
              mode={phase === 'play' ? 'follow' : 'intro'}
            />
          </Suspense>
        </Canvas>
      )}

      {ready && phase === 'play' && <TouchControls />}
      {ready && <Hud hf={world.hf} />}

      <AnimatePresence>{phase === 'briefing' && <Briefing key="briefing" />}</AnimatePresence>
      {phase === 'loading' && <LoadingScreen progress={progress} />}
    </div>
  );
}

export { WORLD };
