// Куда лететь по каждой стране каталога: IATA-код города прилёта + русское
// название для подписи. `fallback` — запасной аэропорт, если по основному
// направлению нет кэша цен (например, малые региональные аэропорты).
export interface Destination {
  iata: string;
  city: string;
  fallback?: { iata: string; city: string };
}

// Ключ — slug страны (Country.slug): 2-буквенные коды сообщества + 'china'
// (флагманский маршрут) и 'rossiya' (приватный Петербург).
export const DESTINATIONS: Record<string, Destination> = {
  ru: { iata: 'LED', city: 'Санкт-Петербург' },
  rossiya: { iata: 'LED', city: 'Санкт-Петербург' },
  tr: { iata: 'IST', city: 'Стамбул' },
  ge: { iata: 'TBS', city: 'Тбилиси' },
  am: { iata: 'EVN', city: 'Ереван' },
  az: { iata: 'GYD', city: 'Баку' },
  kz: { iata: 'ALA', city: 'Алматы' },
  by: { iata: 'MSQ', city: 'Минск' },
  th: { iata: 'BKK', city: 'Бангкок' },
  ae: { iata: 'DXB', city: 'Дубай' },
  eg: { iata: 'CAI', city: 'Каир', fallback: { iata: 'HRG', city: 'Хургада' } },
  rs: { iata: 'BEG', city: 'Белград' },
  me: { iata: 'TIV', city: 'Тиват', fallback: { iata: 'TGD', city: 'Подгорица' } },
  jp: { iata: 'TYO', city: 'Токио' },
  kr: { iata: 'SEL', city: 'Сеул' },
  id: { iata: 'DPS', city: 'Денпасар (Бали)' },
  vn: { iata: 'HAN', city: 'Ханой' },
  in: { iata: 'DEL', city: 'Дели' },
  lk: { iata: 'CMB', city: 'Коломбо' },
  mv: { iata: 'MLE', city: 'Мале' },
  it: { iata: 'ROM', city: 'Рим' },
  fr: { iata: 'PAR', city: 'Париж' },
  es: { iata: 'BCN', city: 'Барселона' },
  de: { iata: 'BER', city: 'Берлин', fallback: { iata: 'MUC', city: 'Мюнхен' } },
  gr: { iata: 'ATH', city: 'Афины' },
  cz: { iata: 'PRG', city: 'Прага' },
  hu: { iata: 'BUD', city: 'Будапешт' },
  us: { iata: 'NYC', city: 'Нью-Йорк' },
  gb: { iata: 'LON', city: 'Лондон' },
  cn: { iata: 'PEK', city: 'Пекин' },
  china: { iata: 'DYG', city: 'Чжанцзяцзе', fallback: { iata: 'PEK', city: 'Пекин' } },
};

// Города вылета, которые предлагает интерфейс (валидация на бэке).
export const ORIGINS: Record<string, string> = {
  MOW: 'Москва',
  LED: 'Санкт-Петербург',
  SVX: 'Екатеринбург',
  KZN: 'Казань',
  OVB: 'Новосибирск',
  AER: 'Сочи',
};
