import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { MagneticCursor } from '@/components/cursor/MagneticCursor';
import { GenerativeBackground } from '@/components/canvas/GenerativeBackground';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'Vela — Путешествия, которые запоминаются',
  description:
    'Премиальная платформа для планирования путешествий. Готовые маршруты, конструктор по дням, карты и честные данные из реальных источников.',
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: 'Vela — Путешествия, которые запоминаются',
    description: 'Готовые маршруты и модульный конструктор путешествий.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <GenerativeBackground />
        <MagneticCursor />
        {children}
      </body>
    </html>
  );
}
