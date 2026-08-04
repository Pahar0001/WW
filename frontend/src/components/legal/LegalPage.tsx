import Link from 'next/link';
import type { LegalDocument } from '@/lib/legal';
import { LEGAL_LINKS, OPERATOR_FILLED } from '@/lib/legal';

/**
 * Единый разворот для всех трёх юридических документов. Один рендерер, а не три
 * страницы с копиями вёрстки: документы правятся редко и не одновременно, и
 * разъехавшееся оформление у соглашения и политики выглядит как подделка.
 */
export function LegalPage({ doc }: { doc: LegalDocument }) {
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
          Редакция {doc.version}
        </p>
        <h1 className="mt-4 font-serif text-4xl tracking-tightest md:text-5xl">{doc.title}</h1>
        <p className="mt-6 text-lg text-paper-dim">{doc.intro}</p>

        {!OPERATOR_FILLED && <PlaceholderWarning />}

        <div className="mt-12 space-y-10">
          {doc.sections.map((s, i) => (
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
              {s.list && (
                <ul className="mt-4 space-y-2">
                  {s.list.map((item, j) => (
                    <li key={j} className="flex gap-3 leading-relaxed text-paper-dim">
                      <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-aurora/60" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
              {s.note && (
                <p className="mt-4 border-l border-ink-line pl-4 text-sm leading-relaxed text-paper-faint">
                  {s.note}
                </p>
              )}
            </div>
          ))}
        </div>

        <nav className="mt-16 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-line pt-8 text-sm">
          {LEGAL_LINKS.filter((l) => l.href !== doc.href).map((l) => (
            <Link key={l.href} href={l.href} className="text-paper-dim transition-colors hover:text-paper">
              {l.title}
            </Link>
          ))}
        </nav>
      </section>
    </main>
  );
}

/**
 * Пока реквизиты оператора не вписаны, документ юридической силы не имеет —
 * и об этом должно быть видно с первого взгляда. Молчать здесь нельзя: текст
 * выглядит совершенно готовым, и заглушки уезжают на прод незамеченными.
 */
function PlaceholderWarning() {
  return (
    <div className="mt-8 rounded-2xl border border-amber-400/40 bg-amber-400/5 p-5">
      <p className="text-sm font-medium text-amber-200">Черновик — реквизиты не заполнены</p>
      <p className="mt-2 text-sm leading-relaxed text-paper-dim">
        В тексте остались подстановки вида <code className="text-amber-200/90">{'{{ИНН}}'}</code>.
        Документ не действует, пока в{' '}
        <code className="text-amber-200/90">frontend/src/lib/legal/operator.ts</code> не вписаны
        наименование, ИНН, ОГРН и адрес оператора. После заполнения этот блок исчезнет сам.
      </p>
    </div>
  );
}
