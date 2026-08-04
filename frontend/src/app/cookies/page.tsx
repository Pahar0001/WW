import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { COOKIES } from '@/lib/legal';

export const metadata: Metadata = {
  title: `${COOKIES.title} — Vela`,
  description: COOKIES.description,
};

export default function CookiesPage() {
  return <LegalPage doc={COOKIES} />;
}
