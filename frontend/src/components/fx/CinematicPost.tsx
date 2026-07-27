'use client';

import {
  Bloom,
  BrightnessContrast,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  HueSaturation,
  Noise,
  Vignette,
} from '@react-three/postprocessing';
import { BlendFunction, KernelSize } from 'postprocessing';
import * as THREE from 'three';
import { useMemo } from 'react';
import type { DeviceTier } from '@/lib/motion';

/**
 * Кинематографический пост-процесс Vela — один пресет на все 3D-сцены
 * (герой, глобус, игровой мир), чтобы «кино» было одинаковым везде.
 *
 * Порядок проходов не случаен и соответствует реальному киноконвейеру:
 *   1. Depth of Field — оптика объектива (работает по глубине сцены);
 *   2. Bloom          — рассеяние яркого света в оптике;
 *   3. Chromatic Aberration — дисперсия в линзе (края кадра);
 *   4. Hue/Saturation + Brightness/Contrast — цветокоррекция (грейд);
 *   5. Vignette       — падение света к краям кадра;
 *   6. Noise          — зерно плёнки последним, поверх грейда.
 *
 * ⚠️ Tone mapping НЕ входит в композер: ACES включён на самом рендерере
 * (`gl={{ toneMapping: ACESFilmicToneMapping }}`). Иначе кривая применилась бы
 * дважды — сцена без композера (низкий тир) и с ним выглядели бы по-разному,
 * а картинка «выцветала» бы.
 *
 * Тиры:
 *   low  → композера нет вообще (остаются ACES + честный свет сцены);
 *   mid  → bloom + грейд + виньетка + зерно;
 *   high → плюс глубина резкости, дисперсия и мультисэмплинг.
 */

export type PostOptions = {
  tier: DeviceTier;
  /** Сила свечения. 0.5–0.9 — «дорого», выше — дискотека. */
  bloom?: number;
  /** Порог яркости для bloom: ниже — светится всё, включая полутона. */
  bloomThreshold?: number;
  /** Глубина резкости. false — выключить даже на high. */
  dof?: false | { focusDistance?: number; focalLength?: number; bokehScale?: number };
  vignette?: number;
  grain?: number;
  /** Дисперсия в линзе, в долях экрана. 0.0004–0.001 — на грани заметности. */
  chroma?: number;
  /** Грейд: тёплые света / прохладные тени задаются насыщенностью и контрастом. */
  saturation?: number;
  contrast?: number;
  brightness?: number;
};

export function CinematicPost({
  tier,
  bloom = 0.62,
  bloomThreshold = 0.68,
  dof = { focusDistance: 0.012, focalLength: 0.06, bokehScale: 3.2 },
  vignette = 0.42,
  grain = 0.032,
  chroma = 0.0006,
  saturation = 0.07,
  contrast = 0.045,
  brightness = 0,
}: PostOptions) {
  const chromaOffset = useMemo(() => new THREE.Vector2(chroma, chroma * 0.7), [chroma]);

  if (tier === 'low') return null;

  const high = tier === 'high';

  return (
    <EffectComposer
      // multisampling работает только на WebGL2 и стоит заметно —
      // включаем лишь на сильных машинах, на mid сглаживание даёт сам bloom.
      multisampling={high ? 4 : 0}
      // HalfFloat: без него bloom по яркому небу срезается в белые пятна.
      frameBufferType={THREE.HalfFloatType}
    >
      {high && dof ? (
        <DepthOfField
          focusDistance={dof.focusDistance ?? 0.012}
          focalLength={dof.focalLength ?? 0.06}
          bokehScale={dof.bokehScale ?? 3.2}
        />
      ) : (
        <></>
      )}

      <Bloom
        intensity={bloom}
        luminanceThreshold={bloomThreshold}
        luminanceSmoothing={0.32}
        mipmapBlur
        kernelSize={high ? KernelSize.LARGE : KernelSize.MEDIUM}
      />

      {high ? (
        <ChromaticAberration
          offset={chromaOffset}
          radialModulation
          modulationOffset={0.42}
          blendFunction={BlendFunction.NORMAL}
        />
      ) : (
        <></>
      )}

      <HueSaturation hue={0} saturation={saturation} />
      <BrightnessContrast brightness={brightness} contrast={contrast} />
      <Vignette offset={0.28} darkness={vignette} eskil={false} />
      <Noise premultiply opacity={grain} blendFunction={BlendFunction.OVERLAY} />
    </EffectComposer>
  );
}
