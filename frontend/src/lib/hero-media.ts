/**
 * Медиа-слой hero — задел под интеграцию Higgsfield (через MCP).
 *
 * Идея: генеративные изображения/видео подставляются в hero БЕЗ правок
 * компонентов — меняется только этот конфиг (в будущем — ответ API/MCP).
 * 3D-глобус остаётся основным слоем; медиа ложится ПОД него с мягким
 * затемнением, так что при отсутствии/ошибке медиа ничего не ломается.
 *
 * Контракт для будущего Higgsfield-модуля:
 *   getHeroMedia() → { kind, src, poster? } | { kind: 'none' }
 *   kind 'video'  — беззвучный зацикленный фон (mp4/webm, до ~6 МБ);
 *   kind 'image'  — статичный кадр (webp/avif);
 *   kind 'none'   — только 3D-сцена (текущее поведение).
 */
export type HeroMedia =
  | { kind: 'none' }
  | { kind: 'image'; src: string }
  | { kind: 'video'; src: string; poster?: string };

// Дефолт — локальное видео полёта (public/hero/flight.mp4): кинематографический
// скролл-hero. NEXT_PUBLIC_HERO_MEDIA_URL переопределяет источник (Higgsfield
// в будущем), значение 'none' отключает видео → фолбэк на 3D-глобус.
export function getHeroMedia(): HeroMedia {
  const src = process.env.NEXT_PUBLIC_HERO_MEDIA_URL ?? '/hero/flight.mp4';
  if (!src || src === 'none') return { kind: 'none' };
  return /\.(mp4|webm)(\?|$)/.test(src)
    ? {
        kind: 'video',
        src,
        poster: process.env.NEXT_PUBLIC_HERO_MEDIA_POSTER ?? '/hero/flight-poster.jpg',
      }
    : { kind: 'image', src };
}
