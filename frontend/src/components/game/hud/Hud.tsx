'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { EASE, onFrame } from '@/lib/motion';
import { pluralize } from '@/lib/plural';
import { PUBLIC_REGIONS, REGIONS, ARTIFACTS } from '../regions';
import { gameStore, live, useGame } from '../state';
import { HeightField, WORLD, groundColor, lavaAt, waterLevelAt } from '../world/terrain';
import { FRAGMENTS } from '../story';
import { ActionPrompt, ChapterCard, Journal, QuestTracker } from './Story';

/**
 * Интерфейс игры — намеренно минимальный: компас, карта, имя региона и
 * подсказки управления. Ничего больше в кадре нет, потому что кадр и есть
 * главное содержание.
 *
 * Компас и карта обновляются в общем rAF-тикере и пишут в DOM/canvas напрямую,
 * читая `live`. Ни один из этих элементов не вызывает ре-рендер React —
 * иначе шестьдесят перерисовок в секунду соревновались бы за кадр с самой
 * трёхмерной сценой.
 */

// ── Компас ─────────────────────────────────────────────────────────────

/**
 * Лента компаса: градусные штрихи, буквы направлений и азимуты неоткрытых
 * регионов. Реализована как одна широкая полоса, которую сдвигаем по курсу —
 * это дешевле и плавнее, чем пересчитывать позиции меток.
 */
function Compass() {
  const strip = useRef<HTMLDivElement>(null);
  const { discovered } = useGame();

  // Метки регионов на компасе появляются только для уже открытых мест —
  // иначе компас выдал бы все секреты сразу.
  const marks = useMemo(
    () => REGIONS.filter((r) => discovered.includes(r.id)),
    [discovered],
  );

  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    return onFrame(() => {
      // Курс камеры → сдвиг ленты. 4 px на градус.
      //
      // Азимут = −camYaw: камера смотрит в направлении (−sin yaw, −cos yaw),
      // то есть при yaw = 0 — на −Z, на север. Прежняя формула добавляла 540°
      // вместо 360° и разворачивала компас ровно на 180°: идёшь на север,
      // а прибор показывает юг.
      const deg = (((-live.camYaw * 180) / Math.PI) % 360 + 360) % 360;
      el.style.transform = `translateX(${(-deg * 4).toFixed(1)}px)`;

      for (const child of Array.from(el.children) as HTMLElement[]) {
        const id = child.dataset.region;
        if (!id) continue;
        const r = REGIONS.find((x) => x.id === id);
        if (!r) continue;
        const dx = r.at[0] - live.x;
        const dz = r.at[1] - live.z;
        // Азимут метки считаем ОТ ИГРОКА, а не от центра острова: иначе
        // компас указывает на место мимо, стоит отойти от середины карты.
        const bearing = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
        child.style.left = `${(bearing * 4).toFixed(1)}px`;
        const dist = Math.hypot(dx, dz);
        child.style.opacity = dist < 260 ? '1' : '0.35';
      }
    });
  }, []);

  // Полоса из трёх копий 0..359°, чтобы при сдвиге не было разрыва.
  const ticks = [];
  for (let pass = -1; pass <= 1; pass++) {
    for (let deg = 0; deg < 360; deg += 15) {
      const label =
        deg === 0 ? 'С' : deg === 90 ? 'В' : deg === 180 ? 'Ю' : deg === 270 ? 'З' : null;
      ticks.push(
        <div
          key={`${pass}-${deg}`}
          className="absolute top-0 flex flex-col items-center"
          style={{ left: (deg + pass * 360) * 4 }}
        >
          <span
            className={label ? 'h-3.5 w-px bg-white/70' : 'h-2 w-px bg-white/30'}
          />
          {label && (
            <span className="mt-0.5 text-[10px] font-medium tracking-[0.12em] text-white/85">
              {label}
            </span>
          )}
        </div>,
      );
    }
  }

  return (
    // Ширина в vw, а не фиксированная: на узком экране лента компаса должна
    // уступать место счётчикам и кнопкам справа. При 56vw верхняя строка
    // (81 + 390 + 190 плюс отступы) не влезала в 696 px и обрезалась по краю —
    // счётчик регионов и кнопка дневника уезжали за экран. На широких экранах
    // ограничение 420 px всё равно срабатывает раньше, так что вид не меняется.
    <div className="pointer-events-none relative h-9 w-[min(32vw,420px)] overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_16%,#000_84%,transparent)] sm:w-[min(40vw,420px)]">
      <div ref={strip} className="absolute left-1/2 top-1 h-full will-change-transform">
        {ticks}
        {/* Позицию и прозрачность метки пересчитывает тикер выше — здесь только
            сам узел с цветом региона. */}
        {marks.map((r) => (
          <div
            key={r.id}
            data-region={r.id}
            className="absolute top-0 flex flex-col items-center transition-opacity duration-500"
          >
            <span className="h-3.5 w-[2px] rounded" style={{ background: r.tone }} />
          </div>
        ))}
      </div>
      {/* Визир по центру */}
      <div className="absolute left-1/2 top-0 h-5 w-[2px] -translate-x-1/2 bg-[#e6c179]" />
    </div>
  );
}

// ── Карта ──────────────────────────────────────────────────────────────

/**
 * Мини-карта. Силуэт острова рисуется ОДИН РАЗ в offscreen-canvas по тому же
 * полю высот, что и рельеф (поэтому карта не может «разойтись» с миром), а
 * каждый кадр поверх копируется только фигурка игрока и метки.
 */
function useIslandMap(hf: HeightField, size: number) {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const img = ctx.createImageData(size, size);
    const d = img.data;

    // Цвет берём той же функцией, что красит рельеф: карта и мир не могут
    // расходиться по определению. Раньше у карты была своя палитра из пяти
    // биомов, и после появления дюн, пепла, льда и красной глины она показывала
    // бы вулкан и каньон одинаковым серым «камнем».
    const rgb: [number, number, number] = [0, 0, 0];

    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const x = -WORLD.half + (i / (size - 1)) * WORLD.half * 2;
        const z = -WORLD.half + (j / (size - 1)) * WORLD.half * 2;
        const h = hf.sample(x, z);
        const k = (j * size + i) * 4;
        const water = waterLevelAt(x, z);
        if (h <= water) {
          // Вода: глубина читается плотностью синего.
          const t = Math.min(1, (water - h) / 8);
          d[k] = 34 + (1 - t) * 40;
          d[k + 1] = 82 + (1 - t) * 52;
          d[k + 2] = 116 + (1 - t) * 44;
          d[k + 3] = 210;
          continue;
        }
        if (lavaAt(x, z)) {
          d[k] = 226;
          d[k + 1] = 88;
          d[k + 2] = 30;
          d[k + 3] = 255;
          continue;
        }
        groundColor(x, z, h, hf.slope(x, z), rgb);
        // Отмывка рельефа: склоны к северо-западу светлее — карта читается
        // объёмной, как в старом атласе.
        const shade = 0.82 + (hf.sample(x - 6, z - 6) - h) * 0.035;
        // Линейный цвет → sRGB: без гаммы карта выглядит вымытой и мутной.
        for (let c = 0; c < 3; c++) {
          d[k + c] = Math.max(0, Math.min(255, Math.pow(Math.max(0, rgb[c] * shade), 1 / 2.2) * 255));
        }
        d[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }, [hf, size]);
}

function MiniMap({ hf, expanded }: { hf: HeightField; expanded: boolean }) {
  const base = useIslandMap(hf, 300);
  const ref = useRef<HTMLCanvasElement>(null);
  const { discovered, artifacts } = useGame();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const S = canvas.width;
    const toPx = (v: number) => ((v + WORLD.half) / (WORLD.half * 2)) * S;

    return onFrame(() => {
      ctx.clearRect(0, 0, S, S);
      ctx.drawImage(base, 0, 0, S, S);

      // Открытые регионы
      for (const r of REGIONS) {
        const found = discovered.includes(r.id);
        if (r.secret && !found) continue;
        const px = toPx(r.at[0]);
        const py = toPx(r.at[1]);
        ctx.beginPath();
        ctx.arc(px, py, found ? 5 : 4, 0, Math.PI * 2);
        ctx.fillStyle = found ? r.tone : 'rgba(255,255,255,0.5)';
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(20,16,12,0.65)';
        ctx.stroke();
      }

      // Артефакты показываем только на развёрнутой карте — иначе поиск
      // перестаёт быть поиском.
      if (expanded) {
        for (const a of ARTIFACTS) {
          if (artifacts.includes(a.id)) continue;
          const px = toPx(a.at[0]);
          const py = toPx(a.at[1]);
          ctx.beginPath();
          ctx.moveTo(px, py - 4);
          ctx.lineTo(px + 4, py);
          ctx.lineTo(px, py + 4);
          ctx.lineTo(px - 4, py);
          ctx.closePath();
          ctx.fillStyle = '#e6c179';
          ctx.fill();
        }
      }

      // Игрок: треугольник по курсу
      const px = toPx(live.x);
      const py = toPx(live.z);
      ctx.save();
      ctx.translate(px, py);
      // Курс героя: 0 = на +Z (юг карты), поэтому разворачиваем на π.
      ctx.rotate(live.yaw + Math.PI);
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fillStyle = '#fff8e8';
      ctx.fill();
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = '#1a1611';
      ctx.stroke();
      ctx.restore();
    });
  }, [base, discovered, artifacts, expanded]);

  return (
    <canvas
      ref={ref}
      width={300}
      height={300}
      className="block h-full w-full"
      aria-hidden
    />
  );
}

// ── Подсказка направления ──────────────────────────────────────────────

function Waypoint() {
  const box = useRef<HTMLDivElement>(null);
  const name = useRef<HTMLSpanElement>(null);
  const dist = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const b = box.current;
    if (!b) return;
    let lastId: string | null = null;
    return onFrame(() => {
      const id = live.hintId;
      if (!id) {
        b.style.opacity = '0';
        return;
      }
      b.style.opacity = '1';
      if (id !== lastId) {
        lastId = id;
        const r = REGIONS.find((x) => x.id === id);
        if (r && name.current) name.current.textContent = r.name;
      }
      if (dist.current) dist.current.textContent = `${Math.round(live.hintDist)} м`;
    });
  }, []);

  return (
    <div
      ref={box}
      className="pointer-events-none flex max-w-full items-center gap-2.5 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs text-white/80 opacity-0 backdrop-blur-md transition-opacity duration-500"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e6c179]" />
      <span ref={name} className="truncate font-medium text-white/95" />
      <span ref={dist} className="shrink-0 tabular-nums text-white/55" />
    </div>
  );
}

// ── Карточка открытия региона ──────────────────────────────────────────

function RegionCard() {
  const { card, discovered } = useGame();
  const isNew = card ? discovered.includes(card.id) : false;

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') gameStore.closeCard();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card]);

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="pointer-events-auto absolute inset-0 z-30 grid place-items-center px-5"
        >
          {/* Затемнение с размытием: кадр остаётся виден, но уходит в глубину */}
          <motion.div
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.7, ease: EASE }}
            className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/70"
            onClick={() => gameStore.closeCard()}
          />
          <motion.div
            initial={{ opacity: 0, y: 42, scale: 0.96, filter: 'blur(14px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 18, scale: 0.98, filter: 'blur(10px)' }}
            transition={{ duration: 1, ease: EASE, delay: 0.12 }}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-white/15 bg-[#141210]/85 p-8 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl md:p-11"
          >
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl"
              style={{ background: card.tone, opacity: 0.22 }}
            />
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.34 }}
              className="relative mb-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.32em] text-white/50"
            >
              <span className="h-px w-8" style={{ background: card.tone }} />
              {isNew ? 'Новое место открыто' : card.kind}
            </motion.p>

            {/* Название выезжает из-под маски по буквам — «печать» на карте */}
            <h2 className="relative overflow-hidden font-serif text-4xl leading-tight tracking-tightest text-white md:text-5xl">
              {Array.from(card.name).map((ch, i) => (
                <motion.span
                  key={i}
                  style={{ display: 'inline-block', whiteSpace: 'pre' }}
                  initial={{ opacity: 0, y: '0.7em', filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ duration: 0.75, ease: EASE, delay: 0.42 + i * 0.035 }}
                >
                  {ch}
                </motion.span>
              ))}
            </h2>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.66 }}
              className="relative mt-5 text-[15px] leading-relaxed text-white/72"
            >
              {card.description}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.8 }}
              className="relative mt-8 flex flex-wrap items-center gap-3"
            >
              <Link
                href={card.href}
                className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#141210] transition-transform duration-500 ease-smooth hover:-translate-y-0.5"
              >
                {card.cta}
                <span className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
              <button
                type="button"
                onClick={() => gameStore.closeCard()}
                className="rounded-full border border-white/20 px-6 py-3 text-sm text-white/75 transition-colors duration-500 hover:border-white/45 hover:text-white"
              >
                Продолжить путь
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Всплывающее сообщение ──────────────────────────────────────────────

function Toast() {
  const { toast } = useGame();
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => gameStore.clearToast(), 3600);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 24, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: -12, filter: 'blur(8px)' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="pointer-events-none flex items-center gap-3 rounded-2xl border border-[#e6c179]/35 bg-black/55 px-5 py-3 backdrop-blur-xl"
        >
          {toast.kind === 'artifact' && (
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e6c179]/15 text-[#e6c179]">
              ◆
            </span>
          )}
          <span className="text-sm text-white/90">
            {toast.kind === 'artifact' ? (
              <>
                <span className="text-white/50">Найден артефакт · </span>
                {toast.text}
              </>
            ) : (
              toast.text
            )}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Экраны загрузки и брифинга ─────────────────────────────────────────

export function LoadingScreen({ progress }: { progress: number }) {
  const steps = ['Поднимаем рельеф', 'Наливаем океан', 'Сажаем лес', 'Расставляем маяки'];
  const step = Math.min(steps.length - 1, Math.floor(progress * steps.length));
  return (
    <div className="absolute inset-0 z-50 grid place-items-center bg-[#0d0b08]">
      <div className="w-[min(84vw,420px)] text-center">
        <p className="mb-6 flex items-center justify-center gap-3 text-[11px] uppercase tracking-[0.34em] text-white/40">
          <span className="h-px w-8 bg-[#e6c179]/60" />
          Vela Island
        </p>
        <h1 className="font-serif text-3xl tracking-tightest text-white">Остров собирается</h1>
        <div className="mt-8 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#e6c179]/60 to-[#e6c179]"
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 0.5, ease: EASE }}
          />
        </div>
        <p className="mt-4 text-xs text-white/45">{steps[step]}…</p>
      </div>
    </div>
  );
}

export function Briefing() {
  const { discovered, artifacts } = useGame();
  const returning = discovered.length > 0 || artifacts.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, filter: 'blur(12px)' }}
      transition={{ duration: 0.8, ease: EASE }}
      className="absolute inset-0 z-40 flex items-end bg-gradient-to-t from-[#0b0906]/95 via-[#0b0906]/60 to-[#0b0906]/25 px-6 pb-14 pt-24 md:items-center md:pb-0"
    >
      <div className="mx-auto w-full max-w-3xl">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.2 }}
          className="mb-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.34em] text-white/45"
        >
          <span className="h-px w-8 bg-[#e6c179]/70" />
          Интерактивный мир Vela
        </motion.p>

        <h1 className="font-serif text-[clamp(2.4rem,7vw,4.6rem)] leading-[0.98] tracking-tightest text-white">
          {'Остров Vela'.split('').map((ch, i) => (
            <motion.span
              key={i}
              style={{ display: 'inline-block', whiteSpace: 'pre' }}
              initial={{ opacity: 0, y: '0.6em', filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.9, ease: EASE, delay: 0.3 + i * 0.04 }}
            >
              {ch}
            </motion.span>
          ))}
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.7 }}
          className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/70 md:text-base"
        >
          {/* Числа считаем из данных, а не пишем словами: набор регионов и
              артефактов меняется, а подпись «шесть мест и семь артефактов»
              молча устаревает и начинает врать игроку на первом же экране. */}
          {pluralize(PUBLIC_REGIONS.length, 'место', 'места', 'мест')},{' '}
          {pluralize(REGIONS.length - PUBLIC_REGIONS.length, 'секрет', 'секрета', 'секретов')} и{' '}
          {pluralize(ARTIFACTS.length, 'древний артефакт', 'древних артефакта', 'древних артефактов')}.
          Каждое открытое место — это раздел Vela: коллекция маршрутов, сообщество,
          честные данные, консьерж. Идите куда хотите — карта заполнится сама.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.86 }}
          className="mt-9 flex flex-wrap items-center gap-3"
        >
          <button
            type="button"
            onClick={() => gameStore.start()}
            className="group inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-medium text-[#141210] transition-transform duration-500 ease-smooth hover:-translate-y-0.5"
          >
            {returning ? 'Продолжить путешествие' : 'Высадиться на остров'}
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[#e6c179] text-[#3a2c12] transition-transform duration-500 group-hover:translate-x-0.5">
              →
            </span>
          </button>
          <Link
            href="/"
            className="rounded-full border border-white/20 px-7 py-4 text-sm text-white/75 transition-colors duration-500 hover:border-white/45 hover:text-white"
          >
            Вернуться на сайт
          </Link>
          {returning && (
            <button
              type="button"
              onClick={() => gameStore.reset()}
              className="px-3 py-4 text-xs text-white/40 underline-offset-4 transition-colors hover:text-white/70 hover:underline"
            >
              Начать заново
            </button>
          )}
        </motion.div>

        <motion.dl
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, ease: EASE, delay: 1 }}
          className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/10 pt-7 text-white/60"
        >
          {[
            ['WASD', 'идти'],
            ['Shift', 'бежать'],
            ['Space', 'прыжок'],
            ['Мышь', 'осмотреться'],
            ['Колесо', 'приблизить'],
            ['E', 'действие'],
            ['M', 'карта'],
            ['J', 'дневник'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center gap-2.5">
              <dt className="rounded-md border border-white/20 bg-white/5 px-2 py-1 text-[11px] font-medium text-white/85">
                {k}
              </dt>
              <dd className="text-xs">{v}</dd>
            </div>
          ))}
        </motion.dl>
      </div>
    </motion.div>
  );
}

// ── Сборка HUD ─────────────────────────────────────────────────────────

export function Hud({ hf }: { hf: HeightField }) {
  const { discovered, artifacts, fragments, mapOpen, phase } = useGame();
  const [hintsVisible, setHints] = useState(true);

  // Подсказки управления гаснут, как только игрок реально пошёл, —
  // и больше не мешают смотреть.
  useEffect(() => {
    if (phase !== 'play') return;
    const off = onFrame(() => {
      if (live.speed > 2.5) {
        setHints(false);
        off();
      }
    });
    const timer = window.setTimeout(() => {
      setHints(false);
      off();
    }, 14000);
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [phase]);

  // Экран главы и дневник доступны и на паузе: карточка региона и глава могут
  // накладываться, а дневник игрок открывает именно тогда, когда остановился.
  if (phase !== 'play')
    return (
      <>
        <RegionCard />
        <ChapterCard />
      </>
    );

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none">
      {/* Верхняя строка: возврат на сайт, компас, прогресс */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 p-4 md:p-6">
        <Link
          href="/"
          className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-4 py-2 text-xs text-white/75 backdrop-blur-md transition-colors duration-500 hover:border-white/40 hover:text-white"
        >
          <span className="text-[13px] text-[#e6c179]">和</span>
          На сайт
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">
          <Compass />
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-black/35 px-3.5 py-2 text-xs text-white/70 backdrop-blur-md">
            {/* Карта Мира — главный счётчик: именно её собирает игрок. */}
            <span className="text-[#e6c179]">◈</span>
            <span className="tabular-nums">
              {fragments.length}/{FRAGMENTS.length}
            </span>
            <span className="mx-1 h-3 w-px bg-white/20" />
            <span className="text-[#e6c179]">◆</span>
            <span className="tabular-nums">
              {artifacts.length}/{ARTIFACTS.length}
            </span>
            {/* Счётчик регионов на телефоне скрыт: три группы в одну строку не
                влезают (495 px в 375), а то же число видно на карте. */}
            <span className="mx-1 hidden h-3 w-px bg-white/20 sm:block" />
            <span className="hidden tabular-nums sm:inline">
              {discovered.filter((id) => !REGIONS.find((r) => r.id === id)?.secret).length}/
              {PUBLIC_REGIONS.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => gameStore.toggleMap()}
            className="pointer-events-auto rounded-full border border-white/15 bg-black/35 px-3.5 py-2 text-[11px] uppercase tracking-[0.18em] text-white/70 backdrop-blur-md transition-colors duration-500 hover:border-white/40 hover:text-white"
          >
            Карта<span className="hidden sm:inline"> · M</span>
          </button>
          <button
            type="button"
            onClick={() => gameStore.toggleJournal()}
            className="pointer-events-auto rounded-full border border-white/15 bg-black/35 px-3.5 py-2 text-[11px] uppercase tracking-[0.18em] text-white/70 backdrop-blur-md transition-colors duration-500 hover:border-white/40 hover:text-white"
          >
            Дневник<span className="hidden sm:inline"> · J</span>
          </button>
        </div>
      </div>

      {/* Указатели цели идут ОТДЕЛЬНОЙ строкой под верхней панелью, а не в
          средней колонке вместе с компасом.
          В колонке им доставалась лишь та ширина, что осталась от ссылки слева
          и счётчиков справа: на экране 375 px это 61 px, и название цели
          обрезалось до пустоты — от подсказки «Спуститься к воде 47 м»
          оставалось одно «47 м». Своя строка даёт им всю ширину экрана. */}
      {/* На телефоне строка уходит НИЖЕ кнопок справа (счётчики + «Карта» +
          «Дневник» занимают там ~130 px по вертикали), иначе широкая плашка
          цели наезжает на них. На широком экране места хватает и без сдвига. */}
      <div className="absolute inset-x-0 top-36 flex flex-col items-center gap-2 px-4 md:top-[5.4rem]">
        <Waypoint />
        <QuestTracker />
      </div>

      {/* Подсказка действия — по центру снизу, над сообщениями */}
      <div className="absolute inset-x-0 bottom-40 flex justify-center px-4 md:bottom-24">
        <ActionPrompt />
      </div>

      {/* Мини-карта в углу / развёрнутая карта по центру */}
      <motion.div
        className="pointer-events-none absolute overflow-hidden rounded-2xl border border-white/15 bg-black/35 backdrop-blur-md"
        animate={
          mapOpen
            ? { right: '50%', bottom: '50%', width: 'min(76vmin,560px)', height: 'min(76vmin,560px)', x: '50%', y: '50%' }
            : { right: 20, bottom: 20, width: 148, height: 148, x: 0, y: 0 }
        }
        transition={{ duration: 0.7, ease: EASE }}
      >
        <MiniMap hf={hf} expanded={mapOpen} />
        {mapOpen && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-4">
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">
              Карта острова · {discovered.length} из {REGIONS.length} мест
            </p>
          </div>
        )}
      </motion.div>

      {/* Сообщения */}
      <div className="absolute inset-x-0 bottom-24 flex justify-center px-4 md:bottom-10">
        <Toast />
      </div>

      {/* Подсказки управления */}
      <AnimatePresence>
        {hintsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.4 }}
            className="absolute inset-x-0 bottom-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-6 text-[11px] text-white/45 md:bottom-8"
          >
            {[
              ['WASD', 'идти'],
              ['Shift', 'бежать'],
              ['Space', 'прыжок'],
              ['мышь', 'осмотреться'],
              ['E', 'действие'],
              ['J', 'дневник'],
            ].map(([k, v]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="rounded border border-white/20 bg-white/5 px-1.5 py-0.5 text-white/75">{k}</span>
                {v}
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <RegionCard />
      <ChapterCard />
      <Journal />
    </div>
  );
}
