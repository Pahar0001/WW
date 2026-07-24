import Link from 'next/link';
import { api, imageUrl } from '@/lib/api';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { MyTrips } from '@/components/ui/MyTrips';
import { HomeMenu } from '@/components/ui/HomeMenu';
import { Marquee } from '@/components/ui/Marquee';
import { VerifyBanner } from '@/components/ui/VerifyBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Hero } from '@/components/ui/Hero';
import { Card } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { FadeIn, TextReveal } from '@/components/ui/Motion';
import { pluralize } from '@/lib/plural';

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

      {/* Заглавный экран — кинематографичный герой */}
      <Hero featured={trips[0] ?? null} tripCount={trips.length} />

      {/* Быстрое меню по разделам */}
      <HomeMenu />

      {/* Мои поездки (видно только вошедшим, у кого есть поездки) */}
      <MyTrips />

      {/* Путешествия */}
      <section id="dream-trips" className="container-vela py-24">
        <FadeIn>
          <div className="mb-12 flex items-end justify-between gap-6 border-b border-ink-line pb-6">
            <div>
              <p className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
                <span className="h-px w-8 bg-aurora/60" />
                Коллекция
              </p>
              <h2 className="display-2 font-serif">Путешествия моей мечты</h2>
            </div>
            <span className="shrink-0 text-sm text-paper-faint">{pluralize(trips.length, 'маршрут', 'маршрута', 'маршрутов')}</span>
          </div>
        </FadeIn>

        {trips.length === 0 ? (
          <EmptyState
            title="Маршрутов пока нет"
            hint="Скоро здесь появятся готовые путешествия. Загляните чуть позже или соберите свой маршрут."
            action={
              <ButtonLink href="/trips/new" variant="gold" size="md" withArrow magnetic>
                Собрать поездку
              </ButtonLink>
            }
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {trips.map((t, i) => {
              const hero = imageUrl(t.heroImage);
              return (
                <FadeIn key={t.id} delay={i * 0.06}>
                  <Card href={`/trips/${t.slug}`} className="group h-full overflow-hidden">
                    {hero && (
                      <div className="relative h-60 w-full overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={hero}
                          alt={t.title}
                          className="h-full w-full object-cover transition-transform duration-[1.4s] ease-smooth group-hover:scale-[1.06]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-ink-soft via-ink-soft/10 to-transparent" />
                        <span className="absolute left-5 top-5 rounded-full glass px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-paper">
                          {t.country.name}
                        </span>
                      </div>
                    )}
                    <div className="p-8">
                      <div className="flex items-baseline justify-between text-xs text-paper-faint">
                        <span className="uppercase tracking-[0.22em]">
                          {t.seasonLabel ?? 'Круглый год'}
                        </span>
                        <span>{t.durationDays} дней</span>
                      </div>
                      <h3 className="mt-4 font-serif text-2xl tracking-tightest text-paper md:text-3xl">
                        {t.title}
                      </h3>
                      {t.subtitle && <p className="mt-2 text-paper-dim">{t.subtitle}</p>}
                      <div className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-aurora">
                        Открыть маршрут
                        <span className="transition-transform duration-500 ease-smooth group-hover:translate-x-1">→</span>
                      </div>
                    </div>
                  </Card>
                </FadeIn>
              );
            })}

            {/* Пригласительная карточка — собрать свой маршрут (заполняет сетку) */}
            <FadeIn delay={trips.length * 0.06}>
              <Link
                href="/trips/new"
                data-magnetic
                className="group relative flex h-full min-h-[20rem] flex-col justify-between overflow-hidden rounded-2xl border border-dashed border-ink-line p-8 transition-colors duration-500 hover:border-aurora/50"
              >
                <div className="ambient-glow -right-10 -top-10 h-40 w-40 opacity-70" />
                <span className="relative grid h-12 w-12 place-items-center rounded-full bg-aurora/10 text-aurora transition-colors duration-300 group-hover:bg-aurora/20">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <div className="relative">
                  <h3 className="font-serif text-2xl tracking-tightest text-paper md:text-3xl">
                    Соберите свой маршрут
                  </h3>
                  <p className="mt-2 max-w-xs text-paper-dim">
                    По дням, под ваш темп и бюджет — с картой, отелями и календарём.
                  </p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-aurora">
                    Начать
                    <span className="transition-transform duration-500 ease-smooth group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            </FadeIn>
          </div>
        )}
      </section>

      {/* Честные данные — тизер со ссылкой на полную страницу */}
      <section id="data" className="container-vela py-24">
        <FadeIn>
          <Card variant="lux" className="relative overflow-hidden p-10 md:p-14">
            <div className="ambient-glow -right-16 -top-16 h-64 w-64 opacity-80" />
            <p className="relative mb-4 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
              <span className="h-px w-8 bg-aurora/60" />
              Честные данные
            </p>
            <h2 className="relative max-w-3xl font-serif display-2">
              <TextReveal text="Мы не выдумываем ваше путешествие." accentFrom={2} accentClassName="text-gold-gradient" />
            </h2>
            <p className="relative mt-6 max-w-2xl text-lg leading-relaxed text-paper-dim">
              Цены, расстояния, время в пути и погода берутся из реальных источников или прямо
              помечаются как <span className="text-aurora">данные уточняются</span>. У каждого
              значения видно его происхождение, уровень доверия и дату — чтобы вы всегда знали, чему
              можно верить.
            </p>
            <div className="relative mt-8">
              <ButtonLink href="/data" variant="outline" size="md" magnetic>
                Как устроены честные данные →
              </ButtonLink>
            </div>
          </Card>
        </FadeIn>
      </section>

      <footer className="container-vela border-t border-ink-line py-12 text-sm text-paper-faint">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-aurora/40 text-[13px] leading-none text-aurora">
              和
            </span>
            <span className="font-serif text-lg tracking-tightest text-paper">Vela</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/data" className="transition-colors hover:text-paper">Честные данные</Link>
            <Link href="/community" className="transition-colors hover:text-paper">Сообщество</Link>
            <Link href="/terms" className="transition-colors hover:text-paper">Соглашение</Link>
            <Link href="/trips/new" className="transition-colors hover:text-paper">Собрать поездку</Link>
          </nav>
          <span>© {new Date().getFullYear()} Vela</span>
        </div>
      </footer>
    </main>
  );
}
