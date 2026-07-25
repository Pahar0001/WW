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
 * Дополнительно:
 *  - порог MIN_STEP отсекает микросдвиги меньше кадра (перерисовка того же
 *    кадра — бессмысленная работа GPU);
 *  - fastSeek() (где поддержан) для больших прыжков — сик к ближайшему
 *    keyframe на порядок дешевле точного;
 *  - видео закодировано с keyframe каждые 12 кадров (см. public/hero) —
 *    именно это делает обратную перемотку такой же плавной, как прямую.
 */

const MIN_STEP = 1 / 50; // секунд: меньше кадра (~30fps) не перематываем
const FAST_SEEK_JUMP = 1.25; // прыжки крупнее — через fastSeek (по keyframe)

export class VideoScrubber {
  private video: HTMLVideoElement;
  private duration = 0;
  private seeking = false;
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
  };

  constructor(video: HTMLVideoElement) {
    this.video = video;
    this.duration = video.duration || 0;
    video.addEventListener('loadedmetadata', this.onMeta);
    video.addEventListener('seeked', this.onSeeked);
    // Видео управляется только скроллом — никакого автоплея по времени.
    video.pause();
  }

  /** Прогресс 0..1 → время видео. Вызывается из rAF ScrollController'а. */
  setProgress(p: number) {
    if (!this.duration) return;
    // Крошечный отступ от конца: время == duration у части браузеров
    // показывает чёрный кадр после последнего GOP.
    const t = Math.min(this.duration - 0.05, Math.max(0, p * this.duration));
    if (Math.abs(t - this.lastApplied) < MIN_STEP) return;
    if (this.seeking) {
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
    this.lastApplied = t;
    const jump = Math.abs(t - this.video.currentTime);
    if (jump > FAST_SEEK_JUMP && typeof this.video.fastSeek === 'function') {
      this.video.fastSeek(t);
    } else {
      this.video.currentTime = t;
    }
  }

  destroy() {
    this.video.removeEventListener('loadedmetadata', this.onMeta);
    this.video.removeEventListener('seeked', this.onSeeked);
  }
}
