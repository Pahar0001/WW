/** Раздел юридического документа. */
export interface LegalSection {
  title: string;
  paragraphs: string[];
  /** Маркированный список после абзацев — для перечней данных, целей, прав. */
  list?: string[];
  /** Приписка мелким шрифтом под разделом (пояснение, а не норма). */
  note?: string;
}

export type LegalDocumentKey = 'TERMS' | 'PRIVACY' | 'COOKIES';

export interface LegalDocument {
  key: LegalDocumentKey;
  /** Заголовок страницы и пункта в навигации. */
  title: string;
  /** Короткое описание для <meta description>. */
  description: string;
  /** Адрес страницы. */
  href: string;
  version: string;
  /** Вступительный абзац перед нумерованными разделами. */
  intro: string;
  sections: LegalSection[];
}
