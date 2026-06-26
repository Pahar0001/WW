import Link from 'next/link';
import type { Metadata } from 'next';
import { TERMS_VERSION, TERMS_SECTIONS } from '@/lib/terms';

export const metadata: Metadata = {
  title: 'Пользовательское соглашение — Vela',
  description: 'Условия использования платформы Vela.',
};

export default function TermsPage() {
  return (
    <main className="relative min-h-screen pb-32">
      <header className="container-vela flex items-center justify-between py-7">
        <Link href="/" data-magnetic className="font-serif text-xl tracking-tightest">
          Vela
        </Link>
        <Link href="/" data-cursor="hover" className="text-sm text-paper-dim hover:text-paper">
          ← На главную
        </Link>
      </header>

      <section className="container-vela max-w-3xl pt-6">
        <p className="text-sm uppercase tracking-[0.3em] text-paper-faint">
          Редакция {TERMS_VERSION}
        </p>
        <h1 className="mt-4 font-serif text-4xl tracking-tightest md:text-5xl">
          Пользовательское соглашение
        </h1>
        <p className="mt-6 text-lg text-paper-dim">
          Настоящее соглашение регулирует использование платформы Vela (далее —
          «Сервис»). Регистрируясь и пользуясь Сервисом, вы подтверждаете, что
          ознакомились с условиями и принимаете их в полном объёме.
        </p>

        <div className="mt-12 space-y-10">
          {TERMS_SECTIONS.map((s, i) => (
            <div key={i}>
              <h2 className="font-serif text-2xl tracking-tightest text-paper">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-4 space-y-3">
                {s.paragraphs.map((p, j) => (
                  <p key={j} className="leading-relaxed text-paper-dim">
                    {p}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-14 text-sm text-paper-faint">
          По вопросам, связанным с соглашением, используйте чат поддержки внутри
          Сервиса или напишите на адрес, указанный на сайте velatrips.ru.
        </p>
      </section>
    </main>
  );
}
