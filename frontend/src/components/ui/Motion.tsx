'use client';

import { motion, type Variants } from 'framer-motion';
import type { ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fade + rise on scroll into view. */
export function FadeIn({
  children,
  delay = 0,
  y = 26,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.85, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

const containerV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
};
const itemV: Variants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

/** Cascade a group of children into view. Wrap each child in <StaggerItem>. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={containerV}
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
    <motion.div className={className} variants={itemV}>
      {children}
    </motion.div>
  );
}

/**
 * Word-by-word headline reveal: each word rises and de-blurs in sequence.
 * Every word animates independently (whileInView) — reliable, never clipped.
 * Newlines (\n) become line breaks.
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
  /** Class applied to words at or after `accentFrom` (e.g. gold gradient). */
  accentClassName?: string;
  accentFrom?: number;
}) {
  const lines = text.split('\n');
  let idx = 0;
  return (
    <span className={className} aria-label={text.replace(/\n/g, ' ')}>
      {lines.map((line, li) => (
        <span key={li} style={{ display: 'block' }}>
          {line.split(' ').map((word, wi, arr) => {
            const i = idx++;
            const accent = accentFrom !== undefined && i >= accentFrom;
            return (
              <span key={wi} style={{ display: 'inline-block', whiteSpace: 'pre' }} aria-hidden>
                <motion.span
                  className={accent ? accentClassName : undefined}
                  style={{ display: 'inline-block', willChange: 'transform, opacity, filter' }}
                  initial={{ opacity: 0, y: '0.45em', filter: 'blur(6px)' }}
                  whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.8, ease: EASE, delay: delay + i * 0.055 }}
                >
                  {word}
                </motion.span>
                {wi < arr.length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </span>
      ))}
    </span>
  );
}
