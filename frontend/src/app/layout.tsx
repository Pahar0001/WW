import type { Metadata, Viewport } from 'next';
import { Onest, Playfair_Display } from 'next/font/google';
import './globals.css';
import { Atmosphere } from '@/components/fx/Atmosphere';
import { Ambience } from '@/components/fx/Ambience';
import { SupportWidget } from '@/components/support/SupportWidget';
import { BottomNav } from '@/components/ui/BottomNav';
import { FloatingNav } from '@/components/ui/FloatingNav';
import { TermsGate } from '@/components/auth/TermsGate';
import { CookieBanner } from '@/components/legal/CookieBanner';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';
import { PwaProvider } from '@/components/pwa/PwaProvider';
import { Toaster } from '@/components/ui/Toaster';
import { SITE } from '@/lib/site';

// Set theme before paint (no flash). Default = light (calm); 'dark' if saved.
const themeInit = `(function(){try{var t=localStorage.getItem('vela_theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

const inter = Onest({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' });
const fraunces = Playfair_Display({ subsets: ['latin', 'cyrillic'], weight: ['400','500','600','700'], variable: '--font-serif' });

const DESCRIPTION =
  'Премиальная платформа для планирования путешествий. Готовые маршруты, конструктор по дням, карты и честные данные из реальных источников.';

export const metadata: Metadata = {
  // %s — заголовок конкретной страницы; на главной работает default.
  title: {
    default: 'Vela — Путешествия, которые запоминаются',
    template: '%s',
  },
  description: DESCRIPTION,
  metadataBase: new URL(SITE),
  applicationName: 'Vela',
  keywords: [
    'маршруты путешествий',
    'план поездки по дням',
    'планировщик путешествий',
    'куда поехать',
    'визы и документы',
    'Vela',
  ],
  alternates: { canonical: '/' },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Vela', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
  openGraph: {
    title: 'Vela — Путешествия, которые запоминаются',
    description: 'Готовые маршруты и модульный конструктор путешествий.',
    type: 'website',
    url: '/',
    siteName: 'Vela',
    locale: 'ru_RU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vela — Путешествия, которые запоминаются',
    description: 'Готовые маршруты и модульный конструктор путешествий.',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5efe3' },
    { media: '(prefers-color-scheme: dark)', color: '#14100c' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning className={`${inter.variable} ${fraunces.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        {/* Фоновая атмосфера идёт ПЕРВОЙ в body: оба слоя позиционированы
            без z-index, поэтому порядок рисования решает DOM — канвас
            остаётся под всем контентом. */}
        <Ambience />
        <Atmosphere />
        {children}
        <SupportWidget />
        <AssistantWidget />
        <BottomNav />
        <FloatingNav />
        <TermsGate />
        {/* Ниже TermsGate: окно принятия документов модальное и перекрывает
            баннер — сначала соглашение, потом cookie. */}
        <CookieBanner />
        <PwaProvider />
        <Toaster />
      </body>
    </html>
  );
}
