'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { detectTier, prefersReducedMotion, type DeviceTier } from '@/lib/motion';
import { CinematicPost } from '@/components/fx/CinematicPost';
import { HeightField, WORLD } from './world/terrain';
import { CHUNKS, Terrain, TerrainData } from './world/TerrainMesh';
import { Lakes, LavaLakes, Ocean, OpenSea, River, Waterfalls, makeHeightTexture } from './world/Water';
import { ATMO, Clouds, FOG_DENSITY, SkyDome } from './world/Sky';
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
import { gameStore, isFrozen, live, useGame } from './state';
import { evaluateQuests } from './quest-runner';
import { QuestObjects } from './world/QuestObjects';
import { Briefing, Hud, LoadingScreen } from './hud/Hud';
import { IntroScenes, ShutterFlash } from './hud/Story';

/**
 * Vela Island — интерактивный трёхмерный мир проекта.
 *
 * Всё здесь процедурное: рельеф, вода, растительность, руины, персонаж и его
 * анимация. Ни одной внешней модели, текстуры или HDRI — мир весит столько,
 * сколько весит код, собирается за доли секунды и не зависит ни от CDN, ни от
 * чужих лицензий.
 *
 * Мир — материк 840 × 840 метров из десяти зон: бухта, лес, каньон, ледник,
 * главный хребет, вулкан, пустыня, руины, кратерное озеро и связующая долина.
 *
 * Три уровня качества выбираются по устройству (см. detectTier):
 *   low  — 281² вершин рельефа (3.0 м/клетка), без теней, без пост-обработки;
 *   mid  — 401² (2.1 м), тени 1024, bloom + грейд + зерно;
 *   high — 561² (1.5 м), тени 2048, плюс глубина резкости и дисперсия.
 */

/**
 * Разрешение поля высот по классу устройства.
 *
 * Число обязано давать `(res − 1) % CHUNKS === 0`: рельеф режется на сетку
 * чанков, и остаток от деления оставил бы полосу мира без геометрии.
 * Шаг сетки — 1.5 м на high, 2.1 на mid, 3.0 на low при стороне мира 840 м.
 */
const RES: Record<DeviceTier, number> = {
  low: CHUNKS * 28 + 1,
  mid: CHUNKS * 40 + 1,
  high: CHUNKS * 56 + 1,
};

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
  setFlash,
}: {
  hf: HeightField;
  character: React.MutableRefObject<Character>;
  playerPos: React.MutableRefObject<THREE.Vector3>;
  setFlash: (n: number) => void;
}) {
  const fpsAcc = useRef({ frames: 0, time: 0 });
  /** Состояние удержания кнопки действия: какая работа и сколько уже держат. */
  const work = useRef({ id: null as string | null, held: 0 });
  const shutter = useRef(0);

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
      // Шаг физики вручную. Нужен, чтобы мерить физику ЧИСЛАМИ, а не на глаз:
      // на скрытой панели превью `requestAnimationFrame` придушен до ~0.3 кадра
      // в секунду (§12.8), и «посмотреть, как скользит» там невозможно. А так
      // прогоняется хоть тысяча шагов с точным dt, и результат не зависит от
      // того, рисует браузер кадры или нет.
      step: (dt = 1 / 60, steps = 1) => {
        for (let i = 0; i < steps; i++) stepCharacter(character.current, hf, 0, dt, false);
        const c = character.current;
        return {
          pos: [+c.pos.x.toFixed(2), +c.pos.z.toFixed(2)],
          speed: +c.speed.toFixed(3),
          surface: c.surface,
          slide: +c.slide.toFixed(3),
        };
      },
    };
  }, [hf, character]);

  useFrame((_state, dt) => {
    const g = gameStore.get();
    const c = character.current;
    const playing = g.phase === 'play';
    // Пока открыто ЛЮБОЕ окно, герой замирает: управление отдано интерфейсу.
    // Условие считает isFrozen — перечислять окна здесь по одному значило бы
    // забыть новое при следующей правке (так и вышло с экраном главы).
    const frozen = !playing || isFrozen(g);
    stepCharacter(c, hf, live.camYaw, dt, frozen);

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

    // Пока открыто окно, задания не обсчитываем: герой всё равно не двигается,
    // а кнопка действия иначе срабатывала бы прямо сквозь дневник — открыл
    // журнал, нажал E, получил снимок места, на котором стоишь.
    if (frozen) return;

    // ── Задания ──
    // Вычислитель возвращает доступное действие; выполняет его цикл, потому что
    // удержание кнопки живёт между кадрами, а вычислитель состояния не хранит.
    const pending = evaluateQuests(g, hf, c.pos.x, c.pos.y, c.pos.z);
    const w = work.current;

    if (!pending) {
      // Отошли от места работ — прогресс удержания сбрасываем. Иначе игрок
      // накопил бы его в трёх разных местах и закончил работу мгновенно.
      w.id = null;
      w.held = 0;
      live.workProgress = 0;
      live.actionHint = null;
    } else if (pending.kind === 'photo') {
      w.id = null;
      w.held = 0;
      live.workProgress = 0;
      live.actionHint = 'Сделать снимок';
      // Кадр — одиночное нажатие: держать кнопку незачем. Читаем буфер, а не
      // текущее состояние клавиши: короткий щелчок целиком проходит между
      // кадрами и иначе теряется.
      const tapped = input.actionAt > 0 && performance.now() - input.actionAt < 180;
      if (tapped) {
        input.actionAt = -1;
        gameStore.addSnapshot({
          id: pending.objective,
          caption: pending.caption,
          at: [c.pos.x, c.pos.z],
        });
        gameStore.completeObjective(pending.objective);
        shutter.current++;
        setFlash(shutter.current);
      }
    } else {
      live.actionHint = pending.label;
      if (w.id !== pending.objective) {
        w.id = pending.objective;
        w.held = 0;
      }
      if (input.action) {
        w.held += dt;
        live.workProgress = Math.min(1, w.held / pending.seconds);
        if (w.held >= pending.seconds) {
          gameStore.completeObjective(pending.objective);
          gameStore.addWork(pending.objective);
          celebrate(c, 1.6);
          w.id = null;
          w.held = 0;
          live.workProgress = 0;
        }
      } else {
        // Отпустил — прогресс утекает, но не мгновенно: случайный сбой нажатия
        // не должен обнулять две секунды работы.
        w.held = Math.max(0, w.held - dt * 1.6);
        live.workProgress = Math.min(1, w.held / pending.seconds);
      }
    }

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
  data,
  heightTex,
  tier,
  character,
  playerPos,
  mode,
  setFlash,
}: {
  hf: HeightField;
  data: TerrainData;
  heightTex: THREE.DataTexture;
  tier: DeviceTier;
  character: React.MutableRefObject<Character>;
  playerPos: React.MutableRefObject<THREE.Vector3>;
  mode: 'intro' | 'follow';
  setFlash: (n: number) => void;
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
          далёкие хребты уходят в дымку.

          Плотность снижена с 0.0026 до 0.0011 вместе с ростом мира. Прежнее
          значение подбиралось под остров в 330 метров, где дальняя точка
          скрадывалась на две трети. На материке в 840 метров оно съедало
          дальнюю половину карты целиком (0.99 плотности тумана): с вершины
          хребта не было видно ни вулкана, ни пустыни — вместо простора
          получалась белая стена в двухстах метрах от героя.

          ⚠️ Значение обязано совпадать с uFogDensity в шейдерах воды
          (Water.tsx): свой шейдер не получает туман сцены автоматически, и при
          расхождении океан у горизонта остаётся синим, когда горы уже растаяли. */}
      <fogExp2 attach="fog" args={[ATMO.fog.getHex(), FOG_DENSITY]} />

      <SkyDome />
      <Clouds tier={tier} />
      <SunLight character={character} tier={tier} />

      <Terrain data={data} tier={tier} receiveShadow={shadows} />
      <OpenSea />
      <Ocean heightTex={heightTex} tier={tier} />
      <Lakes heightTex={heightTex} tier={tier} />
      <LavaLakes />
      <River hf={hf} />
      <Waterfalls tier={tier} />

      <Scatter hf={hf} tier={tier} shadows={shadows} />
      <GrassField hf={hf} tier={tier} target={playerPos} />
      <Landmarks hf={hf} />
      <QuestObjects hf={hf} />
      <Wildlife hf={hf} tier={tier} player={playerPos} />

      <Traveler character={character} castShadow={shadows} />

      <FollowCamera character={character} hf={hf} mode={mode} />
      <GameLoop hf={hf} character={character} playerPos={playerPos} setFlash={setFlash} />

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
      <div className="flex flex-col items-end gap-3">
        {/*
          Кнопка действия. До неё на телефоне не было НИ ОДНОГО способа нажать
          «E», а на нём держатся съёмка и работы на месте — то есть часть
          заданий была физически непроходима, хотя мир и джойстик работали.

          Держим и `action`, и `actionAt`: первое нужно работам (настил моста
          требует пары секунд удержания), второе — одиночным действиям, где
          короткое касание иначе укладывается между двумя кадрами и теряется.
          Отпускание ловим и по `up`, и по `cancel`, и по `leave`: палец,
          соскользнувший с кнопки, обязан считаться отпущенным, иначе работа
          продолжалась бы сама.
        */}
        <button
          type="button"
          aria-label="Действие"
          onPointerDown={() => {
            input.action = true;
            input.actionAt = performance.now();
          }}
          onPointerUp={() => {
            input.action = false;
          }}
          onPointerCancel={() => {
            input.action = false;
          }}
          // И `out`, и `leave`: React синтезирует `pointerleave` из `pointerout`,
          // и один только `leave` не срабатывает, если событие приходит не от
          // живого пальца. Отпустить кнопку обязаны оба пути — иначе
          // соскользнувший палец оставит работу выполняться саму.
          onPointerOut={() => {
            input.action = false;
          }}
          onPointerLeave={() => {
            input.action = false;
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="pointer-events-auto grid h-20 w-20 select-none place-items-center rounded-full border border-white/30 bg-black/30 text-xs uppercase tracking-[0.16em] text-white/85 backdrop-blur-md active:scale-95"
        >
          Действие
        </button>
        <button
          type="button"
          aria-label="Прыжок"
          onPointerDown={() => {
            input.jumpAt = performance.now();
          }}
          className="pointer-events-auto grid h-20 w-20 select-none place-items-center rounded-full border border-[#e6c179]/40 bg-black/30 text-xs uppercase tracking-[0.16em] text-[#e6c179] backdrop-blur-md active:scale-95"
        >
          Прыжок
        </button>
      </div>
    </div>
  );
}

// ── Корневой компонент ─────────────────────────────────────────────────

export function VelaIsland() {
  const wrap = useRef<HTMLDivElement>(null);
  const { phase } = useGame();
  const [tier, setTier] = useState<DeviceTier>('mid');
  const [world, setWorld] = useState<{
    hf: HeightField;
    data: TerrainData;
    heightTex: THREE.DataTexture;
  } | null>(null);
  const [progress, setProgress] = useState(0.05);
  /** Счётчик вспышек затвора: смена значения запускает анимацию кадра. */
  const [flash, setFlash] = useState(0);

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
  //
  // Мир — 840 × 840 метров, на высоком качестве это 315 000 вершин рельефа,
  // столько же запечённых цветов с ambient occlusion и сотня чанков геометрии.
  // Синхронно это полторы-две секунды намертво заблокированного потока: экран
  // загрузки не успел бы даже отрисоваться, а браузер показал бы «страница не
  // отвечает». Поэтому работа нарезана на порции по несколько строк поля, и
  // между порциями кадр отдаётся браузеру — прогресс едет, вкладка живая.
  useEffect(() => {
    let cancelled = false;

    /**
     * Уступить управление браузеру.
     *
     * На ВИДИМОЙ вкладке ждём кадра: прогресс должен рисоваться, а порции
     * работы — попадать между кадрами.
     *
     * На СКРЫТОЙ вкладке requestAnimationFrame не вызывается вообще, и сборка
     * замирала до возвращения пользователя: свернул окно на секунду — вернулся
     * к тому же экрану загрузки. Там уступаем через MessageChannel: в отличие
     * от setTimeout, его сообщения не придушены в фоне (тем же приёмом
     * пользуется планировщик React), а раз никто не смотрит — работаем
     * порциями впятеро крупнее и заканчиваем быстрее.
     */
    const yieldToBrowser = () =>
      new Promise<void>((r) => {
        if (typeof document !== 'undefined' && document.hidden) {
          const ch = new MessageChannel();
          ch.port1.onmessage = () => {
            ch.port1.close();
            r();
          };
          ch.port2.postMessage(null);
        } else {
          requestAnimationFrame(() => r());
        }
      });

    (async () => {
      // Порция подобрана по ВРЕМЕНИ, а не по числу строк: на слабом телефоне
      // те же 24 строки считаются вчетверо дольше, и фиксированный размер
      // порции снова даёт заметные рывки.
      const chunkedBuild = async (build: (rows: number) => number, from: number, to: number) => {
        let rows = 16;
        for (;;) {
          const budget = typeof document !== 'undefined' && document.hidden ? 60 : 12;
          const t0 = performance.now();
          const done = build(rows);
          const dt = performance.now() - t0;
          setProgress(from + (to - from) * done);
          if (done >= 1 || cancelled) return;
          rows = Math.max(4, Math.min(160, Math.round((rows * budget) / Math.max(dt, 0.5))));
          await yieldToBrowser();
        }
      };
      const nextFrame = yieldToBrowser;

      setProgress(0.04);
      await nextFrame();

      const hf = new HeightField(RES[tier]);
      await chunkedBuild((r) => hf.buildRows(r), 0.04, 0.5);
      if (cancelled) return;

      const data = new TerrainData(hf);
      await chunkedBuild((r) => data.buildRows(r), 0.5, 0.88);
      if (cancelled) return;

      setProgress(0.9);
      await nextFrame();
      const heightTex = makeHeightTexture(hf);
      if (cancelled) return;

      setProgress(0.95);
      await nextFrame();
      character.current = createCharacter(hf);
      playerPos.current.copy(character.current.pos);
      live.x = character.current.pos.x;
      live.z = character.current.pos.z;
      if (cancelled) return;

      setWorld({ hf, data, heightTex });
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
      if (code === 'KeyJ') gameStore.toggleJournal();
      if (code === 'Escape') {
        const g = gameStore.get();
        if (g.mapOpen) gameStore.toggleMap();
        else if (g.journalOpen) gameStore.toggleJournal();
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
              data={world.data}
              heightTex={world.heightTex}
              tier={tier}
              character={character as React.MutableRefObject<Character>}
              playerPos={playerPos}
              mode={phase === 'play' ? 'follow' : 'intro'}
              setFlash={setFlash}
            />
          </Suspense>
        </Canvas>
      )}

      {ready && phase === 'play' && <TouchControls />}
      {ready && <Hud hf={world.hf} />}
      <ShutterFlash token={flash} />

      <AnimatePresence>
        {phase === 'intro' && <IntroScenes key="intro" />}
        {phase === 'briefing' && <Briefing key="briefing" />}
      </AnimatePresence>
      {phase === 'loading' && <LoadingScreen progress={progress} />}
    </div>
  );
}

export { WORLD };
