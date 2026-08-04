import { ConsentKind } from '@prisma/client';

/**
 * Актуальные редакции юридических документов — источник правды ДЛЯ БЭКЕНДА.
 *
 * Тексты документов живут на фронте (`frontend/src/lib/legal/*`), потому что
 * показывает их он. Сюда попадают только номера редакций: по ним бэкенд решает,
 * устарело ли ранее данное согласие и нужно ли спросить заново.
 *
 * ⚠️ Два списка обязаны совпадать. Скопировать их в один файл нельзя: Docker
 * собирает `backend` и `frontend` из РАЗНЫХ контекстов (см. render.yaml), и файл
 * из корня репозитория просто не попадёт в образ. Поэтому расхождение ловится
 * проверкой — `frontend/scripts/check-legal.ts`, гонять перед пушем.
 */
export const DOCUMENT_VERSIONS = {
  TERMS: '1.0 · 26.06.2026',
  PRIVACY: '1.0 · 03.08.2026',
  COOKIES: '1.0 · 03.08.2026',
} as const;

export type DocumentKey = keyof typeof DOCUMENT_VERSIONS;

/**
 * Какой документ описывает каждое согласие. Отдельного документа про рассылки
 * нет — условия и способ отзыва описаны в политике обработки ПДн, поэтому
 * версия согласия на рекламу считается по ней.
 */
export const CONSENT_DOCUMENT: Record<ConsentKind, DocumentKey> = {
  TERMS: 'TERMS',
  PRIVACY: 'PRIVACY',
  MARKETING: 'PRIVACY',
  COOKIE_ANALYTICS: 'COOKIES',
  COOKIE_MARKETING: 'COOKIES',
};

/**
 * Без чего нельзя пользоваться сервисом. MARKETING сюда не входит и входить не
 * может: ст. 16 ч. 3 152-ФЗ и ст. 18 ФЗ «О рекламе» запрещают делать рекламное
 * согласие условием оказания услуги.
 */
export const REQUIRED_CONSENTS: ConsentKind[] = [ConsentKind.TERMS, ConsentKind.PRIVACY];

/** Текущая редакция документа, которым описывается это согласие. */
export const currentVersionFor = (kind: ConsentKind): string =>
  DOCUMENT_VERSIONS[CONSENT_DOCUMENT[kind]];
