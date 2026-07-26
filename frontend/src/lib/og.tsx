/**
 * Общий шаблон OG-картинок (карточка ссылки при шеринге в соцсетях).
 *
 * Рисуется через next/og (satori) на сервере: тёмная кино-сцена в фирменной
 * палитре, антикварное золото, крупный заголовок. Шрифт Inter лежит в репозитории
 * (SIL Open Font License) — встроенный в next/og шрифт покрывает только латиницу,
 * а у нас русские заголовки.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

// Фирменные цвета в явных значениях: satori не понимает CSS-переменные Tailwind.
const INK = '#14100c';
const GOLD = '#c9a55f';
const CREAM = '#f3ece0';
const TAGLINE = 'Путешествия, которые запоминаются';

let fontsCache:
  | { name: string; data: Buffer; weight: 400 | 600; style: 'normal' }[]
  | null = null;

// Шрифты лежат в public/fonts — этот каталог целиком копируется в standalone-образ,
// поэтому файл читается с диска и в Docker, и при локальной сборке.
async function fonts() {
  if (fontsCache) return fontsCache;
  const dir = join(process.cwd(), 'public', 'fonts');
  const [regular, semibold] = await Promise.all([
    readFile(join(dir, 'Inter-Regular.ttf')),
    readFile(join(dir, 'Inter-SemiBold.ttf')),
  ]);
  fontsCache = [
    { name: 'Inter', data: regular, weight: 400, style: 'normal' },
    { name: 'Inter', data: semibold, weight: 600, style: 'normal' },
  ];
  return fontsCache;
}

export interface OgCardInput {
  /** Надзаголовок: страна, раздел, «7 дней · весна». */
  eyebrow?: string | null;
  title: string;
  /** Подпись под заголовком (краткое описание). */
  subtitle?: string | null;
  /** Абсолютный URL фонового фото; относительные пути игнорируются. */
  background?: string | null;
}

/** Собирает готовый ImageResponse для OG-карточки. */
export async function ogCard({ eyebrow, title, subtitle, background }: OgCardInput) {
  const bg = background && /^https?:\/\//.test(background) ? background : null;
  // Длинный заголовок уменьшаем, чтобы он не выпадал из карточки.
  const titleSize = title.length > 68 ? 58 : title.length > 40 ? 70 : 84;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: INK,
          padding: 64,
          position: 'relative',
          fontFamily: 'Inter',
        }}
      >
        {bg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bg}
            alt=""
            width={OG_SIZE.width}
            height={OG_SIZE.height}
            style={{ position: 'absolute', inset: 0, objectFit: 'cover', opacity: 0.42 }}
          />
        )}
        {/* Скрим: заголовок читается на любом фото */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: bg
              ? 'linear-gradient(90deg, rgba(20,16,12,0.94) 30%, rgba(20,16,12,0.45) 100%)'
              : 'radial-gradient(120% 120% at 0% 100%, rgba(201,165,95,0.16), rgba(20,16,12,0) 60%)',
          }}
        />
        {/* Золотая рамка-хайрлайн (satori не понимает inset — только стороны) */}
        <div
          style={{
            position: 'absolute',
            top: 28,
            left: 28,
            right: 28,
            bottom: 28,
            border: `1px solid ${GOLD}66`,
            borderRadius: 18,
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              border: `1px solid ${GOLD}88`,
              color: GOLD,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            和
          </div>
          <div style={{ color: CREAM, fontSize: 30, letterSpacing: -0.5 }}>Vela</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {eyebrow && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                color: GOLD,
                fontSize: 24,
                letterSpacing: 6,
                textTransform: 'uppercase',
                marginBottom: 22,
              }}
            >
              <div style={{ width: 44, height: 1, background: GOLD }} />
              {eyebrow}
            </div>
          )}
          <div
            style={{
              color: CREAM,
              fontSize: titleSize,
              fontWeight: 600,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                color: '#cfc4b2',
                fontSize: 30,
                lineHeight: 1.35,
                marginTop: 22,
                maxWidth: 900,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#9d9384',
            fontSize: 24,
            position: 'relative',
          }}
        >
          <span>velatrips.ru</span>
          {/* На главной слоган уже вынесен в заголовок — не дублируем его. */}
          {!title.includes(TAGLINE) && <span>{TAGLINE}</span>}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}

/** Обрезка описания до одной строки карточки. */
export function ogClamp(text?: string | null, max = 120): string | null {
  if (!text) return null;
  const s = text.replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}
