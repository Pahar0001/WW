// Country rooms for the community board. A curated, broad list oriented at
// RU-speaking travellers (visa/documents context), decoupled from the Trip
// catalogue so every popular destination has a room even without a seeded trip.
// `code` is the room key stored on CommunityMessage.country.

export interface CommunityCountry {
  code: string;
  name: string;
  flag: string;
}

export const COMMUNITY_COUNTRIES: CommunityCountry[] = [
  { code: 'ru', name: 'Россия', flag: '🇷🇺' },
  { code: 'tr', name: 'Турция', flag: '🇹🇷' },
  { code: 'ge', name: 'Грузия', flag: '🇬🇪' },
  { code: 'am', name: 'Армения', flag: '🇦🇲' },
  { code: 'az', name: 'Азербайджан', flag: '🇦🇿' },
  { code: 'kz', name: 'Казахстан', flag: '🇰🇿' },
  { code: 'by', name: 'Беларусь', flag: '🇧🇾' },
  { code: 'th', name: 'Таиланд', flag: '🇹🇭' },
  { code: 'ae', name: 'ОАЭ', flag: '🇦🇪' },
  { code: 'eg', name: 'Египет', flag: '🇪🇬' },
  { code: 'rs', name: 'Сербия', flag: '🇷🇸' },
  { code: 'me', name: 'Черногория', flag: '🇲🇪' },
  { code: 'cn', name: 'Китай', flag: '🇨🇳' },
  { code: 'jp', name: 'Япония', flag: '🇯🇵' },
  { code: 'kr', name: 'Южная Корея', flag: '🇰🇷' },
  { code: 'id', name: 'Индонезия (Бали)', flag: '🇮🇩' },
  { code: 'vn', name: 'Вьетнам', flag: '🇻🇳' },
  { code: 'in', name: 'Индия', flag: '🇮🇳' },
  { code: 'lk', name: 'Шри-Ланка', flag: '🇱🇰' },
  { code: 'mv', name: 'Мальдивы', flag: '🇲🇻' },
  { code: 'it', name: 'Италия', flag: '🇮🇹' },
  { code: 'fr', name: 'Франция', flag: '🇫🇷' },
  { code: 'es', name: 'Испания', flag: '🇪🇸' },
  { code: 'de', name: 'Германия', flag: '🇩🇪' },
  { code: 'gr', name: 'Греция', flag: '🇬🇷' },
  { code: 'cz', name: 'Чехия', flag: '🇨🇿' },
  { code: 'hu', name: 'Венгрия', flag: '🇭🇺' },
  { code: 'us', name: 'США', flag: '🇺🇸' },
  { code: 'gb', name: 'Великобритания', flag: '🇬🇧' },
  { code: 'other', name: 'Другие страны', flag: '🌍' },
];

const BY_CODE = new Map(COMMUNITY_COUNTRIES.map((c) => [c.code, c]));

export const isCommunityCountry = (code: string): boolean => BY_CODE.has(code);
export const getCommunityCountry = (code: string): CommunityCountry | undefined => BY_CODE.get(code);
