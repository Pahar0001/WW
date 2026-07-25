/**
 * ScrollController — превращает прокрутку страницы в плавный «таймлайн» 0..1.
 *
 * Принципы производительности:
 *  - НИКАКИХ вычислений в обработчике scroll: браузерный scroll-событий может
 *    приходить сотни в секунду и дёргать layout. Мы читаем window.scrollY
 *    ровно один раз за кадр внутри requestAnimationFrame.
 *  - Сырой прогресс сглаживается экспоненциальным лёрпом (критически важно:
 *    колесо мыши шагает дискретно, а видео должно «плыть», а не прыгать).
 *  - Геометрия секции (top/height) кэшируется и пересчитывается ТОЛЬКО через
 *    ResizeObserver — ни одного getBoundingClientRect в горячем цикле.
 *  - IntersectionObserver останавливает rAF-цикл, когда секция вне экрана:
 *    ноль работы на прокрутке остальной страницы.
 */

export interface ScrollFrame {
  /** Сглаженный прогресс 0..1 — основной «таймлайн». */
  progress: number;
  /** Мгновенный (несглаженный) прогресс — для решений «мы в конце?». */
  raw: number;
  /** Скорость изменения прогресса за кадр — для эффектов по инерции. */
  velocity: number;
}

type Listener = (frame: ScrollFrame) => void;

export class ScrollController {
  private section: HTMLElement;
  private listeners = new Set<Listener>();
  private rafId: number | null = null;
  private running = false;

  // Кэш геометрии: абсолютный top секции и «прокручиваемая» дистанция.
  private sectionTop = 0;
  private scrollRange = 1;

  private progress = 0;
  private raw = 0;

  // Коэффициент сглаживания: доля пути к цели за кадр (при 60fps).
  // 0.14 ≈ «дорогая» инерция: отзывчиво, но без дискретных шагов колеса.
  private readonly smoothing: number;

  private resizeObs: ResizeObserver;
  private intersectObs: IntersectionObserver;

  constructor(section: HTMLElement, opts?: { smoothing?: number }) {
    this.section = section;
    this.smoothing = opts?.smoothing ?? 0.14;

    // Пересчёт геометрии при любом изменении размеров секции или окна.
    this.resizeObs = new ResizeObserver(() => this.measure());
    this.resizeObs.observe(section);
    this.resizeObs.observe(document.documentElement);

    // rAF живёт только пока секция хоть чуть-чуть видна.
    this.intersectObs = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? this.start() : this.stop()),
      { threshold: 0 },
    );
    this.intersectObs.observe(section);

    this.measure();
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Абсолютная геометрия секции — один раз на resize, не в горячем цикле. */
  private measure() {
    const rect = this.section.getBoundingClientRect();
    this.sectionTop = rect.top + window.scrollY;
    // Дистанция скролла, на которой «проигрывается» таймлайн: высота секции
    // минус один экран (пока sticky-вьюпорт приклеен).
    this.scrollRange = Math.max(1, this.section.offsetHeight - window.innerHeight);
  }

  private start() {
    if (this.running) return;
    this.running = true;
    const tick = () => {
      if (!this.running) return;
      // Единственное чтение скролла за кадр.
      const y = window.scrollY - this.sectionTop;
      this.raw = Math.min(1, Math.max(0, y / this.scrollRange));

      const prev = this.progress;
      // Экспоненциальное сглаживание + «дожим» в самом конце, чтобы прогресс
      // асимптотически не зависал в 0.9999.
      this.progress += (this.raw - this.progress) * this.smoothing;
      if (Math.abs(this.raw - this.progress) < 0.0004) this.progress = this.raw;

      const frame: ScrollFrame = {
        progress: this.progress,
        raw: this.raw,
        velocity: this.progress - prev,
      };
      if (process.env.NODE_ENV !== 'production') {
        (window as any).__scroll = {
          raw: this.raw.toFixed(3),
          progress: this.progress.toFixed(3),
          top: this.sectionTop,
          range: this.scrollRange,
          listeners: this.listeners.size,
          ticks: (((window as any).__scroll?.ticks ?? 0) + 1) % 100000,
        };
      }
      this.listeners.forEach((l) => l(frame));
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stop() {
    this.running = false;
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  destroy() {
    this.stop();
    this.resizeObs.disconnect();
    this.intersectObs.disconnect();
    this.listeners.clear();
  }
}
