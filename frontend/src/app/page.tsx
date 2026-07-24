import Link from 'next/link';
import { api } from '@/lib/api';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { MyTrips } from '@/components/ui/MyTrips';
import { HomeMenu } from '@/components/ui/HomeMenu';
import { Marquee } from '@/components/ui/Marquee';
import { VerifyBanner } from '@/components/ui/VerifyBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Hero } from '@/components/ui/Hero';
import { Card } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { TripCollection } from '@/components/ui/TripCollection';
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
          <TripCollection trips={trips} />
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
