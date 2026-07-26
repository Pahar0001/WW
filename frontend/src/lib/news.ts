'use client';

/**
 * Клиент travel-новостей: открытые RSS-ленты туристических изданий,
 * агрегированные бэкендом (/api/news/travel, кэш 15 минут). У новости может
 * быть подсветка стран из каталога Vela — чипы со ссылками на сообщество.
 */

export interface TravelNewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
  summary: string | null;
  imageUrl: string | null;
  countries: { name: string; slug: string }[];
}

export interface TravelNews {
  items: TravelNewsItem[];
  sources: string[];
  fetchedAt: string | null;
  stale: boolean;
}

export async function fetchTravelNews(): Promise<TravelNews | null> {
  try {
    const res = await fetch('/api/news/travel', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as TravelNews;
  } catch {
    return null;
  }
}
