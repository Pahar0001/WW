// Официальные ссылки на посольства / консульские источники по странам.
//
// Все URL проверены (отвечают). Для части стран это посольство в РФ, для части —
// официальный МИД / консульский портал страны (тоже официальный источник по визам).
// Ссылки помогают попасть на официальный источник; актуальные требования всегда
// уточняйте там же. Страны без надёжной официальной ссылки здесь опущены.

export const EMBASSIES: Record<string, string> = {
  tr: 'https://www.mfa.gov.tr',
  ge: 'https://mfa.gov.ge/en',
  am: 'https://russia.mfa.am',
  az: 'https://moscow.mfa.gov.az',
  kz: 'https://www.gov.kz/memleket/entities/mfa',
  by: 'https://russia.mfa.gov.by',
  th: 'https://moscow.thaiembassy.org',
  ae: 'https://www.mofaic.gov.ae',
  eg: 'https://www.mfa.gov.eg',
  rs: 'https://www.moscow.mfa.gov.rs',
  me: 'https://www.gov.me',
  cn: 'https://ru.china-embassy.gov.cn',
  jp: 'https://www.ru.emb-japan.go.jp',
  kr: 'https://overseas.mofa.go.kr/ru-ru',
  id: 'https://kemlu.go.id/moscow',
  in: 'https://indianembassy-moscow.gov.in',
  lk: 'https://mfa.gov.lk',
  mv: 'https://foreign.gov.mv',
  it: 'https://ambmosca.esteri.it',
  fr: 'https://ru.ambafrance.org',
  es: 'https://www.exteriores.gob.es/embajadas/moscu',
  de: 'https://moskau.diplo.de',
  gr: 'https://www.mfa.gr/en',
  cz: 'https://mzv.gov.cz/moscow',
  hu: 'https://moszkva.mfa.gov.hu',
  us: 'https://ru.usembassy.gov',
  gb: 'https://www.gov.uk/world/organisations/british-embassy-moscow',
};

export const getEmbassy = (code: string): string | undefined => EMBASSIES[code];
