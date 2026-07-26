import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Travel-новости: агрегатор открытых RSS-лент туристических изданий.
 *
 * Без ключей и без сторонних библиотек: RSS 2.0 разбирается вручную (регэкспы
 * по <item> достаточно надёжны для лент такого формата). Список лент можно
 * переопределить env-переменной NEWS_FEEDS ("Название|https://url, …").
 *
 * Подсветка по путешествиям: заголовок/анонс матчится по странам из каталога
 * (Country.name/nameLocal) — у новости появляются чипы стран со ссылками на
 * маршруты. Кэш 15 минут; если все ленты недоступны, отдаём кэш и honest-флаг.
 *
 * Real Data Policy: показываем только то, что реально пришло из ленты
 * (заголовок, источник, дата, ссылка) — ничего не дополняем и не выдумываем.
 */

interface FeedDef {
  source: string;
  url: string;
}

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

const DEFAULT_FEEDS: FeedDef[] = [
  // Открытые RSS-ленты без ключей (проверены 26.07.2026: отдают валидный RSS).
  // Мёртвая лента просто пропускается; список можно переопределить через
  // env NEWS_FEEDS="Название|https://url, Название2|https://url2".
  { source: 'Лента.ру — Путешествия', url: 'https://lenta.ru/rss/news/travel' },
  { source: 'Perito', url: 'https://perito.media/feed' },
  { source: '34travel', url: 'https://34travel.me/rss/' },
];

const CACHE_TTL_MS = 15 * 60 * 1000;
const FEED_TIMEOUT_MS = 8000;
const MAX_ITEMS = 40;

function parseFeeds(): FeedDef[] {
  const raw = process.env.NEWS_FEEDS;
  if (!raw) return DEFAULT_FEEDS;
  const out: FeedDef[] = [];
  for (const part of raw.split(',')) {
    const [source, url] = part.split('|').map((s) => s.trim());
    if (source && url && /^https?:\/\//.test(url)) out.push({ source, url });
  }
  return out.length ? out : DEFAULT_FEEDS;
}

/** Снять CDATA/теги/сущности — RSS-поля бывают и такими, и такими. */
function cleanText(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return s || null;
}

function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? m[1] : null;
}

/** Картинка из enclosure или media:content, если лента её отдаёт. */
function imageOf(block: string): string | null {
  const m =
    block.match(/<enclosure[^>]+url="([^"]+)"[^>]*type="image[^"]*"/i) ||
    block.match(/<media:content[^>]+url="([^"]+)"/i) ||
    block.match(/<enclosure[^>]+url="([^"]+\.(?:jpe?g|png|webp))"/i);
  return m ? m[1] : null;
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger('NewsService');
  private cache: { items: TravelNewsItem[]; fetchedAt: number; sources: string[] } | null = null;
  private inflight: Promise<void> | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async travel(): Promise<{
    items: TravelNewsItem[];
    sources: string[];
    fetchedAt: string | null;
    stale: boolean;
  }> {
    const fresh = this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS;
    if (!fresh) {
      // Одно обновление на все параллельные запросы.
      this.inflight ??= this.refresh().finally(() => {
        this.inflight = null;
      });
      await this.inflight;
    }
    const c = this.cache;
    return {
      items: c?.items ?? [],
      sources: c?.sources ?? [],
      fetchedAt: c ? new Date(c.fetchedAt).toISOString() : null,
      stale: Boolean(c && Date.now() - c.fetchedAt >= CACHE_TTL_MS),
    };
  }

  private async refresh(): Promise<void> {
    const feeds = parseFeeds();
    const results = await Promise.all(feeds.map((f) => this.fetchFeed(f)));
    const okSources = feeds.filter((_, i) => results[i].length > 0).map((f) => f.source);
    const merged = results.flat();

    if (merged.length === 0) {
      // Все ленты легли — оставляем прошлый кэш (лучше вчерашние новости, чем пусто).
      if (!this.cache) this.cache = { items: [], fetchedAt: Date.now(), sources: [] };
      return;
    }

    const withCountries = await this.attachCountries(merged);
    withCountries.sort((a, b) => {
      const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return tb - ta;
    });

    this.cache = {
      items: withCountries.slice(0, MAX_ITEMS),
      fetchedAt: Date.now(),
      sources: okSources,
    };
  }

  private async fetchFeed(feed: FeedDef): Promise<TravelNewsItem[]> {
    try {
      const res = await fetch(feed.url, {
        headers: { 'User-Agent': 'VelaNewsBot/1.0 (+https://velatrips.ru)' },
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const items: TravelNewsItem[] = [];
      const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
      for (const block of blocks.slice(0, 20)) {
        const title = cleanText(tag(block, 'title'));
        const link = cleanText(tag(block, 'link'));
        if (!title || !link || !/^https?:\/\//.test(link)) continue;
        const pub = cleanText(tag(block, 'pubDate'));
        const publishedAt = pub && !Number.isNaN(Date.parse(pub)) ? new Date(pub).toISOString() : null;
        const summary = cleanText(tag(block, 'description'));
        items.push({
          id: link,
          title,
          link,
          source: feed.source,
          publishedAt,
          summary: summary && summary.length > 220 ? `${summary.slice(0, 219).trimEnd()}…` : summary,
          imageUrl: imageOf(block),
          countries: [],
        });
      }
      return items;
    } catch (err) {
      this.logger.warn(`Лента «${feed.source}» недоступна: ${(err as Error).message}`);
      return [];
    }
  }

  /** Матчинг стран каталога в заголовке/анонсе — «подсветка по путешествиям». */
  private async attachCountries(items: TravelNewsItem[]): Promise<TravelNewsItem[]> {
    const countries = await this.prisma.country.findMany({
      select: { name: true, nameLocal: true, slug: true },
    });
    // Формы склонений: матчим по основе слова (первые 5+ букв) — «Таиланде»,
    // «Грузию» и т.п. без морфологического словаря. В сидах одна страна может
    // существовать в нескольких записях (разные слаги) — дедупим по имени.
    const byName = new Map<string, { name: string; slug: string; stems: string[] }>();
    for (const c of countries) {
      if (byName.has(c.name)) continue;
      const stems = [c.name, c.nameLocal]
        .filter(Boolean)
        .map((n) => String(n).toLowerCase())
        .map((n) => (n.length > 6 ? n.slice(0, n.length - 2) : n));
      byName.set(c.name, { name: c.name, slug: c.slug, stems });
    }
    const needles = Array.from(byName.values());
    return items.map((it) => {
      const hay = `${it.title} ${it.summary ?? ''}`.toLowerCase();
      const matched = needles
        .filter((n) => n.stems.some((s) => s.length >= 4 && hay.includes(s)))
        .slice(0, 3)
        .map((n) => ({ name: n.name, slug: n.slug }));
      return { ...it, countries: matched };
    });
  }
}
