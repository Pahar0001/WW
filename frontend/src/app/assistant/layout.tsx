import type { Metadata } from 'next';

// Страница-клиент, поэтому metadata живёт в layout.
// Раздел личный (история диалогов), поэтому из индекса исключён.
export const metadata: Metadata = {
  title: 'ИИ-консьерж — Vela',
  description:
    'Вопросы о маршрутах, визах, документах и сборах. Диалоги сохраняются в вашем аккаунте.',
  robots: { index: false, follow: true },
};

export default function AssistantLayout({ children }: { children: React.ReactNode }) {
  return children;
}
