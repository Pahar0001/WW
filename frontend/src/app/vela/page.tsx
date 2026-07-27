import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

/**
 * /vela — интерактивный трёхмерный мир Vela Island.
 *
 * Открывается по логотипу Vela в навигации — обычным переходом внутри
 * приложения, без новой вкладки. Сцена подключается через dynamic(ssr:false):
 * WebGL нельзя рендерить на сервере, а сам бандл (three + drei +
 * postprocessing) не должен попадать в общий чанк сайта — он загружается
 * только тем, кто действительно зашёл в игру.
 */
const VelaIsland = dynamic(
  () => import('@/components/game/VelaIsland').then((m) => m.VelaIsland),
  { ssr: false },
);

export const metadata: Metadata = {
  title: 'Vela Island — интерактивный мир',
  description:
    'Трёхмерный остров Vela: горы, водопады, руины и секретные места. Каждое открытое место — раздел платформы: маршруты, сообщество, честные данные, консьерж.',
  alternates: { canonical: '/vela' },
  openGraph: {
    title: 'Vela Island — интерактивный мир',
    description: 'Исследуйте остров Vela: шесть мест, два секрета и семь древних артефактов.',
    url: '/vela',
    type: 'website',
  },
};

export default function VelaIslandPage() {
  return <VelaIsland />;
}
