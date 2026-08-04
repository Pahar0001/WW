/**
 * Аэропорты: куда прилетаешь и откуда вылетаешь.
 *
 * Дополняет `travel/destinations.ts`, где на страну хранится один IATA-код для
 * запроса цен. Здесь — то, что нужно человеку, а не API: как называется
 * аэропорт, далеко ли он от города и чем оттуда уехать.
 *
 * ⚠️ REAL DATA POLICY. `distanceKm` — справочное расстояние до центра города,
 * это `ESTIMATED`, а не измеренное значение: точный километраж зависит от
 * маршрута и от того, что считать центром. Время в пути НЕ указано намеренно —
 * оно зависит от пробок и меняется в разы, выдумывать его нельзя.
 * `toCity` описывает способы уехать; конкретные цены и расписания — у
 * перевозчика по ссылке в `ground-transport.ts`.
 */

export interface Airport {
  iata: string;
  /** Как аэропорт называют люди, а не справочник ИКАО. */
  name: string;
  city: string;
  /** Справочное расстояние до центра города, км (ESTIMATED). */
  distanceKm?: number;
  /** Чем добраться до города. */
  toCity?: string;
}

/** Аэропорты прилёта по слагу страны. Первый — основной. */
export const ARRIVAL_AIRPORTS: Record<string, Airport[]> = {
  tr: [
    { iata: 'IST', name: 'Стамбул им. Ататюрка (новый — Istanbul Airport)', city: 'Стамбул', distanceKm: 40, toCity: 'Метро M11 до Гайреттепе, автобусы Havaist, такси' },
    { iata: 'SAW', name: 'Сабиха Гёкчен', city: 'Стамбул (азиатская сторона)', distanceKm: 35, toCity: 'Метро M4, автобусы Havabus' },
    { iata: 'AYT', name: 'Анталья', city: 'Анталья', distanceKm: 13, toCity: 'Трамвай Antray, автобус, такси' },
  ],
  ge: [
    { iata: 'TBS', name: 'Тбилиси им. Шота Руставели', city: 'Тбилиси', distanceKm: 17, toCity: 'Городской автобус №37, поезд до вокзала, такси' },
    { iata: 'BUS', name: 'Батуми', city: 'Батуми', distanceKm: 6, toCity: 'Автобус №10, такси' },
    { iata: 'KUT', name: 'Кутаиси', city: 'Кутаиси', distanceKm: 14, toCity: 'Автобусы Georgian Bus до Тбилиси и Батуми' },
  ],
  am: [{ iata: 'EVN', name: 'Звартноц', city: 'Ереван', distanceKm: 12, toCity: 'Автобус №201, такси' }],
  az: [{ iata: 'GYD', name: 'Гейдар Алиев', city: 'Баку', distanceKm: 20, toCity: 'Аэроэкспресс-автобус H1, такси' }],
  kz: [
    { iata: 'ALA', name: 'Алматы', city: 'Алматы', distanceKm: 15, toCity: 'Автобус №92, такси' },
    { iata: 'NQZ', name: 'Нурсултан Назарбаев', city: 'Астана', distanceKm: 17, toCity: 'Автобус №10, такси' },
  ],
  by: [{ iata: 'MSQ', name: 'Минск Национальный', city: 'Минск', distanceKm: 42, toCity: 'Автобус-экспресс до вокзала, маршрутки, такси' }],
  th: [
    { iata: 'BKK', name: 'Суварнабхуми', city: 'Бангкок', distanceKm: 30, toCity: 'Airport Rail Link до Пхая Тай, такси по счётчику' },
    { iata: 'DMK', name: 'Дон Мыанг', city: 'Бангкок (лоукостеры)', distanceKm: 24, toCity: 'Автобусы A1–A4, поезд' },
    { iata: 'HKT', name: 'Пхукет', city: 'Пхукет', distanceKm: 32, toCity: 'Smart Bus, минивэны, такси' },
  ],
  ae: [
    { iata: 'DXB', name: 'Дубай Интернешнл', city: 'Дубай', distanceKm: 5, toCity: 'Метро красная линия прямо из терминалов' },
    { iata: 'AUH', name: 'Зайд (Абу-Даби)', city: 'Абу-Даби', distanceKm: 30, toCity: 'Автобус A1, такси' },
  ],
  eg: [
    { iata: 'CAI', name: 'Каир', city: 'Каир', distanceKm: 22, toCity: 'Автобус, такси; метро не доходит до терминалов' },
    { iata: 'HRG', name: 'Хургада', city: 'Хургада', distanceKm: 6, toCity: 'Трансфер отеля, такси' },
    { iata: 'SSH', name: 'Шарм-эль-Шейх', city: 'Шарм-эль-Шейх', distanceKm: 10, toCity: 'Трансфер отеля, такси' },
  ],
  rs: [{ iata: 'BEG', name: 'Никола Тесла', city: 'Белград', distanceKm: 18, toCity: 'Автобус A1, городской №72, такси по фиксированным зонам' }],
  me: [
    { iata: 'TIV', name: 'Тиват', city: 'Тиват', distanceKm: 4, toCity: 'Такси, трансфер; до Будвы и Котора — 20–40 минут' },
    { iata: 'TGD', name: 'Подгорица', city: 'Подгорица', distanceKm: 11, toCity: 'Такси; автобус ходит редко' },
  ],
  jp: [
    { iata: 'NRT', name: 'Нарита', city: 'Токио', distanceKm: 60, toCity: 'Narita Express, Keisei Skyliner, автобусы' },
    { iata: 'HND', name: 'Ханэда', city: 'Токио', distanceKm: 15, toCity: 'Монорельс Tokyo Monorail, линия Keikyu' },
    { iata: 'KIX', name: 'Кансай', city: 'Осака', distanceKm: 40, toCity: 'Экспресс Haruka, Nankai Rapi:t' },
  ],
  kr: [{ iata: 'ICN', name: 'Инчхон', city: 'Сеул', distanceKm: 48, toCity: 'AREX (экспресс и обычный), автобусы-лимузины' }],
  id: [
    { iata: 'DPS', name: 'Нгурах-Рай', city: 'Денпасар (Бали)', distanceKm: 13, toCity: 'Такси по счётчику, приложения, трансфер' },
    { iata: 'CGK', name: 'Сукарно-Хатта', city: 'Джакарта', distanceKm: 20, toCity: 'Airport Rail Link, автобусы DAMRI' },
  ],
  vn: [
    { iata: 'HAN', name: 'Нойбай', city: 'Ханой', distanceKm: 27, toCity: 'Автобус 86, такси' },
    { iata: 'SGN', name: 'Таншоннят', city: 'Хошимин', distanceKm: 8, toCity: 'Автобус 109, такси' },
    { iata: 'DAD', name: 'Дананг', city: 'Дананг', distanceKm: 3, toCity: 'Такси; аэропорт почти в городе' },
  ],
  in: [
    { iata: 'DEL', name: 'Индира Ганди', city: 'Дели', distanceKm: 16, toCity: 'Метро Airport Express, преоплаченное такси' },
    { iata: 'BOM', name: 'Чатрапати Шиваджи', city: 'Мумбаи', distanceKm: 8, toCity: 'Преоплаченное такси, приложения' },
    { iata: 'GOI', name: 'Даболим', city: 'Гоа', distanceKm: 30, toCity: 'Преоплаченное такси' },
  ],
  lk: [{ iata: 'CMB', name: 'Бандаранаике', city: 'Коломбо', distanceKm: 32, toCity: 'Экспресс-автобус, такси' }],
  mv: [{ iata: 'MLE', name: 'Велана', city: 'Мале', distanceKm: 2, toCity: 'Паром до Мале; до курортов — катер или гидросамолёт от отеля' }],
  it: [
    { iata: 'FCO', name: 'Фьюмичино', city: 'Рим', distanceKm: 32, toCity: 'Leonardo Express до Термини, региональный поезд FL1' },
    { iata: 'MXP', name: 'Мальпенса', city: 'Милан', distanceKm: 50, toCity: 'Malpensa Express, автобусы' },
    { iata: 'VCE', name: 'Марко Поло', city: 'Венеция', distanceKm: 13, toCity: 'Автобус ATVO, водный автобус Alilaguna' },
  ],
  fr: [
    { iata: 'CDG', name: 'Шарль де Голль', city: 'Париж', distanceKm: 25, toCity: 'RER B, автобусы Roissybus' },
    { iata: 'ORY', name: 'Орли', city: 'Париж', distanceKm: 18, toCity: 'Orlyval + RER B, трамвай T7' },
  ],
  es: [
    { iata: 'BCN', name: 'Эль-Прат', city: 'Барселона', distanceKm: 15, toCity: 'Aerobús, метро L9, электричка R2' },
    { iata: 'MAD', name: 'Барахас', city: 'Мадрид', distanceKm: 13, toCity: 'Метро линия 8, экспресс-автобус' },
  ],
  de: [
    { iata: 'BER', name: 'Бранденбург', city: 'Берлин', distanceKm: 24, toCity: 'FEX, региональные поезда, S-Bahn S9/S45' },
    { iata: 'MUC', name: 'Франц Йозеф Штраус', city: 'Мюнхен', distanceKm: 35, toCity: 'S-Bahn S1 и S8, Lufthansa Express Bus' },
  ],
  gr: [{ iata: 'ATH', name: 'Элефтериос Венизелос', city: 'Афины', distanceKm: 33, toCity: 'Метро линия 3, автобус X95, пригородный поезд' }],
  cz: [{ iata: 'PRG', name: 'Вацлава Гавела', city: 'Прага', distanceKm: 17, toCity: 'Автобус 119 до метро Nádraží Veleslavín, Airport Express' }],
  hu: [{ iata: 'BUD', name: 'Ференц Лист', city: 'Будапешт', distanceKm: 22, toCity: 'Автобус 100E прямо до центра' }],
  us: [
    { iata: 'JFK', name: 'Джона Кеннеди', city: 'Нью-Йорк', distanceKm: 25, toCity: 'AirTrain + метро/LIRR' },
    { iata: 'EWR', name: 'Ньюарк', city: 'Нью-Йорк', distanceKm: 26, toCity: 'AirTrain + NJ Transit' },
  ],
  gb: [
    { iata: 'LHR', name: 'Хитроу', city: 'Лондон', distanceKm: 24, toCity: 'Elizabeth line, Piccadilly line, Heathrow Express' },
    { iata: 'LGW', name: 'Гатвик', city: 'Лондон', distanceKm: 45, toCity: 'Gatwick Express, Thameslink' },
  ],
  cn: [
    { iata: 'PEK', name: 'Столичный (Шоуду)', city: 'Пекин', distanceKm: 26, toCity: 'Airport Express до Дунчжимэнь, автобусы' },
    { iata: 'PKX', name: 'Дасин', city: 'Пекин', distanceKm: 46, toCity: 'Daxing Airport Express, скоростной поезд' },
    { iata: 'PVG', name: 'Пудун', city: 'Шанхай', distanceKm: 30, toCity: 'Маглев до Лунъян, метро линия 2' },
  ],
  china: [
    { iata: 'DYG', name: 'Хэхуа (Чжанцзяцзе)', city: 'Чжанцзяцзе', distanceKm: 5, toCity: 'Автобус до автовокзала, такси' },
    { iata: 'PEK', name: 'Столичный (Шоуду)', city: 'Пекин', distanceKm: 26, toCity: 'Airport Express до Дунчжимэнь' },
  ],
  ru: [
    { iata: 'LED', name: 'Пулково', city: 'Санкт-Петербург', distanceKm: 17, toCity: 'Автобус №39 до метро «Московская», такси' },
  ],
  rossiya: [
    { iata: 'LED', name: 'Пулково', city: 'Санкт-Петербург', distanceKm: 17, toCity: 'Автобус №39 до метро «Московская», такси' },
  ],
};

/** Аэропорты вылета для городов из `travel/destinations.ts` → ORIGINS. */
export const DEPARTURE_AIRPORTS: Record<string, Airport[]> = {
  MOW: [
    { iata: 'SVO', name: 'Шереметьево', city: 'Москва', distanceKm: 30, toCity: 'Аэроэкспресс с Белорусского вокзала' },
    { iata: 'DME', name: 'Домодедово', city: 'Москва', distanceKm: 45, toCity: 'Аэроэкспресс с Павелецкого вокзала' },
    { iata: 'VKO', name: 'Внуково', city: 'Москва', distanceKm: 28, toCity: 'Аэроэкспресс с Киевского вокзала, метро «Внуково»' },
  ],
  LED: [{ iata: 'LED', name: 'Пулково', city: 'Санкт-Петербург', distanceKm: 17, toCity: 'Автобус №39 до метро «Московская»' }],
  SVX: [{ iata: 'SVX', name: 'Кольцово', city: 'Екатеринбург', distanceKm: 16, toCity: 'Автобус №1, такси' }],
  KZN: [{ iata: 'KZN', name: 'Казань', city: 'Казань', distanceKm: 26, toCity: 'Аэроэкспресс до ж/д вокзала' }],
  OVB: [{ iata: 'OVB', name: 'Толмачёво', city: 'Новосибирск', distanceKm: 17, toCity: 'Автобус №111э, такси' }],
  AER: [{ iata: 'AER', name: 'Сочи (Адлер)', city: 'Сочи', distanceKm: 28, toCity: 'Электричка «Ласточка» до Сочи и Адлера' }],
};

export const arrivalAirports = (countrySlug: string): Airport[] =>
  ARRIVAL_AIRPORTS[countrySlug] ?? [];

export const departureAirports = (originIata: string): Airport[] =>
  DEPARTURE_AIRPORTS[originIata] ?? [];
