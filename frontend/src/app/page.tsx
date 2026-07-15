import Link from 'next/link';
import { api, imageUrl } from '@/lib/api';
import { Reveal } from '@/components/ui/Reveal';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { MyTrips } from '@/components/ui/MyTrips';
import { HomeMenu } from '@/components/ui/HomeMenu';
import { Marquee } from '@/components/ui/Marquee';
import { VerifyBanner } from '@/components/ui/VerifyBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Constellation } from '@/components/decor/TravelDecor';

export default async function HomePage() {
  const trips = (await api.listTrips()) ?? [];

  return (
    <main className="relative min-h-screen">
      {/* Напоминание подтвердить email (видно только вошедшим без верификации) */}
      <VerifyBanner />
      {/* Навигация */}
      <SiteHeader />

      {/* Бегущая строка с ключевой информацией */}
      <Marquee />

      {/* Заглавный экран */}
      <section className="container-vela relative flex min-h-[78vh] flex-col justify-center">
        {/* Ambient travel art — a single faint constellation, kept in empty top/right space. */}
        <Constellation className="absolute right-2 top-2 hidden w-28 text-aurora/35 md:block" />
        <div className="relative z-10">
        <Reveal>
          <p className="mb-6 text-sm uppercase tracking-[0.3em] text-paper-faint">
            Премиальное планирование путешествий
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="max-w-4xl font-serif text-5xl leading-[1.05] tracking-tightest text-balance md:text-7xl">
            Путешествия,
            <br />
            которые <span className="text-aurora">запоминаются.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-paper-dim text-balance">
            Выбирайте готовые маршруты или собирайте свой по дням, смотрите каждый
            шаг на карте и понимайте бюджет — на честных данных, которые мы не
            выдумываем.
          </p>
        </Reveal>
        <Reveal delay={0.24}>
          <div className="mt-10 flex items-center gap-5">
            <a
              href="#dream-trips"
              data-magnetic
              className="group inline-flex items-center gap-4 rounded-full bg-paper py-2 pl-8 pr-2 text-ink shadow-soft-lg transition-transform duration-500 ease-smooth hover:scale-[1.02]"
            >
              <span className="text-sm font-medium tracking-wide">Все маршруты</span>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-aurora text-aurora-fg transition-transform duration-500 ease-smooth group-hover:translate-x-1">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </span>
            </a>
          </div>
        </Reveal>
        </div>
      </section>

      {/* Быстрое меню по разделам */}
      <HomeMenu />

      {/* Мои поездки (видно только вошедшим, у кого есть поездки) */}
      <MyTrips />

      {/* Путешествия */}
      <section id="dream-trips" className="container-vela py-24">
        <Reveal>
          <div className="mb-12 flex items-end justify-between border-b border-ink-line pb-6">
            <h2 className="font-serif text-3xl tracking-tightest md:text-4xl">
              Путешествия моей мечты
            </h2>
            <span className="text-sm text-paper-faint">{trips.length} маршрутов</span>
          </div>
        </Reveal>

        {trips.length === 0 ? (
          <EmptyState
            title="Маршрутов пока нет"
            hint="Скоро здесь появятся готовые путешествия. Загляните чуть позже или соберите свой маршрут."
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {trips.map((t, i) => {
              const hero = imageUrl(t.heroImage);
              return (
                <Reveal key={t.id} delay={i * 0.06}>
                  <Link
                    href={`/trips/${t.slug}`}
                    data-magnetic
                    className="group block overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/60 transition-colors duration-500 hover:border-aurora/40"
                  >
                    {hero && (
                      <div className="relative h-52 w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={hero}
                          alt={t.title}
                          className="h-full w-full object-cover opacity-80 transition-transform duration-700 ease-smooth group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-soft to-transparent" />
                      </div>
                    )}
                    <div className="p-8">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs uppercase tracking-[0.25em] text-paper-faint">
                          {t.country.name}
                        </span>
                        <span className="text-xs text-paper-faint">{t.durationDays} дней</span>
                      </div>
                      <h3 className="mt-5 font-serif text-2xl tracking-tightest md:text-3xl">
                        {t.title}
                      </h3>
                      {t.subtitle && <p className="mt-2 text-paper-dim">{t.subtitle}</p>}
                      <div className="mt-8 flex items-center gap-3 text-sm text-paper-faint">
                        {t.seasonLabel && <span>{t.seasonLabel}</span>}
                        <span className="text-aurora opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          Открыть →
                        </span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {/* Честные данные — тизер со ссылкой на полную страницу */}
      <section id="data" className="container-vela py-24">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-ink-line bg-ink-soft/40 p-10">
            <h2 className="relative font-serif text-2xl tracking-tightest md:text-3xl">
              Мы не выдумываем ваше путешествие.
            </h2>
            <p className="mt-4 max-w-2xl text-paper-dim">
              Цены, расстояния, время в пути и погода берутся из реальных источников
              или прямо помечаются как{' '}
              <span className="text-aurora">данные уточняются</span>. У каждого
              значения видно его происхождение, уровень доверия и дату — чтобы вы
              всегда знали, чему можно верить.
            </p>
            <Link
              href="/data"
              data-cursor="hover"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-aurora hover:opacity-80"
            >
              Как устроены честные данные
              <span aria-hidden>→</span>
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="container-vela border-t border-ink-line py-10 text-sm text-paper-faint">
        <div className="flex items-center justify-between">
          <span className="font-serif tracking-tightest">Vela</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </footer>
    </main>
  );
}
