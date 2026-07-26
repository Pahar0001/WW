import type { MetadataRoute } from 'next';

/**
 * robots.txt: открыт публичный контент, закрыты личные и служебные разделы
 * (админка, аккаунт, соцлента, печатные версии), плюс ссылка на карту сайта.
 */

const SITE = 'https://velatrips.ru';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/api/',
          '/uploads/',
          '/profile',
          '/notifications',
          '/feed',
          '/network',
          '/news',
          '/u/',
          '/login',
          '/register',
          '/forgot-password',
          '/reset-password',
          '/verify-email',
          '/trips/new',
          '/trips/*/print',
          '/trips/*/edit',
          '/assistant',
        ],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
