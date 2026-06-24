import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { MagneticCursor } from '@/components/cursor/MagneticCursor';
import { SiteScenery } from '@/components/decor/SiteScenery';
import { Toaster } from '@/components/ui/Toaster';

// Set theme before paint (no flash). Default = light (calm); 'dark' if saved.
const themeInit = `(function(){try{var t=localStorage.getItem('vela_theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'Vela — Путешествия, которые запоминаются',
  description:
    'Премиальная платформа для планирования путешествий. Готовые маршруты, конструктор по дням, карты и честные данные из реальных источников.',
  metadataBase: new URL('https://velatrips.ru'),
  openGraph: {
    title: 'Vela — Путешествия, которые запоминаются',
    description: 'Готовые маршруты и модульный конструктор путешествий.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${inter.variable} ${fraunces.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <SiteScenery />
        <MagneticCursor />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
