import type { Metadata } from 'next';

// Страница-клиент; экран знакомства личный и в индексе не нужен.
export const metadata: Metadata = {
  title: 'Знакомство с Vela',
  description: 'Короткое знакомство с возможностями Vela для новых пользователей.',
  robots: { index: false, follow: false },
};

export default function WelcomeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
