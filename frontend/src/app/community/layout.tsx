import type { Metadata } from 'next';

// Страницы сообщества — клиентские, поэтому metadata живёт в layout.
export const metadata: Metadata = {
  title: 'Сообщество путешественников — визы, въезд, посольства | Vela',
  description:
    'Страны, визовые правила, условия въезда и контакты посольств — с ссылками на официальные источники. Вопросы и ответы путешественников.',
  alternates: { canonical: '/community' },
  openGraph: {
    type: 'website',
    title: 'Сообщество путешественников — Vela',
    description: 'Визы, въезд, посольства и живые вопросы по странам.',
    url: '/community',
    siteName: 'Vela',
    locale: 'ru_RU',
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
