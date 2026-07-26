'use client';

/**
 * Кнопка записи голосового сообщения (MediaRecorder).
 *
 * Тап — запись пошла (пульс + таймер), повторный тап — стоп: файл уходит в
 * /api/uploads, наружу отдаётся uploadId. Крестик во время записи — отмена.
 * Кружки (VIDEO_NOTE) добавятся тем же путём с video-потоком.
 */

import { useEffect, useRef, useState } from 'react';
import { authHeaders } from '@/lib/auth';

const MAX_SEC = 120; // потолок длительности — 2 минуты

function pickMime(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c)) return c;
  }
  return '';
}

export function VoiceRecorder({
  disabled,
  onRecorded,
  onError,
}: {
  disabled?: boolean;
  /** Файл загружен: uploadId для отправки сообщения kind=VOICE. */
  onRecorded: (uploadId: string, durationSec: number) => void;
  onError: (message: string) => void;
}) {
  const [state, setState] = useState<'idle' | 'recording' | 'uploading'>('idle');
  const [sec, setSec] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const cancelled = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  // Длительность в ref: onstop — замыкание момента start, state там устарел.
  const secRef = useRef(0);

  useEffect(
    () => () => {
      // Уход со страницы во время записи: гасим дорожку микрофона.
      rec.current?.stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined';
  if (!supported) return null;

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      cancelled.current = false;
      r.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (timer.current) clearInterval(timer.current);
        const dur = secRef.current;
        if (cancelled.current || chunks.current.length === 0) {
          setState('idle');
          setSec(0);
          return;
        }
        setState('uploading');
        try {
          const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
          const fd = new FormData();
          const ext = (r.mimeType || 'audio/webm').includes('mp4') ? 'm4a' : 'webm';
          fd.append('file', blob, `voice.${ext}`);
          const res = await fetch('/api/uploads', { method: 'POST', body: fd, headers: authHeaders() });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as { path: string };
          // path вида "/uploads/<id>" — сообщению нужен только id.
          const uploadId = data.path.split('/').pop()!;
          onRecorded(uploadId, dur);
        } catch (e) {
          onError(`Не удалось отправить голосовое: ${(e as Error).message}`);
        } finally {
          setState('idle');
          setSec(0);
        }
      };
      rec.current = r;
      r.start(250);
      setSec(0);
      setState('recording');
      secRef.current = 0;
      timer.current = setInterval(() => {
        secRef.current += 1;
        setSec(secRef.current);
        if (secRef.current >= MAX_SEC) stop(false);
      }, 1000);
    } catch {
      onError('Микрофон недоступен: разрешите доступ в настройках браузера.');
    }
  }

  function stop(cancel: boolean) {
    cancelled.current = cancel;
    rec.current?.stop();
  }

  if (state === 'uploading') {
    return (
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-ink-line text-paper-faint">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-aurora border-t-transparent" />
      </span>
    );
  }

  if (state === 'recording') {
    return (
      <span className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => stop(true)}
          aria-label="Отменить запись"
          className="grid h-11 w-9 place-items-center rounded-xl text-paper-faint hover:text-red-400"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
        <button
          onClick={() => stop(false)}
          aria-label="Остановить и отправить"
          className="relative grid h-11 w-16 shrink-0 place-items-center rounded-xl bg-red-500/90 text-white"
        >
          <span className="absolute inset-0 animate-pulse rounded-xl bg-red-400/30" />
          <span className="relative text-xs font-medium tabular-nums">
            {Math.floor(sec / 60)}:{String(sec % 60).padStart(2, '0')} ■
          </span>
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={start}
      disabled={disabled}
      aria-label="Записать голосовое"
      title="Голосовое сообщение"
      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-ink-line text-paper-dim transition-colors hover:border-aurora/50 hover:text-aurora disabled:opacity-40"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 013 3v6a3 3 0 01-6 0V5a3 3 0 013-3zM19 10v1a7 7 0 01-14 0v-1M12 18v4M8 22h8" />
      </svg>
    </button>
  );
}
