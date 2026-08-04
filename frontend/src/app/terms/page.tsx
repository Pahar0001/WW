import type { Metadata } from 'next';
import { LegalPage } from '@/components/legal/LegalPage';
import { TERMS } from '@/lib/legal';

export const metadata: Metadata = {
  title: `${TERMS.title} — Vela`,
  description: TERMS.description,
};

export default function TermsPage() {
  return <LegalPage doc={TERMS} />;
}
