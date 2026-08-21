import Link from 'next/link';
import type { Trip } from '@/lib/api';
import { sizedImageUrl } from '@/lib/api';
import { ButtonLink } from '@/components/ui/Button';
import { FadeIn } from '@/components/ui/Motion';

// Редакционный hero (референс Maison Sarah Lavoine): крупная антиква-типографика
// поверх настоящего фото маршрута, спокойная премиальность вместо видео/3D-глобуса.
// Фон — реальная обложка «маршрута недели» из данных платформы (без внешних
// зависимостей); при отсутствии фото — мягкий атмосферный фолбэк.
export function HeroEditorial({ featured }: { featured: Trip | null }) {
  const cover = featured ? sizedImageUrl(featured.heroImage, 2000) : null;

  return (
    <section className="relative isolate flex min-h-[92svh] items-end overflow-hidden">
      {/* Фон */}
      <div className="absolute inset-0 -z-10">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={featured?.title ?? ''}
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-ink-soft" />
        )}
        {/* Градиент под текст + тёплая кинематографичная виньетка */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_90%_at_10%_100%,transparent_42%,rgba(0,0,0,0.42))]" />
      </div>

      <div className="container-vela pb-16 pt-40 md:pb-24">
        <FadeIn>
          <p className="font-sans text-[0.72rem] font-medium uppercase tracking-[0.28em] text-white/75">
            Vela · Путешествия по России и миру
          </p>
        </FadeIn>

        <FadeIn delay={0.08}>
          <h1 className="mt-5 max-w-4xl text-balance font-serif text-[clamp(2.6rem,6.4vw,5.4rem)] font-medium leading-[0.98] tracking-tightest text-white">
            Соберите путешествие,
            <br className="hidden sm:block" /> которое станет{' '}
            <span className="text-gold-gradient">историей</span>.
          </h1>
        </FadeIn>

        <FadeIn delay={0.18}>
          <p className="mt-6 max-w-xl font-sans text-lg leading-relaxed text-white/85">
            От Камчатки до Стамбула — маршруты на честных данных, без вымысла.
            Собираем поездку под вас за минуты.
          </p>
        </FadeIn>

        <FadeIn delay={0.28}>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <ButtonLink href="/trips/new" variant="gold" size="lg" withArrow magnetic>
              Собрать поездку
            </ButtonLink>
            <ButtonLink
              href="#dream-trips"
              variant="outline"
              size="lg"
              magnetic
              className="border-white/35 !text-white hover:!border-white/70"
            >
              Смотреть маршруты
            </ButtonLink>
          </div>
        </FadeIn>

        {featured && (
          <FadeIn delay={0.38}>
            <Link
              href={`/trips/${featured.slug}`}
              className="group mt-11 inline-flex flex-wrap items-center gap-3 text-sm text-white/80 transition-colors hover:text-white"
            >
              <span className="font-sans text-[0.68rem] uppercase tracking-[0.24em] text-white/60">
                Маршрут недели
              </span>
              <span className="h-4 w-px bg-white/30" />
              <span className="font-medium">{featured.title}</span>
              <span className="text-white/50">· {featured.country.name}</span>
              <span className="transition-transform duration-500 ease-smooth group-hover:translate-x-1">→</span>
            </Link>
          </FadeIn>
        )}
      </div>
    </section>
  );
}
