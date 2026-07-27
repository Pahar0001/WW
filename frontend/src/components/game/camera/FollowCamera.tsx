'use client';

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HeightField, WORLD } from '../world/terrain';
import { blocked, buildColliders } from '../world/colliders';
import { input, type Character } from '../player/controller';
import { live } from '../state';

/**
 * Кинематографическая камера от третьего лица.
 *
 * Пружина, а не lerp: цель камеры догоняется с инерцией и лёгким перелётом,
 * из-за чего при остановке кадр «оседает», как настоящий стедикам. Простой
 * lerp даёт узнаваемо дешёвое «резиновое» слежение.
 *
 * Коллизия — маршем по луču от героя к желаемой точке по полю высот. Полный
 * raycast по мешу террейна (165 тысяч треугольников) стоил бы кадра; здесь
 * двенадцать выборок высоты, то есть доли микросекунды.
 *
 * Отдельный режим `intro` облетает остров для экрана-брифинга: игрок видит
 * мир до того, как возьмёт управление.
 */

const MIN_DIST = 3.4;
const MAX_DIST = 13;
const MIN_PITCH = -0.32;
const MAX_PITCH = 1.02;
/** Камера не подходит к земле ближе этого зазора. */
const GROUND_CLEARANCE = 0.9;

export function FollowCamera({
  character,
  hf,
  mode,
}: {
  character: React.MutableRefObject<Character>;
  hf: HeightField;
  mode: 'intro' | 'follow';
}) {
  const { camera } = useThree();
  const colliders = useMemo(() => buildColliders(hf), [hf]);

  const yaw = useRef(Math.PI);
  const pitch = useRef(0.3);
  const dist = useRef(8.2);
  const shown = useRef(8.2);
  const target = useRef(new THREE.Vector3());
  const pos = useRef(new THREE.Vector3());
  const vel = useRef(new THREE.Vector3());
  const idleLook = useRef(0);
  const fov = useRef(58);
  const started = useRef(false);

  useFrame(({ clock }, dt) => {
    const d = Math.min(dt, 0.05);
    const c = character.current;

    // ── Облёт острова на брифинге ──
    if (mode === 'intro') {
      const t = clock.elapsedTime * 0.055;
      const r = 210;
      camera.position.set(Math.cos(t) * r, 96 + Math.sin(t * 0.7) * 16, Math.sin(t) * r);
      camera.lookAt(0, 16, 0);
      if (camera instanceof THREE.PerspectiveCamera && camera.fov !== 52) {
        camera.fov = 52;
        camera.updateProjectionMatrix();
      }
      started.current = false;
      return;
    }

    // Первый кадр в режиме слежения — ставим камеру сразу за героем,
    // без полёта через полкарты.
    if (!started.current) {
      started.current = true;
      yaw.current = c.yaw + Math.PI;
      target.current.set(c.pos.x, c.pos.y + 1.35, c.pos.z);
      pos.current.copy(target.current);
      vel.current.set(0, 0, 0);
    }

    // ── Ввод орбиты ──
    if (input.lookX || input.lookY) {
      yaw.current -= input.lookX * 0.0042;
      pitch.current = THREE.MathUtils.clamp(pitch.current + input.lookY * 0.003, MIN_PITCH, MAX_PITCH);
      input.lookX = 0;
      input.lookY = 0;
      idleLook.current = 0;
    } else {
      idleLook.current += d;
    }
    if (input.zoom) {
      dist.current = THREE.MathUtils.clamp(dist.current + input.zoom * 0.7, MIN_DIST, MAX_DIST);
      input.zoom = 0;
    }

    // ── Автодоворот за спину ──
    // Через полторы секунды без мыши камера медленно встаёт позади героя:
    // на клавиатуре иначе приходится непрерывно подруливать.
    if (idleLook.current > 1.5 && c.speed > 1.2) {
      const want = c.yaw + Math.PI;
      let diff = want - yaw.current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      yaw.current += diff * Math.min(1, d * 1.1);
    }

    // ── Точка интереса ──
    // Смотрим не в самого героя, а немного вперёд по движению — кадр
    // «ведёт» игрока, а не догоняет.
    const leadX = (c.vel.x / 9) * 1.4;
    const leadZ = (c.vel.z / 9) * 1.4;
    const wantTarget = new THREE.Vector3(
      c.pos.x + leadX,
      c.pos.y + 1.35 - c.wade * 0.4,
      c.pos.z + leadZ,
    );
    target.current.lerp(wantTarget, 1 - Math.exp(-9 * d));

    // ── Желаемое положение ──
    const cp = Math.cos(pitch.current);
    const sp = Math.sin(pitch.current);
    const want = new THREE.Vector3(
      target.current.x + Math.sin(yaw.current) * dist.current * cp,
      target.current.y + dist.current * sp + 0.6,
      target.current.z + Math.cos(yaw.current) * dist.current * cp,
    );

    // ── Коллизия: марш по луču от цели к камере ──
    let allowed = dist.current;
    const dir = want.clone().sub(target.current);
    const total = dir.length() || 1;
    dir.divideScalar(total);
    const STEPS = 12;
    for (let i = 1; i <= STEPS; i++) {
      const s = (i / STEPS) * total;
      const px = target.current.x + dir.x * s;
      const py = target.current.y + dir.y * s;
      const pz = target.current.z + dir.z * s;
      // Рельеф ИЛИ рукотворное препятствие: без второй проверки камера
      // заезжала внутрь колонн руин, и кадр перекрывала бежевая плита.
      if (
        py < hf.sample(px, pz) + GROUND_CLEARANCE ||
        blocked(colliders, px, py, pz, 0.4)
      ) {
        allowed = Math.max(MIN_DIST, (s / total) * dist.current - 0.35);
        break;
      }
    }
    // Приближение мгновенное (иначе рельеф на мгновение закроет кадр),
    // отъезд — плавный.
    shown.current =
      allowed < shown.current
        ? allowed
        : shown.current + (allowed - shown.current) * (1 - Math.exp(-3.5 * d));

    const finalPos = new THREE.Vector3(
      target.current.x + Math.sin(yaw.current) * shown.current * cp,
      target.current.y + shown.current * sp + 0.6,
      target.current.z + Math.cos(yaw.current) * shown.current * cp,
    );

    // ── Пружина ──
    const stiffness = 150;
    const damping = 21;
    vel.current.x += (-(pos.current.x - finalPos.x) * stiffness - vel.current.x * damping) * d;
    vel.current.y += (-(pos.current.y - finalPos.y) * stiffness - vel.current.y * damping) * d;
    vel.current.z += (-(pos.current.z - finalPos.z) * stiffness - vel.current.z * damping) * d;
    pos.current.addScaledVector(vel.current, d);

    // Страховка от «подземной» камеры: пружина может перелететь вниз.
    const floor = hf.sample(pos.current.x, pos.current.z) + GROUND_CLEARANCE;
    if (pos.current.y < floor) {
      pos.current.y = floor;
      vel.current.y = Math.max(0, vel.current.y);
    }
    // И от выхода за границы мира.
    const lim = WORLD.half - 2;
    pos.current.x = THREE.MathUtils.clamp(pos.current.x, -lim, lim);
    pos.current.z = THREE.MathUtils.clamp(pos.current.z, -lim, lim);

    camera.position.copy(pos.current);
    camera.lookAt(target.current);

    // Скорость слегка расширяет угол — ощущение разгона без motion blur.
    if (camera instanceof THREE.PerspectiveCamera) {
      const wantFov = 58 + Math.min(1, c.speed / 9) * 5.5;
      fov.current += (wantFov - fov.current) * (1 - Math.exp(-3 * d));
      camera.fov = fov.current;
      camera.updateProjectionMatrix();
    }

    // Публикуем курс камеры: его читают управление (движение относительно
    // камеры) и компас в HUD.
    live.camYaw = yaw.current;
  });

  return null;
}
