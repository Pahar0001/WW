import Link from 'next/link';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { api, type Trip } from '@/lib/api';
import { TripLogistics } from '@/components/trip/logistics/TripLogistics';
// Общий CommonJS-модуль: тот же файл читает next.config.js, который импортировать
// TypeScript не умеет. Один список хостов на политику и на страницу.
import { isAllowedWidgetUrl } from '@/lib/widget-hosts';

/**
 * «Логистика путешествия» — отдельная страница поездки.
 *
 * Почему отдельной страницей, а не блоком на странице маршрута: маршрут отвечает
 * «что я увижу», логистика — «как я туда доберусь». Это разные задачи и разные
 * моменты подготовки; сложенные в одну ленту, они делают её неподъёмной.
 *
 * Данные грузит клиентский компонент: они зависят от города вылета и дат, а те
 * живут в состоянии страницы. На сервере рисуем шапку и факты о поездке.
 */

/**
 * Адрес виджета заказа трансфера.
 *
 * ⚠️ Читается ЗДЕСЬ, на веб-сервисе, а не приходит из API: фрейм и политика,
 * которая его пропускает, обязаны жить в одном месте (§12.15).
 *
 * Адрес сверяется с тем же списком хостов, из которого собран `frame-src`
 * (`src/lib/widget-hosts.js`). Это не формальность: адрес с чужого домена CSP
 * всё равно заблокирует, но заблокирует МОЛЧА — пустой прямоугольник и ни
 * одной улики. Лучше честно не показать виджет, чем показать мёртвый.
 */
function transferWidgetUrl(): string | null {
  const raw = process.env.KIWITAXI_WL_URL?.trim();
  if (!raw) return null;
  if (!isAllowedWidgetUrl(raw)) {
    // Разворачиваем тихую поломку в громкую: это видно в логах сервиса.
    console.warn(
      `[logistics] KIWITAXI_WL_URL="${raw}" — хост не в списке разрешённых для фрейма ` +
        `(frontend/src/lib/widget-hosts.js). Виджет скрыт, чтобы не показывать пустой блок.`,
    );
    return null;
  }
  return raw;
}

async function loadTrip(slug: string): Promise<Trip | null> {
  // Как и на странице поездки: cookie нужна, чтобы участник приватного
  // маршрута увидел свою логистику при отрисовке на сервере.
  const token = cookies().get('vela_token')?.value;
  try {
    return await api.getTrip(slug, token);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const trip = await loadTrip(params.slug);
  if (!trip) return { title: 'Логистика — Vela' };
  return {
    title: `Логистика: ${trip.title} — Vela`,
    description: `Как добраться до страны, чем перемещаться внутри, где ночевать перед вылетом и в первую ночь.`,
    // Приватные маршруты не индексируются — как и их основная страница.
    robots: trip.visibility === 'PRIVATE' ? { index: false, follow: false } : undefined,
  };
}

export default async function LogisticsPage({ params }: { params: { slug: string } }) {
  const trip = await loadTrip(params.slug);

  if (!trip) {
    return (
      <main className="container-vela min-h-screen py-16">
        <h1 className="font-serif display-2">Логистика</h1>
        <p className="mt-4 text-paper-dim">
          Поездка не найдена или к ней нет доступа.{' '}
          <Link href="/" className="text-aurora hover:underline">
            На главную
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="container-vela min-h-screen py-10 pb-32 md:pb-16">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/trips/${params.slug}`} className="text-sm text-paper-dim hover:text-paper">
          ← К поездке
        </Link>
        <Link
          href={`/trips/${params.slug}/plan`}
          className="text-sm text-paper-dim hover:text-paper"
        >
          Планирование →
        </Link>
      </header>

      <p className="mb-3 flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-paper-faint">
        <span className="h-px w-8 bg-aurora/60" />
        {trip.country?.name ?? 'Путешествие'}
      </p>
      <h1 className="font-serif display-2">Логистика путешествия</h1>
      <p className="mt-4 max-w-2xl text-lg text-paper-dim">
        {trip.title}. Маршрут отвечает, что вы увидите. Этот раздел — как вы туда доберётесь, чем
        поедете внутри страны и где переночуете в первую ночь.
      </p>

      <div className="mt-10">
        <TripLogistics
          slug={params.slug}
          durationDays={trip.durationDays}
          transferWidgetUrl={transferWidgetUrl()}
        />
      </div>
    </main>
  );
}
