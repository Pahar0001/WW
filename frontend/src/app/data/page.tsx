import Link from 'next/link';
import type { Metadata } from 'next';
import { Reveal } from '@/components/ui/Reveal';

export const metadata: Metadata = {
  title: 'Честные данные — Vela',
  description:
    'Принцип Vela: мы не выдумываем цены, расстояния, время и погоду. У каждого значения — источник, статус и дата.',
};

const STATUSES = [
  {
    label: 'Проверено',
    tag: 'VERIFIED',
    cls: 'text-emerald-600 border-emerald-500/40 dark:text-emerald-300',
    text: 'Значение взято из реального источника: официальный сайт, карта, расписание перевозчика или ссылка, которую добавил редактор. Ему можно доверять.',
  },
  {
    label: 'Оценка',
    tag: 'ESTIMATED',
    cls: 'text-aurora border-aurora/40',
    text: 'Ориентировочная величина, рассчитанная по прозрачной модели из заявленных данных (например, бюджет по типовым долям категорий). Это оценка, а не котировка поставщика.',
  },
  {
    label: 'Данные уточняются',
    tag: 'PENDING',
    cls: 'text-amber-600 border-amber-500/40 dark:text-amber-300',
    text: 'Точного значения пока нет. Мы не подставляем правдоподобное число вместо реального — поле честно помечено как незаполненное.',
  },
];

const PRINCIPLES = [
  {
    title: 'Не выдумываем цифры',
    text: 'Цены, расстояния, время в пути и погода берутся из реальных источников. Если данных нет — мы не сочиняем правдоподобное число.',
  },
  {
    title: 'Неизвестное помечаем',
    text: 'То, что пока неизвестно, получает статус «данные уточняются» вместо выдуманного значения. Пустое поле честнее ложного.',
  },
  {
    title: 'Бюджет — это оценка',
    text: 'Суммы бюджета и «примерные траты» — прозрачные оценки из заявленного диапазона и типовых ставок, а не цена от поставщика.',
  },
  {
    title: 'Видно происхождение',
    text: 'У значений с провенансом виден источник, ссылка, уровень доверия и дата получения — чтобы вы знали, чему верить.',
  },
];

const PROVENANCE = [
  { field: 'Источник', desc: 'откуда взято значение (сайт, карта, редактор)' },
  { field: 'Ссылка', desc: 'прямой URL на первоисточник, если есть' },
  { field: 'Статус', desc: 'проверено / оценка / данные уточняются' },
  { field: 'Уровень доверия', desc: 'насколько надёжен источник (1–5)' },
  { field: 'Дата', desc: 'когда значение было получено или обновлено' },
];

export default function HonestDataPage() {
  return (
    <main className="relative min-h-screen pb-28 md:pb-16">
      <header className="container-vela flex items-center justify-between py-7">
        <Link href="/" data-magnetic className="flex items-center gap-2 font-serif text-xl tracking-tightest">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-aurora/40 text-[12px] leading-none text-aurora">和</span>
          Vela
        </Link>
        <Link href="/" data-cursor="hover" className="text-sm text-paper-dim hover:text-paper">
          ← На главную
        </Link>
      </header>

      {/* Hero */}
      <section className="container-vela max-w-3xl pt-8">
        <Reveal>
          <p className="text-sm uppercase tracking-[0.3em] text-paper-faint">Принцип Vela</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-5 font-serif text-4xl leading-[1.08] tracking-tightest text-balance md:text-6xl">
            Мы не выдумываем ваше <span className="text-aurora">путешествие</span>.
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-6 text-lg leading-relaxed text-paper-dim text-balance">
            Большинство сервисов показывают красивые, но выдуманные цифры. Vela устроена иначе:
            цены, расстояния, время и погода либо взяты из реальных источников, либо честно
            помечены как неизвестные. У каждого значения видно, откуда оно и насколько ему можно
            доверять.
          </p>
        </Reveal>
      </section>

      {/* Принципы */}
      <section className="container-vela mt-20">
        <Reveal>
          <h2 className="font-serif text-2xl tracking-tightest md:text-3xl">Как это работает</h2>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-ink-line bg-ink-soft/50 p-7">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-aurora/10 font-serif text-aurora">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-medium text-paper">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-paper-dim">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Три статуса */}
      <section className="container-vela mt-20">
        <Reveal>
          <h2 className="font-serif text-2xl tracking-tightest md:text-3xl">Три статуса данных</h2>
          <p className="mt-3 max-w-2xl text-paper-dim">
            Каждое значение на сайте помечено одним из трёх статусов — вы всегда видите, что перед
            вами: факт, оценка или пропуск.
          </p>
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STATUSES.map((s, i) => (
            <Reveal key={s.tag} delay={i * 0.05}>
              <div className="h-full rounded-2xl border border-ink-line bg-ink-soft/50 p-7">
                <span className={`inline-block rounded-full border px-3 py-1 text-xs uppercase tracking-wider ${s.cls}`}>
                  {s.label}
                </span>
                <p className="mt-4 leading-relaxed text-paper-dim">{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Провенанс */}
      <section className="container-vela mt-20">
        <Reveal>
          <div className="rounded-2xl border border-ink-line bg-ink-soft/50 p-8 md:p-10">
            <h2 className="font-serif text-2xl tracking-tightest md:text-3xl">
              Происхождение каждого значения
            </h2>
            <p className="mt-3 max-w-2xl text-paper-dim">
              У ключевых данных — мест, переездов, бюджетных строк, сезонности — хранится провенанс.
              Это набор полей, который отвечает на вопрос «откуда вы это взяли?»:
            </p>
            <div className="mt-7 divide-y divide-ink-line">
              {PROVENANCE.map((p) => (
                <div key={p.field} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:gap-6">
                  <span className="w-40 shrink-0 font-medium text-paper">{p.field}</span>
                  <span className="text-paper-dim">{p.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* Бюджет и траты */}
      <section className="container-vela mt-20">
        <div className="grid gap-4 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-ink-line bg-ink-soft/50 p-7">
              <h3 className="font-serif text-xl tracking-tightest">Бюджет поездки</h3>
              <p className="mt-3 leading-relaxed text-paper-dim">
                Разбивка бюджета по категориям — это <span className="text-aurora">оценка</span> из
                заявленного диапазона по прозрачным долям, а не цена от поставщиков. Реальные цены
                появятся после подключения провайдеров бронирования.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.05}>
            <div className="h-full rounded-2xl border border-ink-line bg-ink-soft/50 p-7">
              <h3 className="font-serif text-xl tracking-tightest">Примерные траты</h3>
              <p className="mt-3 leading-relaxed text-paper-dim">
                Расчёт трат считается автоматически из длительности, числа городов, количества
                путешественников и уровня комфорта по типовым дневным ставкам. Это{' '}
                <span className="text-aurora">ориентир</span>, а не котировка.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Исключение */}
      <section className="container-vela mt-20 max-w-3xl">
        <Reveal>
          <p className="text-paper-dim">
            <span className="font-medium text-paper">Исключение — ваш контент.</span> Правило про
            «не выдумывать» касается фактических данных о поездке. Ваши посты, комментарии,
            впечатления и советы в сообществе — это личный опыт, а не справочные цифры, и под это
            правило не подпадают.
          </p>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="container-vela mt-16">
        <Reveal>
          <Link
            href="/#dream-trips"
            data-magnetic
            className="group inline-flex items-center gap-4 rounded-full bg-paper py-2 pl-8 pr-2 text-ink shadow-soft-lg transition-transform duration-500 ease-smooth hover:scale-[1.02]"
          >
            <span className="text-sm font-medium tracking-wide">Смотреть маршруты</span>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-aurora text-aurora-fg transition-transform duration-500 ease-smooth group-hover:translate-x-1">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
          </Link>
        </Reveal>
      </section>
    </main>
  );
}
