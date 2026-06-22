import type { Metadata } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { MagneticCursor } from '@/components/cursor/MagneticCursor';
import { GenerativeBackground } from '@/components/canvas/GenerativeBackground';

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-serif' });

export const metadata: Metadata = {
  title: 'Vela — Plan journeys worth remembering',
  description:
    'A premium travel-planning platform. Curated Dream Trips, a modular itinerary builder, day-by-day maps, and honest, sourced data.',
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: 'Vela — Plan journeys worth remembering',
    description: 'Curated journeys and a modular itinerary builder.',
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
