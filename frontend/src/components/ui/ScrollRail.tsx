'use client';

/**
 * ScrollRail — «нить путешествия» по главной (desktop, lg+).
 *
 * Вертикальная золотая линия у левого края контента: заполняется сверху вниз
 * по мере прокрутки, с светящейся точкой на текущей позиции. Каждая секция
 * с атрибутом data-rail получает узел на линии и подпись; узлы вспыхивают,
 * когда нить до них доходит, а сами секции въезжают снизу (IntersectionObserver
 * + CSS, ноль setState на скролле — всё пишется напрямую в style).
 */

import { useEffect, useRef, type ReactNode } from 'react';

interface NodeInfo {
  el: HTMLElement;
  dot: HTMLSpanElement;
  label: HTMLSpanElement;
  top: number; // px от начала обёртки
}

export function ScrollRail({ children }: { children: ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const spark = useRef<HTMLDivElement>(null);
  const railBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = wrap.current;
    const railEl = railBox.current;
    if (!root || !railEl) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let nodes: NodeInfo[] = [];
    let raf = 0;
    let height = 0;

    // Узлы: по одному на секцию с data-rail (подпись — значение атрибута).
    const buildNodes = () => {
      nodes.forEach((n) => {
        n.dot.remove();
        n.label.remove();
      });
      nodes = [];
      height = root.scrollHeight;
      const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-rail]'));
      for (const el of sections) {
        const top = el.offsetTop + 8;
        const dot = document.createElement('span');
        dot.className =
          'absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full border border-aurora/70 bg-ink transition-all duration-700';
        dot.style.top = `${top}px`;
        dot.style.opacity = '0.35';
        const label = document.createElement('span');
        label.textContent = el.dataset.rail ?? '';
        label.className =
          'absolute left-4 -translate-y-1/2 whitespace-nowrap text-[10px] uppercase tracking-[0.22em] text-paper-faint transition-all duration-700';
        label.style.top = `${top + 6}px`;
        label.style.opacity = '0';
        label.style.transform = 'translateY(-50%) translateX(-6px)';
        railEl.appendChild(dot);
        railEl.appendChild(label);
        nodes.push({ el, dot, label, top });
      }
    };

    const tick = () => {
      raf = 0;
      const rect = root.getBoundingClientRect();
      // Прогресс: сколько обёртки прошло над серединой экрана.
      const passed = window.innerHeight * 0.55 - rect.top;
      const p = Math.min(Math.max(passed / height, 0), 1);
      const y = p * height;
      if (fill.current) fill.current.style.height = `${y}px`;
      if (spark.current) {
        spark.current.style.top = `${y}px`;
        spark.current.style.opacity = p > 0.005 && p < 0.995 ? '1' : '0';
      }
      for (const n of nodes) {
        const reached = y >= n.top;
        n.dot.style.opacity = reached ? '1' : '0.35';
        n.dot.style.boxShadow = reached ? '0 0 14px hsl(39 60% 60% / 0.55)' : 'none';
        n.dot.style.backgroundColor = reached ? 'hsl(39 50% 55%)' : '';
        n.label.style.opacity = reached ? '1' : '0';
        n.label.style.transform = reached
          ? 'translateY(-50%) translateX(0)'
          : 'translateY(-50%) translateX(-6px)';
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };

    buildNodes();
    tick();
    const ro = new ResizeObserver(() => {
      buildNodes();
      tick();
    });
    ro.observe(root);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    // Появление секций: подъезд снизу при входе в вьюпорт.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const el = e.target as HTMLElement;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            io.unobserve(el);
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    for (const n of nodes) {
      n.el.style.opacity = '0';
      n.el.style.transform = 'translateY(28px)';
      n.el.style.transition =
        'opacity 0.9s cubic-bezier(0.22,1,0.36,1), transform 0.9s cubic-bezier(0.22,1,0.36,1)';
      io.observe(n.el);
    }

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      // Убрать созданные DOM-узлы: в dev StrictMode монтирует эффект дважды,
      // без этого точки и подписи на рельсе дублируются.
      nodes.forEach((n) => {
        n.dot.remove();
        n.label.remove();
      });
      nodes = [];
    };
  }, []);

  return (
    <div ref={wrap} className="relative">
      {/* Рельса: только на широких экранах, у левого края */}
      <div
        ref={railBox}
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-4 top-0 hidden w-px lg:block xl:left-8"
      >
        <div className="absolute inset-0 w-px bg-ink-line" />
        <div
          ref={fill}
          className="absolute left-0 top-0 w-px bg-gradient-to-b from-aurora/30 via-aurora to-aurora"
          style={{ height: 0 }}
        />
        <div
          ref={spark}
          className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-aurora opacity-0 transition-opacity duration-300"
          style={{ boxShadow: '0 0 18px hsl(39 60% 60% / 0.8), 0 0 44px hsl(39 60% 60% / 0.4)' }}
        />
      </div>
      {children}
    </div>
  );
}
