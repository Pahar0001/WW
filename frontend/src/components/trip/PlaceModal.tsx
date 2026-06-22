'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Place } from '@/lib/api';
import { imageUrl } from '@/lib/api';

/**
 * Full-screen detail panel for a place: photo gallery + practical guide
 * (как добраться / на что обратить внимание / что рядом). Opens on place click.
 */
export function PlaceModal({ place, onClose }: { place: Place | null; onClose: () => void }) {
  // Gallery = primary photo + extra photos, de-duplicated.
  const gallery = Array.from(
    new Set([place?.photoUrl, ...(place?.photos ?? [])].filter(Boolean) as string[]),
  ).map((g) => imageUrl(g)!);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [place?.id]);

  // Close on Escape; lock scroll while open.
  useEffect(() => {
    if (!place) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [place, onClose]);

  return (
    <AnimatePresence>
      {place && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-ink/80 p-4 backdrop-blur-sm md:p-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative my-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-ink-line bg-ink-soft"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              aria-label="Закрыть"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/70 text-paper transition-colors hover:bg-ink"
            >
              ✕
            </button>

            {/* Gallery */}
            {gallery.length > 0 && (
              <div>
                <div className="relative h-72 w-full overflow-hidden md:h-96">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gallery[active]} alt={place.name} className="h-full w-full object-cover" />
                </div>
                {gallery.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-3">
                    {gallery.map((g, i) => (
                      <button
                        key={i}
                        onClick={() => setActive(i)}
                        className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border transition-opacity ${
                          i === active ? 'border-aurora opacity-100' : 'border-ink-line opacity-60 hover:opacity-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={g} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="p-7 md:p-9">
              <div className="flex items-baseline gap-3">
                <h2 className="font-serif text-3xl tracking-tightest">{place.name}</h2>
                {place.nameLocal && <span className="text-paper-faint">{place.nameLocal}</span>}
              </div>
              {place.description && <p className="mt-4 text-lg text-paper-dim">{place.description}</p>}

              <div className="mt-8 space-y-6">
                <GuideBlock title="Как добраться" text={place.howToGet} />
                <GuideBlock title="На что обратить внимание" text={place.tips} />
                <GuideBlock title="Что рядом" text={place.nearby} />
              </div>

              {!place.howToGet && !place.tips && !place.nearby && (
                <p className="mt-8 text-sm text-paper-faint">
                  Подробное описание для этого места ещё не заполнено. Его можно
                  добавить через панель управления.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function GuideBlock({ title, text }: { title: string; text?: string | null }) {
  if (!text) return null;
  return (
    <div className="border-l-2 border-aurora/40 pl-4">
      <div className="text-xs uppercase tracking-[0.25em] text-paper-faint">{title}</div>
      <p className="mt-1.5 leading-relaxed text-paper-dim">{text}</p>
    </div>
  );
}
