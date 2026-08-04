import type { LegalDocument, LegalDocumentKey } from './types';
import { TERMS } from './terms';
import { PRIVACY } from './privacy';
import { COOKIES } from './cookies';

export type { LegalDocument, LegalSection, LegalDocumentKey } from './types';
export { DOCUMENT_VERSIONS } from './versions';
export { OPERATOR, OPERATOR_FILLED, operatorLine } from './operator';
export { TERMS, TERMS_VERSION, TERMS_SECTIONS } from './terms';
export { PRIVACY } from './privacy';
export { COOKIES } from './cookies';

/** Все юридические документы — для футера, страниц и проверки версий. */
export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  TERMS,
  PRIVACY,
  COOKIES,
};

export const LEGAL_LINKS = [TERMS, PRIVACY, COOKIES].map((d) => ({
  href: d.href,
  title: d.title,
  /** Короткая подпись для футера, где длинный заголовок не помещается. */
  short:
    d.key === 'TERMS' ? 'Соглашение' : d.key === 'PRIVACY' ? 'Персональные данные' : 'Cookies',
}));
