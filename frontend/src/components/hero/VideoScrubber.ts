/**
 * VideoScrubber — превращает прогресс 0..1 в currentTime видео БЕЗ рывков.
 *
 * Почему нельзя просто писать video.currentTime каждый кадр:
 *  - установка currentTime запускает асинхронный seek в декодере; если слать
 *    новые значения, пока предыдущий seek не завершён, браузер начинает
 *    отбрасывать/копить работу — картинка дёргается и «плывёт» с опозданием.
 *
 * Решение — «серийный» сик с очередью из одного элемента:
 *  - пока идёт seek (между заданием currentTime и событием 'seeked'),
 *    новое значение только запоминается в pending;
 *  - по 'seeked' немедленно применяется последнее pending — декодер всегда
 *    занят ровно одним самым свежим кадром, ничего не копится.
 *
 * Устойчивость (важно для больших файлов, когда цель сика ещё не в буфере):
 *  - ВОТЧДОГ: если 'seeked' не пришёл за WATCHDOG_MS (сик в недокачанную
 *    зону, потерянное событие, remount в dev) — состояние сбрасывается и
 *    самое свежее значение применяется заново. Без этого один «тихо»
 *    зависший сик замораживал видео навсегда.
 *  - fastSeek используется ТОЛЬКО внутри уже буферизованных диапазонов:
 *    за их пределами точный currentTime надёжнее (fastSeek за буфером
 *    в части браузеров ведёт себя непредсказуемо).
 *  - Видео закодировано с частыми keyframes (public/hero) — именно это
 *    делает обратную перемотку такой же плавной, как прямую.
 */

const MIN_STEP = 1 / 50; // секунд: меньше кадра не перематываем
const FAST_SEEK_JUMP = 1.25; // прыжки крупнее — через fastSeek (по keyframe)
const WATCHDOG_MS = 900; // сик без 'seeked' дольше этого — принудительный сброс

export class VideoScrubber {
  private video: HTMLVideoElement;
  private duration = 0;
  private seeking = false;
  private seekStartedAt = 0;
  private pending: number | null = null;
  private lastApplied = -1;
  private readonly onSeeked = () => {
    this.seeking = false;
    if (this.pending != null) {
      const t = this.pending;
      this.pending = null;
      this.apply(t);
    }
  };
  private readonly onMeta = () => {
    this.duration = this.video.duration || 0;
    // Метаданные могли прийти позже первого скролла — допинываем pending.
    this.onSeeked();
  };

  constructor(video: HTMLVideoElement) {
    this.video = video;
    this.duration = video.duration || 0;
    video.addEventListener('loadedmetadata', this.onMeta);
    video.addEventListener('canplay', this.onMeta);
    video.addEventListener('seeked', this.onSeeked);
    // Видео управляется только скроллом — никакого автоплея по времени.
    video.pause();
  }

  /** Цель сика внутри уже докачанного диапазона? */
  private buffered(t: number): boolean {
    const b = this.video.buffered;
    for (let i = 0; i < b.length; i++) {
      if (t >= b.start(i) && t <= b.end(i)) return true;
    }
    return false;
  }

  /** Прогресс 0..1 → время видео. Вызывается из rAF ScrollController'а. */
  setProgress(p: number) {
    if (!this.duration) this.duration = this.video.duration || 0;
    if (!this.duration) return;
    // Крошечный отступ от конца: время == duration у части браузеров
    // показывает чёрный кадр после последнего GOP.
    const t = Math.min(this.duration - 0.05, Math.max(0, p * this.duration));
    if (Math.abs(t - this.lastApplied) < MIN_STEP) return;
    if (this.seeking) {
      // Вотчдог: «тихо» зависший сик не должен замораживать видео.
      if (performance.now() - this.seekStartedAt > WATCHDOG_MS) {
        this.seeking = false;
        this.pending = null;
        this.apply(t);
        return;
      }
      this.pending = t; // декодер занят — запоминаем только самое свежее
      return;
    }
    this.apply(t);
  }

  private apply(t: number) {
    // Не сикаем, пока нет данных даже для отрисовки текущего кадра.
    if (this.video.readyState < 2) {
      this.pending = t;
      return;
    }
    this.seeking = true;
    this.seekStartedAt = performance.now();
    this.lastApplied = t;
    const jump = Math.abs(t - this.video.currentTime);
    if (jump > FAST_SEEK_JUMP && this.buffered(t) && typeof this.video.fastSeek === 'function') {
      this.video.fastSeek(t);
    } else {
      this.video.currentTime = t;
    }
  }

  destroy() {
    this.video.removeEventListener('loadedmetadata', this.onMeta);
    this.video.removeEventListener('canplay', this.onMeta);
    this.video.removeEventListener('seeked', this.onSeeked);
  }
}
