'use client';

import { useEffect, useState } from 'react';
import { social, type SocialComment, type SocialTarget } from '@/lib/social';
import { Avatar } from './Avatar';

const fmt = (s: string) => new Date(s).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

/** Inline comment list + composer for a TRIP or POST. */
export function CommentThread({ targetType, targetId, meId, onCountChange }: {
  targetType: SocialTarget; targetId: string; meId?: string; onCountChange?: (n: number) => void;
}) {
  const [list, setList] = useState<SocialComment[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    social.comments(targetType, targetId).then(setList).catch(() => {});
  }, [targetType, targetId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const c = await social.addComment(targetType, targetId, text.trim());
      const next = [...list, c];
      setList(next);
      onCountChange?.(next.length);
      setText('');
    } finally { setBusy(false); }
  }
  async function del(id: string) {
    await social.deleteComment(id);
    const next = list.filter((c) => c.id !== id);
    setList(next);
    onCountChange?.(next.length);
  }

  return (
    <div className="mt-3 border-t border-ink-line/60 pt-3">
      <div className="space-y-3">
        {list.length === 0 && <p className="text-sm text-paper-faint">Пока нет комментариев.</p>}
        {list.map((c) => (
          <div key={c.id} className="flex gap-2.5">
            <Avatar user={c.user} size={28} link />
            <div className="flex-1">
              <div className="text-xs text-paper-faint">{c.user.name || c.user.email} · {fmt(c.createdAt)}</div>
              <div className="text-sm text-paper">{c.text}</div>
            </div>
            {c.user.id === meId && (
              <button onClick={() => del(c.id)} className="text-xs text-paper-faint hover:text-red-300">✕</button>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60"
          placeholder="Написать комментарий…" value={text} onChange={(e) => setText(e.target.value)}
        />
        <button disabled={busy || !text.trim()} className="rounded-full bg-aurora px-4 py-2 text-sm font-medium text-aurora-fg disabled:opacity-50">→</button>
      </form>
    </div>
  );
}
