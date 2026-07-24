'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, type AuthUser } from '@/lib/auth';
import {
  createOrder,
  listMyOrders,
  refineOrder,
  type TripOrder,
  type TripOrderStatus,
} from '@/lib/api';
import { Reveal } from '@/components/ui/Reveal';

/**
 * «Заказать путешествие»: пользователь описывает пожелание своими словами →
 * ИИ конкретизирует его в структурированный бриф (можно отредактировать) →
 * заявка уходит админу. Статусы и ответ админа видны здесь же.
 */

const STATUS_RU: Record<TripOrderStatus, { label: string; cls: string }> = {
  NEW: { label: 'новая', cls: 'border-aurora/40 text-aurora' },
  IN_PROGRESS: { label: 'в работе', cls: 'border-sky-300/40 text-sky-300' },
  DONE: { label: 'готово', cls: 'border-emerald-300/40 text-emerald-300' },
  DECLINED: { label: 'отклонена', cls: 'border-red-300/40 text-red-300' },
};

const inp =
  'w-full rounded-xl border border-ink-line bg-ink px-4 py-3 text-paper placeholder:text-paper-faint outline-none focus:border-aurora/60';

export default function OrderPage() {
  const [me, setMe] = useState<AuthUser | null | undefined>(undefined);
  const [wish, setWish] = useState('');
  const [brief, setBrief] = useState<string | null>(null);
  const [aiConfigured, setAiConfigured] = useState(true);
  const [step, setStep] = useState<'wish' | 'preview' | 'sent'>('wish');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<TripOrder[]>([]);

  useEffect(() => {
    auth.me().then((u) => {
      if (!u) {
        window.location.href = '/login';
        return;
      }
      setMe(u);
      listMyOrders().then(setOrders);
    });
  }, []);

  async function toPreview() {
    setBusy(true);
    setError(null);
    const res = await refineOrder(wish);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setAiConfigured(res.data.configured);
    setBrief(res.data.brief);
    setStep('preview');
  }

  async function send() {
    setBusy(true);
    setError(null);
    const res = await createOrder(wish, brief);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStep('sent');
    setOrders((o) => [res.data, ...o]);
  }

  if (me === undefined) {
    return <main className="container-vela flex min-h-screen items-center justify-center text-paper-dim">Загрузка…</main>;
  }

  return (
    <main className="container-vela min-h-screen pb-32 pt-10">
      <header className="mb-10 flex items-center justify-between">
        <Link href="/" data-magnetic className="font-serif text-xl tracking-tightest">Vela</Link>
        <Link href="/" data-cursor="hover" className="text-sm text-paper-dim hover:text-paper">← На главную</Link>
      </header>

      <Reveal>
        <p className="mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
          <span className="h-px w-8 bg-aurora/60" />
          Под ключ
        </p>
        <h1 className="max-w-3xl font-serif display-2">Закажите путешествие</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-paper-dim">
          Опишите поездку мечты своими словами — ИИ уточнит детали и превратит их в бриф,
          а наш организатор соберёт для вас маршрут и вернётся с предложением.
        </p>
      </Reveal>

      <div className="mt-10 max-w-3xl">
        {step === 'wish' && (
          <Reveal>
            <label className="block">
              <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-paper-faint">Ваше пожелание</span>
              <textarea
                className={`${inp} min-h-[160px]`}
                value={wish}
                onChange={(e) => setWish(e.target.value)}
                placeholder="Например: хотим с женой на море в октябре дней на десять, бюджет до 250 тысяч на двоих, без долгих пересадок, любим тихие места и вкусную еду…"
              />
            </label>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
            <button
              type="button"
              disabled={busy || wish.trim().length < 10}
              onClick={toPreview}
              data-magnetic
              className="sheen glow-gold mt-6 rounded-full bg-paper px-8 py-3.5 text-sm font-medium text-ink transition-transform duration-500 hover:-translate-y-0.5 disabled:opacity-50"
            >
              {busy ? 'ИИ уточняет детали…' : 'Продолжить'}
            </button>
          </Reveal>
        )}

        {step === 'preview' && (
          <Reveal>
            <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-7">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-serif text-2xl tracking-tightest">Бриф заявки</h2>
                {brief != null && (
                  <span className="rounded-full border border-aurora/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-aurora">
                    конкретизировано ИИ
                  </span>
                )}
              </div>
              {brief != null ? (
                <>
                  <p className="mt-3 text-sm text-paper-faint">
                    Проверьте и поправьте, если нужно, — это увидит организатор вместе с вашим
                    исходным текстом.
                  </p>
                  <textarea
                    className={`${inp} mt-4 min-h-[220px] font-mono text-sm leading-relaxed`}
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                  />
                </>
              ) : (
                <p className="mt-3 text-sm text-paper-dim">
                  {aiConfigured
                    ? 'ИИ сейчас недоступен — заявка уйдёт с вашим текстом как есть, организатор уточнит детали сам.'
                    : 'ИИ-конкретизация не подключена — заявка уйдёт с вашим текстом как есть.'}
                </p>
              )}
              <div className="mt-4 rounded-xl border border-ink-line p-4 text-sm text-paper-dim">
                <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-paper-faint">Ваш текст</span>
                {wish}
              </div>
              {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  disabled={busy}
                  onClick={send}
                  data-magnetic
                  className="sheen glow-gold rounded-full bg-aurora px-8 py-3.5 text-sm font-medium text-aurora-fg transition-transform duration-500 hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {busy ? 'Отправляем…' : 'Отправить заявку'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('wish')}
                  className="text-sm text-paper-dim hover:text-paper"
                >
                  ← Изменить пожелание
                </button>
              </div>
            </div>
          </Reveal>
        )}

        {step === 'sent' && (
          <Reveal>
            <div className="rounded-2xl border border-emerald-300/30 bg-emerald-300/5 p-7">
              <h2 className="font-serif text-2xl tracking-tightest">Заявка отправлена</h2>
              <p className="mt-3 text-paper-dim">
                Организатор изучит пожелание и вернётся с предложением — статус будет виден ниже.
              </p>
              <button
                type="button"
                onClick={() => {
                  setWish('');
                  setBrief(null);
                  setStep('wish');
                }}
                className="mt-5 text-sm text-aurora hover:underline"
              >
                Заказать ещё одно путешествие →
              </button>
            </div>
          </Reveal>
        )}
      </div>

      {/* Мои заявки */}
      {orders.length > 0 && (
        <section className="mt-16 max-w-3xl">
          <h2 className="mb-6 font-serif text-2xl tracking-tightest">Мои заявки</h2>
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-paper-faint">
                    {new Date(o.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_RU[o.status].cls}`}>
                    {STATUS_RU[o.status].label}
                  </span>
                </div>
                <p className="mt-3 text-paper-dim">{o.wish}</p>
                {o.brief && (
                  <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-ink-line p-4 font-mono text-xs leading-relaxed text-paper-dim">
                    {o.brief}
                  </pre>
                )}
                {o.adminNote && (
                  <div className="mt-3 rounded-xl border border-aurora/25 bg-aurora/5 p-4 text-sm text-paper">
                    <span className="mb-1 block text-xs uppercase tracking-[0.2em] text-aurora">Ответ организатора</span>
                    {o.adminNote}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
