import { api, imageUrl } from '@/lib/api';
import { ogCard, ogClamp, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og';
import { pluralize } from '@/lib/plural';

/**
 * OG-картинка маршрута: фирменная карточка со страной, длительностью и
 * заголовком поверх затемнённого фото маршрута. Отдаётся при шеринге ссылки
 * в соцсети и мессенджеры.
 */

export const alt = 'Маршрут Vela';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: { slug: string } }) {
  const trip = await api.getTrip(params.slug);

  // Приватный/несуществующий маршрут: карточка без деталей поездки.
  if (!trip) {
    return ogCard({ eyebrow: 'Vela', title: 'Путешествия, которые запоминаются' });
  }

  const hero = imageUrl(trip.heroImage);
  const background = hero && /^https?:\/\//.test(hero) ? hero : null;

  return ogCard({
    eyebrow: `${trip.country.name} · ${pluralize(trip.durationDays, 'день', 'дня', 'дней')}`,
    title: trip.title,
    subtitle: ogClamp(trip.summary, 110),
    background,
  });
}
