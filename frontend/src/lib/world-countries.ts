/**
 * Страны мира для карты «Где я был»: код ISO-2, русское название, координаты
 * (для маркеров на глобусе) и континент (группировка в выборе).
 * Список — популярные направления; полноту наращиваем по запросам пользователей.
 */

export interface WorldCountry {
  code: string;
  name: string;
  lat: number;
  lng: number;
  continent: 'Европа' | 'Азия' | 'Африка' | 'Америка' | 'Океания';
}

export const WORLD_COUNTRIES: WorldCountry[] = [
  // ── Европа ──
  { code: 'ru', name: 'Россия', lat: 55.75, lng: 37.62, continent: 'Европа' },
  { code: 'by', name: 'Беларусь', lat: 53.9, lng: 27.56, continent: 'Европа' },
  { code: 'ua', name: 'Украина', lat: 50.45, lng: 30.52, continent: 'Европа' },
  { code: 'ee', name: 'Эстония', lat: 59.44, lng: 24.75, continent: 'Европа' },
  { code: 'lv', name: 'Латвия', lat: 56.95, lng: 24.11, continent: 'Европа' },
  { code: 'lt', name: 'Литва', lat: 54.69, lng: 25.28, continent: 'Европа' },
  { code: 'pl', name: 'Польша', lat: 52.23, lng: 21.01, continent: 'Европа' },
  { code: 'de', name: 'Германия', lat: 52.52, lng: 13.4, continent: 'Европа' },
  { code: 'fr', name: 'Франция', lat: 48.86, lng: 2.35, continent: 'Европа' },
  { code: 'gb', name: 'Великобритания', lat: 51.5, lng: -0.13, continent: 'Европа' },
  { code: 'ie', name: 'Ирландия', lat: 53.35, lng: -6.26, continent: 'Европа' },
  { code: 'es', name: 'Испания', lat: 40.42, lng: -3.7, continent: 'Европа' },
  { code: 'pt', name: 'Португалия', lat: 38.72, lng: -9.14, continent: 'Европа' },
  { code: 'it', name: 'Италия', lat: 41.9, lng: 12.5, continent: 'Европа' },
  { code: 'ch', name: 'Швейцария', lat: 46.95, lng: 7.45, continent: 'Европа' },
  { code: 'at', name: 'Австрия', lat: 48.21, lng: 16.37, continent: 'Европа' },
  { code: 'nl', name: 'Нидерланды', lat: 52.37, lng: 4.9, continent: 'Европа' },
  { code: 'be', name: 'Бельгия', lat: 50.85, lng: 4.35, continent: 'Европа' },
  { code: 'cz', name: 'Чехия', lat: 50.09, lng: 14.42, continent: 'Европа' },
  { code: 'sk', name: 'Словакия', lat: 48.15, lng: 17.11, continent: 'Европа' },
  { code: 'hu', name: 'Венгрия', lat: 47.5, lng: 19.04, continent: 'Европа' },
  { code: 'ro', name: 'Румыния', lat: 44.43, lng: 26.1, continent: 'Европа' },
  { code: 'bg', name: 'Болгария', lat: 42.7, lng: 23.32, continent: 'Европа' },
  { code: 'gr', name: 'Греция', lat: 37.98, lng: 23.73, continent: 'Европа' },
  { code: 'cy', name: 'Кипр', lat: 35.17, lng: 33.36, continent: 'Европа' },
  { code: 'rs', name: 'Сербия', lat: 44.79, lng: 20.45, continent: 'Европа' },
  { code: 'me', name: 'Черногория', lat: 42.42, lng: 18.77, continent: 'Европа' },
  { code: 'hr', name: 'Хорватия', lat: 45.81, lng: 15.98, continent: 'Европа' },
  { code: 'si', name: 'Словения', lat: 46.05, lng: 14.51, continent: 'Европа' },
  { code: 'ba', name: 'Босния и Герцеговина', lat: 43.86, lng: 18.41, continent: 'Европа' },
  { code: 'al', name: 'Албания', lat: 41.33, lng: 19.82, continent: 'Европа' },
  { code: 'mk', name: 'Северная Македония', lat: 41.99, lng: 21.43, continent: 'Европа' },
  { code: 'dk', name: 'Дания', lat: 55.68, lng: 12.57, continent: 'Европа' },
  { code: 'se', name: 'Швеция', lat: 59.33, lng: 18.07, continent: 'Европа' },
  { code: 'no', name: 'Норвегия', lat: 59.91, lng: 10.75, continent: 'Европа' },
  { code: 'fi', name: 'Финляндия', lat: 60.17, lng: 24.94, continent: 'Европа' },
  { code: 'is', name: 'Исландия', lat: 64.15, lng: -21.94, continent: 'Европа' },
  { code: 'md', name: 'Молдова', lat: 47.01, lng: 28.86, continent: 'Европа' },

  // ── Азия и Ближний Восток ──
  { code: 'ge', name: 'Грузия', lat: 41.72, lng: 44.78, continent: 'Азия' },
  { code: 'am', name: 'Армения', lat: 40.18, lng: 44.51, continent: 'Азия' },
  { code: 'az', name: 'Азербайджан', lat: 40.41, lng: 49.87, continent: 'Азия' },
  { code: 'tr', name: 'Турция', lat: 41.01, lng: 28.98, continent: 'Азия' },
  { code: 'il', name: 'Израиль', lat: 32.09, lng: 34.78, continent: 'Азия' },
  { code: 'jo', name: 'Иордания', lat: 31.95, lng: 35.93, continent: 'Азия' },
  { code: 'sa', name: 'Саудовская Аравия', lat: 24.71, lng: 46.68, continent: 'Азия' },
  { code: 'ae', name: 'ОАЭ', lat: 25.2, lng: 55.27, continent: 'Азия' },
  { code: 'qa', name: 'Катар', lat: 25.29, lng: 51.53, continent: 'Азия' },
  { code: 'om', name: 'Оман', lat: 23.59, lng: 58.41, continent: 'Азия' },
  { code: 'kz', name: 'Казахстан', lat: 43.24, lng: 76.95, continent: 'Азия' },
  { code: 'uz', name: 'Узбекистан', lat: 41.31, lng: 69.24, continent: 'Азия' },
  { code: 'kg', name: 'Киргизия', lat: 42.87, lng: 74.59, continent: 'Азия' },
  { code: 'tj', name: 'Таджикистан', lat: 38.56, lng: 68.79, continent: 'Азия' },
  { code: 'mn', name: 'Монголия', lat: 47.89, lng: 106.91, continent: 'Азия' },
  { code: 'cn', name: 'Китай', lat: 39.9, lng: 116.4, continent: 'Азия' },
  { code: 'jp', name: 'Япония', lat: 35.68, lng: 139.69, continent: 'Азия' },
  { code: 'kr', name: 'Южная Корея', lat: 37.57, lng: 126.98, continent: 'Азия' },
  { code: 'in', name: 'Индия', lat: 28.61, lng: 77.21, continent: 'Азия' },
  { code: 'np', name: 'Непал', lat: 27.72, lng: 85.32, continent: 'Азия' },
  { code: 'lk', name: 'Шри-Ланка', lat: 7.29, lng: 80.63, continent: 'Азия' },
  { code: 'mv', name: 'Мальдивы', lat: 4.17, lng: 73.51, continent: 'Азия' },
  { code: 'th', name: 'Таиланд', lat: 13.76, lng: 100.5, continent: 'Азия' },
  { code: 'vn', name: 'Вьетнам', lat: 21.03, lng: 105.85, continent: 'Азия' },
  { code: 'kh', name: 'Камбоджа', lat: 11.56, lng: 104.92, continent: 'Азия' },
  { code: 'la', name: 'Лаос', lat: 17.97, lng: 102.6, continent: 'Азия' },
  { code: 'my', name: 'Малайзия', lat: 3.14, lng: 101.69, continent: 'Азия' },
  { code: 'sg', name: 'Сингапур', lat: 1.35, lng: 103.82, continent: 'Азия' },
  { code: 'id', name: 'Индонезия', lat: -8.51, lng: 115.26, continent: 'Азия' },
  { code: 'ph', name: 'Филиппины', lat: 14.6, lng: 120.98, continent: 'Азия' },

  // ── Африка ──
  { code: 'eg', name: 'Египет', lat: 30.04, lng: 31.24, continent: 'Африка' },
  { code: 'ma', name: 'Марокко', lat: 33.97, lng: -6.85, continent: 'Африка' },
  { code: 'tn', name: 'Тунис', lat: 36.81, lng: 10.18, continent: 'Африка' },
  { code: 'ke', name: 'Кения', lat: -1.29, lng: 36.82, continent: 'Африка' },
  { code: 'tz', name: 'Танзания', lat: -6.16, lng: 35.75, continent: 'Африка' },
  { code: 'za', name: 'ЮАР', lat: -33.92, lng: 18.42, continent: 'Африка' },
  { code: 'mu', name: 'Маврикий', lat: -20.16, lng: 57.5, continent: 'Африка' },
  { code: 'sc', name: 'Сейшелы', lat: -4.62, lng: 55.45, continent: 'Африка' },

  // ── Америка ──
  { code: 'us', name: 'США', lat: 40.71, lng: -74.01, continent: 'Америка' },
  { code: 'ca', name: 'Канада', lat: 45.42, lng: -75.7, continent: 'Америка' },
  { code: 'mx', name: 'Мексика', lat: 19.43, lng: -99.13, continent: 'Америка' },
  { code: 'cu', name: 'Куба', lat: 23.11, lng: -82.37, continent: 'Америка' },
  { code: 'do', name: 'Доминикана', lat: 18.49, lng: -69.93, continent: 'Америка' },
  { code: 'br', name: 'Бразилия', lat: -22.91, lng: -43.17, continent: 'Америка' },
  { code: 'ar', name: 'Аргентина', lat: -34.6, lng: -58.38, continent: 'Америка' },
  { code: 'cl', name: 'Чили', lat: -33.45, lng: -70.67, continent: 'Америка' },
  { code: 'pe', name: 'Перу', lat: -12.05, lng: -77.04, continent: 'Америка' },
  { code: 'co', name: 'Колумбия', lat: 4.71, lng: -74.07, continent: 'Америка' },

  // ── Океания ──
  { code: 'au', name: 'Австралия', lat: -33.87, lng: 151.21, continent: 'Океания' },
  { code: 'nz', name: 'Новая Зеландия', lat: -36.85, lng: 174.76, continent: 'Океания' },
  { code: 'fj', name: 'Фиджи', lat: -18.12, lng: 178.45, continent: 'Океания' },
];

export const WORLD_BY_CODE = new Map(WORLD_COUNTRIES.map((c) => [c.code, c]));
