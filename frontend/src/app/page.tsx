import Link from 'next/link';
import { api, imageUrl } from '@/lib/api';
import { Reveal } from '@/components/ui/Reveal';
import { AccountNav } from '@/components/ui/AccountNav';

export default async function HomePage() {
  const trips = (await api.listTrips()) ?? [];

  return (
    <main className="relative min-h-screen">
      {/* Навигация */}
      <header className="container-vela flex items-center justify-between py-7">
        <span className="font-serif text-xl tracking-tightest" data-magnetic>
          Vela
        </span>
        <nav className="flex items-center gap-8 text-sm text-paper-dim">
          <a href="#dream-trips" data-cursor="hover" className="transition-colors hover:text-paper">
            Путешествия
          </a>
          <a href="#data" data-cursor="hover" className="transition-colors hover:text-paper">
            Честные данные
          </a>
          <AccountNav />
        </nav>
      </header>

      {/* Заглавный экран */}
      <section className="container-vela flex min-h-[78vh] flex-col justify-center">
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
            <Link
              href="/trips/china-floating-mountains"
              data-magnetic
              className="rounded-full bg-paper px-7 py-3.5 text-sm font-medium text-ink transition-transform duration-500 ease-smooth hover:scale-[1.03]"
            >
              Открыть «Китай 2027»
            </Link>
            <a href="#dream-trips" data-cursor="hover" className="text-sm text-paper-dim hover:text-paper">
              Все маршруты →
            </a>
          </div>
        </Reveal>
      </section>

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
          <p className="text-paper-dim">
            Пока нет маршрутов или API недоступен. Запустите backend и сидирование,
            чтобы увидеть{' '}
            <span className="text-paper">«Китай — Парящие горы»</span>.
          </p>
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

      {/* Честные данные */}
      <section id="data" className="container-vela py-24">
        <Reveal>
          <div className="rounded-2xl border border-ink-line bg-ink-soft/40 p-10">
            <h2 className="font-serif text-2xl tracking-tightest md:text-3xl">
              Мы не выдумываем ваше путешествие.
            </h2>
            <p className="mt-4 max-w-2xl text-paper-dim">
              Цены, расстояния, время в пути и погода берутся из реальных источников
              или прямо помечаются как{' '}
              <span className="text-aurora">данные уточняются</span>. У каждого
              значения видно его происхождение, уровень доверия и дату — чтобы вы
              всегда знали, чему можно верить.
            </p>
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
