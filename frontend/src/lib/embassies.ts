// Официальные консульские ссылки по странам — приоритет русскоязычным.
//
// Правило (решение владельца): ведём на РУССКОЯЗЫЧНЫЙ сайт посольства страны
// в РФ; если его нет — на официальный визовый центр / визовый портал страны;
// если и его нет — на официальный МИД (лучший доступный официальный источник).
//
// Все URL проверены curl'ом 25.07.2026 (код ответа + наличие русского текста).
// Пометки: [ru] — русскоязычная страница подтверждена; [visa] — официальный
// визовый центр/портал; [bot] — сайт отвечает 403 на curl (защита от ботов),
// но в браузере открывается — русская версия известна.

export const EMBASSIES: Record<string, string> = {
  tr: 'https://www.evisa.gov.tr/ru/', // [visa][ru] официальный e-Visa Турции, русская локаль
  ge: 'https://geoconsul.gov.ge', // консульский портал МИД Грузии (ру-версии нет; дипотношения ограничены)
  am: 'https://russia.mfa.am/ru/', // [ru] посольство Армении в РФ
  az: 'https://moscow.mfa.gov.az/ru', // [ru] посольство Азербайджана в Москве
  kz: 'https://www.gov.kz/memleket/entities/mfa?lang=ru', // [ru] МИД Казахстана (гос-портал, ру-локаль)
  by: 'https://russia.mfa.gov.by', // [ru] посольство Беларуси в РФ
  th: 'https://moscow.thaiembassy.org/ru', // [ru] посольство Таиланда в Москве
  ae: 'https://www.mofaic.gov.ae', // МИД ОАЭ (ру-версии нет; въезд для РФ безвизовый)
  eg: 'https://www.visa2egypt.gov.eg', // [visa] официальный визовый портал Египта
  rs: 'https://www.moscow.mfa.gov.rs/ru', // [ru][bot] посольство Сербии в Москве, русская версия
  me: 'https://www.gov.me', // прав-портал Черногории (ру-версии нет; въезд безвизовый)
  cn: 'https://ru.china-embassy.gov.cn/rus/', // [ru] посольство КНР в РФ, русская версия
  jp: 'https://www.ru.emb-japan.go.jp', // [ru][bot] посольство Японии в России (сайт русскоязычный)
  kr: 'https://overseas.mofa.go.kr/ru-ru/index.do', // [ru][bot] посольство Республики Корея, ру-версия
  id: 'https://kemlu.go.id/moscow', // посольство Индонезии в Москве (ру-версии нет)
  in: 'https://blsindia-russia.com', // [visa][ru] официальный визовый центр Индии в РФ (BLS)
  lk: 'https://eta.gov.lk', // [visa] официальный портал ETA Шри-Ланки
  mv: 'https://immigration.gov.mv', // [visa] иммиграционная служба Мальдив (безвизовый въезд)
  it: 'https://italy-vms.ru', // [visa][ru] официальный визовый центр Италии в России
  fr: 'https://ru.ambafrance.org', // [ru] посольство Франции в России
  es: 'https://www.exteriores.gob.es/Embajadas/moscu/ru/Paginas/index.aspx', // [ru] посольство Испании, ру-страница
  de: 'https://germania.diplo.de/ru-ru', // [ru] представительства Германии в России
  gr: 'https://www.mfa.gr/en', // МИД Греции (подтверждённого ру-сайта/центра нет)
  cz: 'https://mzv.gov.cz/moscow/ru', // [ru] посольство Чехии в Москве, русская версия
  hu: 'https://moszkva.mfa.gov.hu/rus', // посольство Венгрии в Москве (раздел rus)
  us: 'https://ru.usembassy.gov/ru/', // [ru] посольство США, русская версия
  gb: 'https://www.gov.uk/world/organisations/british-embassy-moscow.ru', // [ru] посольство Великобритании, ру-страница
};

export const getEmbassy = (code: string): string | undefined => EMBASSIES[code];
