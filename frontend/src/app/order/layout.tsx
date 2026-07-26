import type { Metadata } from 'next';

// Страница-клиент, поэтому metadata живёт в layout.
export const metadata: Metadata = {
  title: 'Маршрут под ключ — Vela',
  description:
    'Опишите пожелание своими словами: ИИ превратит его в бриф, а команда Vela соберёт маршрут под вас — с планом по дням, жильём и расчётом трат.',
  alternates: { canonical: '/order' },
  openGraph: {
    type: 'website',
    title: 'Маршрут под ключ — Vela',
    description: 'Пожелание → ИИ-бриф → готовый маршрут, собранный под вас.',
    url: '/order',
    siteName: 'Vela',
    locale: 'ru_RU',
  },
};

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return children;
}
