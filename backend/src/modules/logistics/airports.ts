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

export interface AirportParking {
  /** Как называется вариант: «Официальная парковка терминала». */
  title: string;
  /** Официальный сайт, где смотреть тарифы и бронировать. */
  url: string;
  /** Что важно знать: шаттл, бронь заранее, удалённость. */
  note: string;
}

export interface Airport {
  iata: string;
  /**
   * Координаты для карты. Положение аэропорта — устойчивый факт; точность
   * до сотых долей градуса (около километра) для метки на карте избыточна.
   */
  lat: number;
  lng: number;
  /** Как аэропорт называют люди, а не справочник ИКАО. */
  name: string;
  city: string;
  /** Справочное расстояние до центра города, км (ESTIMATED). */
  distanceKm?: number;
  /** Чем добраться до города. */
  toCity?: string;
  /**
   * Парковки — только у аэропортов ВЫЛЕТА: машину оставляют там, откуда
   * улетают. Цен здесь нет и быть не должно: тарифы меняются, зависят от
   * срока и от того, бронировали ли заранее. Даём оператора и официальную
   * ссылку — там цифры настоящие и на нужные даты.
   */
  parking?: AirportParking[];
  /**
   * Чем уехать из аэропорта ПОЗДНЕЙ НОЧЬЮ, когда вернулись домой. Отдельно
   * от `toCity`: днём вопрос «как доехать» не стоит, а в час ночи аэроэкспресс
   * уже не ходит и метро закрыто — это и есть момент, когда человеку нужен
   * совет.
   */
  lateNight?: string;
}

/** Аэропорты прилёта по слагу страны. Первый — основной. */
export const ARRIVAL_AIRPORTS: Record<string, Airport[]> = {
  tr: [
    { iata: 'IST', lat: 41.2753, lng: 28.7519, name: 'Стамбул им. Ататюрка (новый — Istanbul Airport)', city: 'Стамбул', distanceKm: 40, toCity: 'Метро M11 до Гайреттепе, автобусы Havaist, такси' },
    { iata: 'SAW', lat: 40.8986, lng: 29.3092, name: 'Сабиха Гёкчен', city: 'Стамбул (азиатская сторона)', distanceKm: 35, toCity: 'Метро M4, автобусы Havabus' },
    { iata: 'AYT', lat: 36.8987, lng: 30.8005, name: 'Анталья', city: 'Анталья', distanceKm: 13, toCity: 'Трамвай Antray, автобус, такси' },
  ],
  ge: [
    { iata: 'TBS', lat: 41.6692, lng: 44.9547, name: 'Тбилиси им. Шота Руставели', city: 'Тбилиси', distanceKm: 17, toCity: 'Городской автобус №37, поезд до вокзала, такси' },
    { iata: 'BUS', lat: 41.6103, lng: 41.5997, name: 'Батуми', city: 'Батуми', distanceKm: 6, toCity: 'Автобус №10, такси' },
    { iata: 'KUT', lat: 42.1767, lng: 42.4826, name: 'Кутаиси', city: 'Кутаиси', distanceKm: 14, toCity: 'Автобусы Georgian Bus до Тбилиси и Батуми' },
  ],
  am: [{ iata: 'EVN', lat: 40.1473, lng: 44.3959, name: 'Звартноц', city: 'Ереван', distanceKm: 12, toCity: 'Автобус №201, такси' }],
  az: [{ iata: 'GYD', lat: 40.4675, lng: 50.0467, name: 'Гейдар Алиев', city: 'Баку', distanceKm: 20, toCity: 'Аэроэкспресс-автобус H1, такси' }],
  kz: [
    { iata: 'ALA', lat: 43.3521, lng: 77.0405, name: 'Алматы', city: 'Алматы', distanceKm: 15, toCity: 'Автобус №92, такси' },
    { iata: 'NQZ', lat: 51.0223, lng: 71.4669, name: 'Нурсултан Назарбаев', city: 'Астана', distanceKm: 17, toCity: 'Автобус №10, такси' },
  ],
  by: [{ iata: 'MSQ', lat: 53.8825, lng: 28.0307, name: 'Минск Национальный', city: 'Минск', distanceKm: 42, toCity: 'Автобус-экспресс до вокзала, маршрутки, такси' }],
  th: [
    { iata: 'BKK', lat: 13.69, lng: 100.7501, name: 'Суварнабхуми', city: 'Бангкок', distanceKm: 30, toCity: 'Airport Rail Link до Пхая Тай, такси по счётчику' },
    { iata: 'DMK', lat: 13.9126, lng: 100.6068, name: 'Дон Мыанг', city: 'Бангкок (лоукостеры)', distanceKm: 24, toCity: 'Автобусы A1–A4, поезд' },
    { iata: 'HKT', lat: 8.1132, lng: 98.3169, name: 'Пхукет', city: 'Пхукет', distanceKm: 32, toCity: 'Smart Bus, минивэны, такси' },
  ],
  ae: [
    { iata: 'DXB', lat: 25.2532, lng: 55.3657, name: 'Дубай Интернешнл', city: 'Дубай', distanceKm: 5, toCity: 'Метро красная линия прямо из терминалов' },
    { iata: 'AUH', lat: 24.433, lng: 54.6511, name: 'Зайд (Абу-Даби)', city: 'Абу-Даби', distanceKm: 30, toCity: 'Автобус A1, такси' },
  ],
  eg: [
    { iata: 'CAI', lat: 30.1219, lng: 31.4056, name: 'Каир', city: 'Каир', distanceKm: 22, toCity: 'Автобус, такси; метро не доходит до терминалов' },
    { iata: 'HRG', lat: 27.1783, lng: 33.7994, name: 'Хургада', city: 'Хургада', distanceKm: 6, toCity: 'Трансфер отеля, такси' },
    { iata: 'SSH', lat: 27.9773, lng: 34.395, name: 'Шарм-эль-Шейх', city: 'Шарм-эль-Шейх', distanceKm: 10, toCity: 'Трансфер отеля, такси' },
  ],
  rs: [{ iata: 'BEG', lat: 44.8184, lng: 20.3091, name: 'Никола Тесла', city: 'Белград', distanceKm: 18, toCity: 'Автобус A1, городской №72, такси по фиксированным зонам' }],
  me: [
    { iata: 'TIV', lat: 42.4047, lng: 18.7233, name: 'Тиват', city: 'Тиват', distanceKm: 4, toCity: 'Такси, трансфер; до Будвы и Котора — 20–40 минут' },
    { iata: 'TGD', lat: 42.3594, lng: 19.2519, name: 'Подгорица', city: 'Подгорица', distanceKm: 11, toCity: 'Такси; автобус ходит редко' },
  ],
  jp: [
    { iata: 'NRT', lat: 35.772, lng: 140.3929, name: 'Нарита', city: 'Токио', distanceKm: 60, toCity: 'Narita Express, Keisei Skyliner, автобусы' },
    { iata: 'HND', lat: 35.5494, lng: 139.7798, name: 'Ханэда', city: 'Токио', distanceKm: 15, toCity: 'Монорельс Tokyo Monorail, линия Keikyu' },
    { iata: 'KIX', lat: 34.4347, lng: 135.244, name: 'Кансай', city: 'Осака', distanceKm: 40, toCity: 'Экспресс Haruka, Nankai Rapi:t' },
  ],
  kr: [{ iata: 'ICN', lat: 37.4602, lng: 126.4407, name: 'Инчхон', city: 'Сеул', distanceKm: 48, toCity: 'AREX (экспресс и обычный), автобусы-лимузины' }],
  id: [
    { iata: 'DPS', lat: -8.7482, lng: 115.1675, name: 'Нгурах-Рай', city: 'Денпасар (Бали)', distanceKm: 13, toCity: 'Такси по счётчику, приложения, трансфер' },
    { iata: 'CGK', lat: -6.1256, lng: 106.6559, name: 'Сукарно-Хатта', city: 'Джакарта', distanceKm: 20, toCity: 'Airport Rail Link, автобусы DAMRI' },
  ],
  vn: [
    { iata: 'HAN', lat: 21.2212, lng: 105.8072, name: 'Нойбай', city: 'Ханой', distanceKm: 27, toCity: 'Автобус 86, такси' },
    { iata: 'SGN', lat: 10.8188, lng: 106.652, name: 'Таншоннят', city: 'Хошимин', distanceKm: 8, toCity: 'Автобус 109, такси' },
    { iata: 'DAD', lat: 16.0439, lng: 108.1994, name: 'Дананг', city: 'Дананг', distanceKm: 3, toCity: 'Такси; аэропорт почти в городе' },
  ],
  in: [
    { iata: 'DEL', lat: 28.5562, lng: 77.1, name: 'Индира Ганди', city: 'Дели', distanceKm: 16, toCity: 'Метро Airport Express, преоплаченное такси' },
    { iata: 'BOM', lat: 19.0896, lng: 72.8656, name: 'Чатрапати Шиваджи', city: 'Мумбаи', distanceKm: 8, toCity: 'Преоплаченное такси, приложения' },
    { iata: 'GOI', lat: 15.3808, lng: 73.8314, name: 'Даболим', city: 'Гоа', distanceKm: 30, toCity: 'Преоплаченное такси' },
  ],
  lk: [{ iata: 'CMB', lat: 7.1808, lng: 79.8841, name: 'Бандаранаике', city: 'Коломбо', distanceKm: 32, toCity: 'Экспресс-автобус, такси' }],
  mv: [{ iata: 'MLE', lat: 4.1918, lng: 73.5291, name: 'Велана', city: 'Мале', distanceKm: 2, toCity: 'Паром до Мале; до курортов — катер или гидросамолёт от отеля' }],
  it: [
    { iata: 'FCO', lat: 41.8003, lng: 12.2389, name: 'Фьюмичино', city: 'Рим', distanceKm: 32, toCity: 'Leonardo Express до Термини, региональный поезд FL1' },
    { iata: 'MXP', lat: 45.6306, lng: 8.7281, name: 'Мальпенса', city: 'Милан', distanceKm: 50, toCity: 'Malpensa Express, автобусы' },
    { iata: 'VCE', lat: 45.5053, lng: 12.3519, name: 'Марко Поло', city: 'Венеция', distanceKm: 13, toCity: 'Автобус ATVO, водный автобус Alilaguna' },
  ],
  fr: [
    { iata: 'CDG', lat: 49.0097, lng: 2.5479, name: 'Шарль де Голль', city: 'Париж', distanceKm: 25, toCity: 'RER B, автобусы Roissybus' },
    { iata: 'ORY', lat: 48.7233, lng: 2.3794, name: 'Орли', city: 'Париж', distanceKm: 18, toCity: 'Orlyval + RER B, трамвай T7' },
  ],
  es: [
    { iata: 'BCN', lat: 41.2974, lng: 2.0833, name: 'Эль-Прат', city: 'Барселона', distanceKm: 15, toCity: 'Aerobús, метро L9, электричка R2' },
    { iata: 'MAD', lat: 40.4936, lng: -3.5668, name: 'Барахас', city: 'Мадрид', distanceKm: 13, toCity: 'Метро линия 8, экспресс-автобус' },
  ],
  de: [
    { iata: 'BER', lat: 52.3667, lng: 13.5033, name: 'Бранденбург', city: 'Берлин', distanceKm: 24, toCity: 'FEX, региональные поезда, S-Bahn S9/S45' },
    { iata: 'MUC', lat: 48.3537, lng: 11.775, name: 'Франц Йозеф Штраус', city: 'Мюнхен', distanceKm: 35, toCity: 'S-Bahn S1 и S8, Lufthansa Express Bus' },
  ],
  gr: [{ iata: 'ATH', lat: 37.9364, lng: 23.9445, name: 'Элефтериос Венизелос', city: 'Афины', distanceKm: 33, toCity: 'Метро линия 3, автобус X95, пригородный поезд' }],
  cz: [{ iata: 'PRG', lat: 50.1008, lng: 14.26, name: 'Вацлава Гавела', city: 'Прага', distanceKm: 17, toCity: 'Автобус 119 до метро Nádraží Veleslavín, Airport Express' }],
  hu: [{ iata: 'BUD', lat: 47.4298, lng: 19.2611, name: 'Ференц Лист', city: 'Будапешт', distanceKm: 22, toCity: 'Автобус 100E прямо до центра' }],
  us: [
    { iata: 'JFK', lat: 40.6413, lng: -73.7781, name: 'Джона Кеннеди', city: 'Нью-Йорк', distanceKm: 25, toCity: 'AirTrain + метро/LIRR' },
    { iata: 'EWR', lat: 40.6895, lng: -74.1745, name: 'Ньюарк', city: 'Нью-Йорк', distanceKm: 26, toCity: 'AirTrain + NJ Transit' },
  ],
  gb: [
    { iata: 'LHR', lat: 51.47, lng: -0.4543, name: 'Хитроу', city: 'Лондон', distanceKm: 24, toCity: 'Elizabeth line, Piccadilly line, Heathrow Express' },
    { iata: 'LGW', lat: 51.1537, lng: -0.1821, name: 'Гатвик', city: 'Лондон', distanceKm: 45, toCity: 'Gatwick Express, Thameslink' },
  ],
  cn: [
    { iata: 'PEK', lat: 40.0799, lng: 116.6031, name: 'Столичный (Шоуду)', city: 'Пекин', distanceKm: 26, toCity: 'Airport Express до Дунчжимэнь, автобусы' },
    { iata: 'PKX', lat: 39.5098, lng: 116.4105, name: 'Дасин', city: 'Пекин', distanceKm: 46, toCity: 'Daxing Airport Express, скоростной поезд' },
    { iata: 'PVG', lat: 31.1443, lng: 121.8083, name: 'Пудун', city: 'Шанхай', distanceKm: 30, toCity: 'Маглев до Лунъян, метро линия 2' },
  ],
  china: [
    { iata: 'DYG', lat: 29.1028, lng: 110.4433, name: 'Хэхуа (Чжанцзяцзе)', city: 'Чжанцзяцзе', distanceKm: 5, toCity: 'Автобус до автовокзала, такси' },
    { iata: 'PEK', lat: 40.0799, lng: 116.6031, name: 'Столичный (Шоуду)', city: 'Пекин', distanceKm: 26, toCity: 'Airport Express до Дунчжимэнь' },
  ],
  ru: [
    { iata: 'LED', lat: 59.8003, lng: 30.2625, name: 'Пулково', city: 'Санкт-Петербург', distanceKm: 17, toCity: 'Автобус №39 до метро «Московская», такси' },
  ],
  rossiya: [
    { iata: 'LED', lat: 59.8003, lng: 30.2625, name: 'Пулково', city: 'Санкт-Петербург', distanceKm: 17, toCity: 'Автобус №39 до метро «Московская», такси' },
  ],
};

/**
 * Аэропорты вылета для городов из `travel/destinations.ts` → ORIGINS.
 *
 * Здесь, в отличие от аэропортов прилёта, заполнены `parking` и `lateNight`:
 * машину оставляют там, откуда улетают, и возвращаются ночью тоже сюда.
 */
export const DEPARTURE_AIRPORTS: Record<string, Airport[]> = {
  MOW: [
    {
      iata: 'SVO', lat: 55.9726, lng: 37.4146, name: 'Шереметьево', city: 'Москва', distanceKm: 30,
      toCity: 'Аэроэкспресс с Белорусского вокзала',
      lateNight: 'Аэроэкспресс и метро ночью не работают. Остаются ночные автобусы от терминалов и такси.',
      parking: [
        { title: 'Шереметьево Паркинг — бронь и онлайн-оплата', url: 'https://parking.svo.su/', note: 'Официальный паркинг аэропорта: видно свободные места в реальном времени, место бронируется и оплачивается онлайн.' },
      ],
    },
    {
      iata: 'DME', lat: 55.4088, lng: 37.9063, name: 'Домодедово', city: 'Москва', distanceKm: 45,
      toCity: 'Аэроэкспресс с Павелецкого вокзала',
      lateNight: 'Ночью — автобус до метро «Домодедовская» и такси; аэроэкспресс не ходит.',
      parking: [
        { title: 'Парковки Домодедово — бронь и оплата', url: 'https://parking.dme.ru/', note: 'Официальный сервис аэропорта: выбор парковки, бронирование и оплата.' },
        { title: 'Тарифы и схема проезда', url: 'https://www.dme.ru/parkovka/', note: 'Есть крытые и открытые; долгосрочные дешевле в пересчёте на сутки, до терминала — шаттл.' },
      ],
    },
    {
      iata: 'VKO', lat: 55.5915, lng: 37.2615, name: 'Внуково', city: 'Москва', distanceKm: 28,
      toCity: 'Аэроэкспресс с Киевского вокзала, метро «Внуково»',
      lateNight: 'Метро «Внуково» и аэроэкспресс ночью закрыты — ночные автобусы и такси.',
      parking: [
        { title: 'Парковки Внуково — онлайн-оплата', url: 'https://www.vnukovo.ru/ru/parking/', note: 'Официальный сервис аэропорта: оплата парковки онлайн.' },
        { title: 'Тарифы и как проехать', url: 'https://www.vnukovo.ru/ru/for-passengers/kak-dobratsya/parkovka/', note: 'Ближние стоянки у терминала, долгосрочная — отдельной зоной с бесплатным подвозом.' },
      ],
    },
  ],
  LED: [
    {
      iata: 'LED', lat: 59.8003, lng: 30.2625, name: 'Пулково', city: 'Санкт-Петербург', distanceKm: 17,
      toCity: 'Автобус №39 до метро «Московская»',
      lateNight: 'Ночной автобус №39Э до «Московской» ходит и после закрытия метро; иначе такси.',
      parking: [
        { title: 'Транспорт и парковки Пулково', url: 'https://pulkovoairport.ru/transport/', note: 'Привокзальные — для встречающих, для поездки на неделю берут долгосрочную.' },
      ],
    },
  ],
  SVX: [
    {
      iata: 'SVX', lat: 56.7431, lng: 60.8027, name: 'Кольцово', city: 'Екатеринбург', distanceKm: 16,
      toCity: 'Автобус №1, такси',
      lateNight: 'Ночью только такси.',
      parking: [{ title: 'Парковки аэропорта Кольцово', url: 'https://ar-svx.ru/parking/', note: 'Есть краткосрочные у терминалов и долгосрочная зона.' }],
    },
  ],
  KZN: [
    {
      iata: 'KZN', lat: 55.6062, lng: 49.2787, name: 'Казань', city: 'Казань', distanceKm: 26,
      toCity: 'Аэроэкспресс до ж/д вокзала',
      lateNight: 'Аэроэкспресс ходит по расписанию с большими интервалами — ночью проще такси.',
      parking: [
        { title: 'Парковки аэропорта Казань', url: 'https://kazan.aero/services/parking/', note: 'Долгосрочная парковка дешевле привокзальной при поездке от нескольких дней.' },
        { title: 'Парковка P7 — оплата онлайн', url: 'https://parking.kazan.aero/', note: 'Оплатить место можно заранее, не стоя у шлагбаума.' },
      ],
    },
  ],
  OVB: [
    {
      iata: 'OVB', lat: 55.0126, lng: 82.6507, name: 'Толмачёво', city: 'Новосибирск', distanceKm: 17,
      toCity: 'Автобус №111э, такси',
      lateNight: 'Ночью только такси.',
      parking: [{ title: 'Парковки Толмачёво: тарифы и правила', url: 'https://tolmachevo.ru/transport/parking/tariff/', note: 'Первые минуты обычно бесплатны — этого хватает, чтобы высадить пассажира.' }],
    },
  ],
  AER: [
    {
      iata: 'AER', lat: 43.4499, lng: 39.9566, name: 'Сочи (Адлер)', city: 'Сочи', distanceKm: 28,
      toCity: 'Электричка «Ласточка» до Сочи и Адлера',
      lateNight: 'Между «Ласточками» ночью большие перерывы — уточняйте расписание или берите такси.',
      // ⚠️ Парковка Сочи НЕ УКАЗАНА намеренно. Сайт аэропорта (aer.aero) не
      // открывается ни curl'ом, ни браузером — проверить адрес нечем, а в
      // поисковой выдаче первыми идут сайты-двойники («справочно-информационные»
      // домены вроде aeraero.ru), которые легко принять за официальный. Ставить
      // непроверенную ссылку в раздел, где человек ищет, куда деть машину на
      // неделю, нельзя: §1 — лучше не показать ничего, чем показать наугад.
      // Вернуть блок, когда кто-то откроет официальный сайт и возьмёт адрес оттуда.
    },
  ],
};

export const arrivalAirports = (countrySlug: string): Airport[] =>
  ARRIVAL_AIRPORTS[countrySlug] ?? [];

export const departureAirports = (originIata: string): Airport[] =>
  DEPARTURE_AIRPORTS[originIata] ?? [];
