'use client';

import { motion, type Variants } from 'framer-motion';
import { useRef, type CSSProperties, type ElementType, type ReactNode } from 'react';
import { EASE, clamp, damp, useViewportProgress, prefersReducedMotion } from '@/lib/motion';

export { EASE };

/* ═══════════════════════════════════════════════════════════════════════
   Появление блоков
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Появление при въезде во вьюпорт. Не «просто fade»: сдвиг + масштаб + снятие
 * размытия одновременно — глаз читает это как выход объекта из глубины кадра,
 * а не как включение лампочки.
 */
export function FadeIn({
  children,
  delay = 0,
  y = 26,
  blur = 8,
  scale = 0.985,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  /** Стартовое размытие, px. 0 — выключить (текст под ClearType не мылится). */
  blur?: number;
  scale?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, scale, filter: blur ? `blur(${blur}px)` : undefined }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: blur ? 'blur(0px)' : undefined }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 1, ease: EASE, delay }}
      style={{ willChange: 'transform, opacity, filter' }}
    >
      {children}
    </motion.div>
  );
}

const itemV: Variants = {
  hidden: { opacity: 0, y: 24, filter: 'blur(7px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: EASE } },
};

/** Каскадное появление группы. Каждый ребёнок — в <StaggerItem>. */
export function Stagger({
  children,
  className,
  stagger = 0.09,
  delay = 0.04,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-50px' }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div className={className} variants={itemV} style={{ willChange: 'transform, opacity' }}>
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Типографика: split text
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Обёртка строки для mask-reveal.
 *
 * ⚠️ `overflow: hidden` при line-height < 1 (у нас .display-1 = 0.98) срезает
 * выносные элементы кириллицы — «у», «р», «д», «ц», «щ». Поэтому маска
 * получает нижний запас в 0.2em и компенсирующий отрицательный margin:
 * визуально ничего не смещается, но буквы целые.
 */
const maskLine: CSSProperties = {
  display: 'block',
  overflow: 'hidden',
  paddingBottom: '0.2em',
  marginBottom: '-0.2em',
};

type SplitMode = 'chars' | 'words' | 'lines';

/**
 * Раскрытие текста по буквам / словам / строкам.
 *
 * Каждый фрагмент выезжает из-под маски строки, поднимаясь и снимая размытие,
 * со сдвигом по времени. Строки анимируются как единое целое, поэтому длинные
 * абзацы не превращаются в «телетайп».
 *
 * Доступность: полная фраза остаётся в aria-label, фрагменты скрыты от
 * скринридеров — озвучивается один связный текст, а не 40 букв.
 */
export function SplitText({
  text,
  as: Tag = 'span',
  mode = 'words',
  className,
  delay = 0,
  stagger,
  duration = 0.9,
  y = '0.6em',
  blur = 8,
  accentFrom,
  accentClassName,
  once = true,
}: {
  text: string;
  as?: ElementType;
  mode?: SplitMode;
  className?: string;
  delay?: number;
  stagger?: number;
  duration?: number;
  y?: string;
  blur?: number;
  /** Индекс фрагмента (в выбранном режиме), с которого включается акцент. */
  accentFrom?: number;
  accentClassName?: string;
  once?: boolean;
}) {
  const reduced = prefersReducedMotion();
  const step = stagger ?? (mode === 'chars' ? 0.028 : mode === 'words' ? 0.055 : 0.12);
  const lines = text.split('\n');
  let idx = 0;

  const piece = (content: string, key: string | number, i: number, pad = false) => {
    const accent = accentFrom !== undefined && i >= accentFrom;
    return (
      <span key={key} style={{ display: 'inline-block', whiteSpace: 'pre' }} aria-hidden>
        <motion.span
          className={accent ? accentClassName : undefined}
          style={{ display: 'inline-block', willChange: 'transform, opacity, filter' }}
          initial={{ opacity: 0, y, filter: blur ? `blur(${blur}px)` : undefined }}
          whileInView={{ opacity: 1, y: 0, filter: blur ? 'blur(0px)' : undefined }}
          viewport={{ once, margin: '-40px' }}
          transition={
            reduced
              ? { duration: 0.001 }
              : { duration, ease: EASE, delay: delay + i * step }
          }
        >
          {content}
        </motion.span>
        {pad ? ' ' : ''}
      </span>
    );
  };

  return (
    <Tag className={className} aria-label={text.replace(/\n/g, ' ')}>
      {lines.map((line, li) => (
        <span key={li} style={maskLine}>
          {mode === 'lines'
            ? piece(line, li, idx++)
            : mode === 'words'
              ? line
                  .split(' ')
                  .map((w, wi, arr) => piece(w, wi, idx++, wi < arr.length - 1))
              : Array.from(line).map((ch, ci) =>
                  piece(ch === ' ' ? ' ' : ch, ci, idx++),
                )}
        </span>
      ))}
    </Tag>
  );
}

/**
 * Заголовочное раскрытие по словам — исторический API проекта.
 * Оставлен как есть по сигнатуре (используется на многих страницах), внутри —
 * новый SplitText с маской строки.
 */
export function TextReveal({
  text,
  className,
  delay = 0,
  accentClassName,
  accentFrom,
}: {
  text: string;
  className?: string;
  delay?: number;
  accentClassName?: string;
  accentFrom?: number;
}) {
  return (
    <SplitText
      text={text}
      className={className}
      delay={delay}
      accentClassName={accentClassName}
      accentFrom={accentFrom}
      mode="words"
    />
  );
}

/**
 * Раскрытие блока из-под маски (clip-path). Для картинок, медиа и крупных
 * карточек: содержимое не «проявляется», а открывается шторкой — эффект
 * дороже fade и не трогает opacity текста.
 */
export function MaskReveal({
  children,
  className,
  delay = 0,
  direction = 'up',
  duration = 1.2,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: number;
}) {
  const from = {
    up: 'inset(100% 0% 0% 0%)',
    down: 'inset(0% 0% 100% 0%)',
    left: 'inset(0% 100% 0% 0%)',
    right: 'inset(0% 0% 0% 100%)',
  }[direction];

  return (
    <motion.div
      className={className}
      initial={{ clipPath: from, opacity: 0.4 }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)', opacity: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration, ease: EASE, delay }}
      style={{ willChange: 'clip-path' }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   Скролл: параллакс и глубина
   ═══════════════════════════════════════════════════════════════════════ */

/**
 * Параллакс по скроллу. Пишет transform напрямую из общего тикера —
 * ни одного ре-рендера. `speed` в долях высоты вьюпорта: 0.12 — деликатно,
 * 0.4 — заметный отрыв слоя.
 */
export function Parallax({
  children,
  speed = 0.12,
  className,
  scaleFrom = 1,
  rotate = 0,
}: {
  children: ReactNode;
  /** >0 — слой отстаёт (дальний план), <0 — опережает (ближний). */
  speed?: number;
  className?: string;
  /** Стартовый масштаб (например 1.08 для «наезда» фона). */
  scaleFrom?: number;
  /** Максимальный доворот в градусах на всём проходе. */
  rotate?: number;
}) {
  const reduced = prefersReducedMotion();
  const smooth = useRef(0);

  const ref = useViewportProgress<HTMLDivElement>((p, f, el) => {
    // Прогресс сглаживаем: на тач-скролле с инерцией сырое значение ступенчатое.
    smooth.current = damp(smooth.current, p, 14, f.dt);
    const c = smooth.current - 0.5; // -0.5..0.5 — центр вьюпорта = 0
    const shift = -c * speed * window.innerHeight;
    const sc = scaleFrom + (1 - scaleFrom) * (1 - Math.abs(c) * 2);
    const rot = c * rotate;
    el.style.transform = `translate3d(0, ${shift.toFixed(2)}px, 0) scale(${sc.toFixed(4)}) rotate(${rot.toFixed(3)}deg)`;
  }, { enabled: !reduced });

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}

/**
 * Глубина кадра: секция въезжает из перспективы — доворот по X, лёгкий
 * масштаб и снятие размытия по мере выхода в центр экрана. Ощущение
 * «камера подъезжает к слою», а не «див появился».
 */
export function ScrollDepth({
  children,
  className,
  intensity = 1,
}: {
  children: ReactNode;
  className?: string;
  /** 0..1.5. Выше 1 — заметный кинематографичный наклон. */
  intensity?: number;
}) {
  const reduced = prefersReducedMotion();
  const smooth = useRef(0);

  const ref = useViewportProgress<HTMLDivElement>((p, f, el) => {
    smooth.current = damp(smooth.current, p, 12, f.dt);
    // Работаем только на въезде (0..0.5): на выезде секция не должна «падать».
    const t = clamp(smooth.current / 0.45);
    const inv = 1 - t;
    el.style.transform = `perspective(1400px) rotateX(${(inv * 7 * intensity).toFixed(3)}deg) translate3d(0, ${(inv * 40 * intensity).toFixed(2)}px, ${(-inv * 90 * intensity).toFixed(2)}px)`;
    el.style.opacity = String(0.35 + 0.65 * t);
  }, { enabled: !reduced });

  return (
    <div
      ref={ref}
      className={className}
      style={{ willChange: 'transform, opacity', transformStyle: 'preserve-3d' }}
    >
      {children}
    </div>
  );
}

/**
 * Скорость скролла как выразительное средство: при быстрой прокрутке слой
 * слегка растягивается по вертикали и размывается — как motion blur в кино.
 * Эффект тонкий по амплитуде и полностью исчезает в покое.
 */
export function VelocitySkew({
  children,
  className,
  max = 0.06,
}: {
  children: ReactNode;
  className?: string;
  /** Максимальное растяжение (доля). 0.06 — предел приличия. */
  max?: number;
}) {
  const reduced = prefersReducedMotion();
  const cur = useRef(0);

  const ref = useViewportProgress<HTMLDivElement>((_p, f, el) => {
    // 2600 px/сек ≈ очень быстрый флик; выше — уже без разницы.
    const target = clamp(Math.abs(f.vy) / 2600) * max * Math.sign(f.vy);
    cur.current = damp(cur.current, target, 10, f.dt);
    const s = cur.current;
    el.style.transform = `scale(${(1 - Math.abs(s) * 0.35).toFixed(4)}, ${(1 + Math.abs(s)).toFixed(4)})`;
    el.style.filter = Math.abs(s) > 0.004 ? `blur(${(Math.abs(s) * 26).toFixed(2)}px)` : '';
  }, { enabled: !reduced });

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform, filter' }}>
      {children}
    </div>
  );
}
