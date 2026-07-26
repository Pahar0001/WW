import type { MetadataRoute } from 'next';
import { api } from '@/lib/api';

/**
 * Карта сайта: статические разделы + все публичные маршруты и страницы стран
 * сообщества. Обновляется раз в час (revalidate), чтобы новые маршруты попадали
 * в индекс без пересборки.
 */

export const revalidate = 3600;

const SITE = 'https://velatrips.ru';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE}/order`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE}/community`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE}/data`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/assistant`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Бэкенд может спать (free tier) — тогда отдаём хотя бы статические разделы.
  const trips = (await api.listTrips()) ?? [];
  const published = trips.filter((t) => t.visibility !== 'PRIVATE');

  const tripPages: MetadataRoute.Sitemap = published.map((t) => ({
    url: `${SITE}/trips/${t.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  const countrySlugs = Array.from(
    new Set(published.map((t) => t.country.slug).filter(Boolean) as string[]),
  );
  const countryPages: MetadataRoute.Sitemap = countrySlugs.map((slug) => ({
    url: `${SITE}/community/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticPages, ...tripPages, ...countryPages];
}
