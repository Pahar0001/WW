'use client';

import { useState } from 'react';
import { hasSession } from '@/lib/auth';
import {
  createServiceRequest,
  type LogisticsPlan,
  type ServiceRequestKind,
} from '@/lib/logistics';

/**
 * Трансфер до аэропорта и бронь парковки — с оформлением на сайте.
 *
 * До этого раздел советовал: «заранее заказанный трансфер дешевле ночного
 * такси». Совет верный, но сделать по нему нельзя ничего — человек уходил
 * искать сам и обычно не возвращался. Здесь появляется само действие.
 *
 * Три пути, по убыванию удобства, и все три честно подписаны:
 *  1. ВИДЖЕТ партнёра — поиск и оплата прямо здесь. Появляется, только если
 *     задан `KIWITAXI_WL_URL`; иначе блока просто нет (§1 мягкая деградация).
 *  2. ССЫЛКА к перевозчику с подставленным аэропортом и датой.
 *  3. ЗАЯВКА нам — работает всегда и ни от каких партнёров не зависит.
 *
 * ⚠️ Цен трансфера мы не показываем НИГДЕ. Они зависят от класса машины, часа
 * подачи и расстояния; «от 2500 ₽» жило бы до первого клика. Цену человек
 * видит там, где её знают.
 */

const KIND_LABEL: Record<ServiceRequestKind, string> = {
  TRANSFER_TO_AIRPORT: 'Машина в аэропорт',
  TRANSFER_FROM_AIRPORT: 'Встретить по возвращении',
  PARKING: 'Место на парковке',
};

const KIND_HINT: Record<ServiceRequestKind, string> = {
  TRANSFER_TO_AIRPORT: 'Заберём из дома и довезём к вылету — удобно на ранний рейс.',
  TRANSFER_FROM_AIRPORT: 'Водитель встретит в зале прилёта, даже если рейс сел ночью.',
  PARKING: 'Займём место на долгосрочной парковке к вашим датам.',
};

export function TransferBooking({
  plan,
  depart,
  ret,
  widgetUrl,
}: {
  plan: LogisticsPlan;
  depart: string;
  ret: string;
  /**
   * Адрес виджета. Приходит со страницы, а не из API: тем же значением задан
   * `frame-src` в CSP, и держать их в разных сервисах — верный способ однажды
   * получить пустой прямоугольник без единой ошибки в консоли (§12.15).
   */
  widgetUrl: string | null;
}) {
  const { transfer } = plan;
  const airport = plan.origin.airports[0];
  const [kind, setKind] = useState<ServiceRequestKind>('TRANSFER_TO_AIRPORT');
  const [open, setOpen] = useState(false);

  if (!airport) return null;

  return (
    <section className="rounded-2xl border border-ink-line bg-ink-soft/40 p-6 sm:p-7">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-2xl tracking-tightest">Трансфер и парковка</h3>
        <span className="text-sm text-paper-faint">
          {airport.name} · {airport.iata}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-paper-faint">
        Как доехать до вылета и куда деть машину, пока вас нет
      </p>

      {/* 1. Виджет партнёра: оформление целиком на нашей странице. */}
      {widgetUrl && (
        <div className="mt-6 overflow-hidden rounded-xl border border-ink-line/70">
          <iframe
            src={widgetUrl}
            title="Заказ трансфера"
            className="h-[520px] w-full"
            loading="lazy"
            // Виджет чужой: не даём ему ни доступ к нашему окну, ни лишних прав.
            sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}

      {/* 2. Ссылки к перевозчикам — работают всегда. */}
      <div className="mt-6">
        <h4 className="text-xs uppercase tracking-[0.22em] text-paper-faint">
          {widgetUrl ? 'Другие перевозчики' : 'Заказать у перевозчика'}
        </h4>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {transfer.links.map((l) => (
            <li key={l.provider} className="rounded-xl border border-ink-line/70 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-paper">{l.label}</span>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap text-xs text-aurora hover:underline"
                >
                  Заказать →
                </a>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-paper-faint">{l.note}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed text-paper-faint">
          Аэропорт и дата подставлены заранее. Цену показывает перевозчик — она зависит от класса
          машины и часа подачи, и придумывать её мы не станем.
        </p>
      </div>

      {/* 3. Заявка нам. */}
      <div className="mt-7 border-t border-ink-line/60 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-sm text-paper">Или поручите это нам</h4>
            <p className="mt-1 text-xs leading-relaxed text-paper-faint">
              Оставьте заявку — подберём машину или место на парковке и ответим на почту аккаунта.
            </p>
          </div>
          <button
            type="button"
            data-cursor="hover"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full border border-ink-line px-5 py-2 text-sm text-paper-dim transition-colors hover:border-aurora/40 hover:text-paper"
          >
            {open ? 'Свернуть' : 'Оставить заявку'}
          </button>
        </div>

        {open && (
          <div className="mt-5">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(KIND_LABEL) as ServiceRequestKind[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  data-cursor="hover"
                  onClick={() => setKind(k)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    k === kind
                      ? 'border-aurora bg-aurora/10 text-aurora'
                      : 'border-ink-line text-paper-dim hover:text-paper'
                  }`}
                >
                  {KIND_LABEL[k]}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-xs text-paper-faint">{KIND_HINT[kind]}</p>

            <RequestForm
              key={kind}
              kind={kind}
              tripSlug={plan.trip.slug}
              airportIata={airport.iata}
              // Машина в аэропорт нужна в день вылета, встреча — в день возвращения.
              defaultDate={kind === 'TRANSFER_FROM_AIRPORT' ? ret : depart}
            />
          </div>
        )}
      </div>
    </section>
  );
}

/**
 * Форма заявки.
 *
 * ⚠️ Персональные данные. Адрес подачи и телефон — необязательные поля, и об
 * этом прямо написано рядом: заявку примут и без них, связь пойдёт по почте
 * аккаунта. Собирать адрес «на всякий случай» нельзя — его потом придётся
 * хранить, показывать в выгрузке данных и удалять по требованию.
 */
function RequestForm({
  kind,
  tripSlug,
  airportIata,
  defaultDate,
}: {
  kind: ServiceRequestKind;
  tripSlug: string;
  airportIata: string;
  defaultDate: string;
}) {
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [pax, setPax] = useState(2);
  const [pickup, setPickup] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const authed = hasSession();
  const isParking = kind === 'PARKING';

  const inp =
    'w-full rounded-lg border border-ink-line bg-ink px-3 py-2 text-sm text-paper outline-none focus:border-aurora/60 [color-scheme:dark]';

  const submit = async () => {
    setState('sending');
    setError(null);
    const res = await createServiceRequest({
      kind,
      tripSlug,
      airportIata,
      serviceDate: date,
      serviceTime: time || undefined,
      pax,
      pickup: pickup || undefined,
      phone: phone || undefined,
      comment: comment || undefined,
    });
    if (res.ok) {
      setState('sent');
    } else {
      setState('idle');
      setError(res.error);
    }
  };

  if (state === 'sent') {
    return (
      <p className="mt-5 rounded-xl border border-emerald-300/30 bg-emerald-300/[0.06] px-4 py-3 text-sm leading-relaxed text-paper-dim">
        Заявка принята. Ответим на почту вашего аккаунта — обычно в течение дня.
      </p>
    );
  }

  return (
    <div className="mt-5 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">
            {isParking ? 'С какого дня' : 'Дата'}
          </span>
          <input
            type="date"
            className={inp}
            value={date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">
            Время {isParking ? 'заезда' : 'подачи'}
          </span>
          <input
            type="time"
            className={inp}
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">
            {isParking ? 'Мест' : 'Пассажиров'}
          </span>
          <input
            type="number"
            min={1}
            max={20}
            className={inp}
            value={pax}
            onChange={(e) => setPax(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">
          {isParking ? 'Марка и номер машины' : 'Откуда забрать'}{' '}
          <span className="tracking-normal normal-case text-paper-faint/70">— необязательно</span>
        </span>
        <input
          type="text"
          className={inp}
          value={pickup}
          maxLength={300}
          placeholder={isParking ? 'Например: Skoda Octavia, А123ВС777' : 'Адрес или ориентир'}
          onChange={(e) => setPickup(e.target.value)}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">
            Телефон{' '}
            <span className="tracking-normal normal-case text-paper-faint/70">— необязательно</span>
          </span>
          <input
            type="tel"
            className={inp}
            value={phone}
            maxLength={32}
            placeholder="Если удобнее, чем почта"
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-[0.2em] text-paper-faint">
            Комментарий
          </span>
          <input
            type="text"
            className={inp}
            value={comment}
            maxLength={1000}
            placeholder="Детское кресло, много багажа…"
            onChange={(e) => setComment(e.target.value)}
          />
        </label>
      </div>

      <p className="text-xs leading-relaxed text-paper-faint">
        Адрес и телефон необязательны — без них заявку тоже примем, ответ придёт на почту аккаунта.
        Что мы храним и как это удалить — в{' '}
        <a href="/privacy" className="text-aurora hover:underline">
          политике конфиденциальности
        </a>
        .
      </p>

      {error && (
        <p className="rounded-lg border border-amber-400/30 bg-amber-400/[0.05] px-3 py-2 text-sm text-amber-200">
          {error}
        </p>
      )}

      {!authed && (
        <p className="text-xs leading-relaxed text-paper-faint">
          Заявку принимаем от вошедших:{' '}
          <a href="/login" className="text-aurora hover:underline">
            войдите
          </a>{' '}
          — иначе нам некуда прислать ответ.
        </p>
      )}

      <button
        type="button"
        data-magnetic
        disabled={state === 'sending' || !date || !authed}
        onClick={submit}
        className="rounded-full bg-paper px-6 py-2.5 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {state === 'sending' ? 'Отправляем…' : 'Отправить заявку'}
      </button>
    </div>
  );
}
