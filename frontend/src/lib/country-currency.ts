/**
 * Валюта страны для карточки курса на странице маршрута.
 * Ключ — Country.slug из каталога (в сидах это ISO-2 плюс несколько
 * исторических слагов вроде "china"/"rossiya"). Код — ISO 4217, как в
 * выгрузке ЦБ РФ.
 */

export interface CountryCurrency {
  code: string;
  symbol: string;
  nameRu: string;
}

const EUR: CountryCurrency = { code: 'EUR', symbol: '€', nameRu: 'евро' };
const USD: CountryCurrency = { code: 'USD', symbol: '$', nameRu: 'доллар США' };
const RUB: CountryCurrency = { code: 'RUB', symbol: '₽', nameRu: 'российский рубль' };

export const COUNTRY_CURRENCY: Record<string, CountryCurrency> = {
  ru: RUB,
  rossiya: RUB,
  tr: { code: 'TRY', symbol: '₺', nameRu: 'турецкая лира' },
  ge: { code: 'GEL', symbol: '₾', nameRu: 'грузинский лари' },
  am: { code: 'AMD', symbol: '֏', nameRu: 'армянский драм' },
  az: { code: 'AZN', symbol: '₼', nameRu: 'азербайджанский манат' },
  kz: { code: 'KZT', symbol: '₸', nameRu: 'казахстанский тенге' },
  by: { code: 'BYN', symbol: 'Br', nameRu: 'белорусский рубль' },
  th: { code: 'THB', symbol: '฿', nameRu: 'тайский бат' },
  ae: { code: 'AED', symbol: 'د.إ', nameRu: 'дирхам ОАЭ' },
  eg: { code: 'EGP', symbol: '£', nameRu: 'египетский фунт' },
  rs: { code: 'RSD', symbol: 'дин', nameRu: 'сербский динар' },
  me: EUR,
  jp: { code: 'JPY', symbol: '¥', nameRu: 'японская иена' },
  kr: { code: 'KRW', symbol: '₩', nameRu: 'южнокорейская вона' },
  id: { code: 'IDR', symbol: 'Rp', nameRu: 'индонезийская рупия' },
  vn: { code: 'VND', symbol: '₫', nameRu: 'вьетнамский донг' },
  in: { code: 'INR', symbol: '₹', nameRu: 'индийская рупия' },
  lk: { code: 'LKR', symbol: '₨', nameRu: 'ланкийская рупия' },
  mv: USD,
  it: EUR,
  fr: EUR,
  es: EUR,
  de: EUR,
  gr: EUR,
  cz: { code: 'CZK', symbol: 'Kč', nameRu: 'чешская крона' },
  hu: { code: 'HUF', symbol: 'Ft', nameRu: 'венгерский форинт' },
  us: USD,
  gb: { code: 'GBP', symbol: '£', nameRu: 'фунт стерлингов' },
  cn: { code: 'CNY', symbol: '¥', nameRu: 'китайский юань' },
  china: { code: 'CNY', symbol: '¥', nameRu: 'китайский юань' },
};
