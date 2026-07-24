/**
 * Seed: ознакомительные поездки по странам сообщества.
 *
 * REAL DATA POLICY:
 *  - Это ОЗНАКОМИТЕЛЬНЫЕ маршруты: общее описание страны, реальные известные
 *    места и общий сезон. Без выдуманных цен и сроков.
 *  - План по дням строится из РЕАЛЬНЫХ мест: фото, координаты и описание каждого
 *    места берутся из Википедии (атрибутируемый источник, sourceUrl сохраняется).
 *    Координаты из Википедии помечаются VERIFIED; если статья не нашлась —
 *    место сохраняется без фото/координат со статусом PENDING.
 *  - Цены/бюджет намеренно не задаются — только под конкретные даты
 *    (перелёты — реальные котировки Aviasales в модуле travel).
 *  - Hero-изображения берутся из Википедии (реальный атрибутируемый источник).
 */
import { PrismaClient } from '@prisma/client';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface WikiSummary {
  image: string | null;
  lat: number | null;
  lng: number | null;
  extract: string | null;
  pageUrl: string | null;
}

async function fetchSummaryOnce(host: string, title: string): Promise<WikiSummary | '__retry__' | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`,
      { signal: ctrl.signal, headers: { 'User-Agent': 'Vela/0.1 (seed; contact admin@velatrips.ru)' } },
    );
    clearTimeout(timer);
    if (res.status === 429) return '__retry__';
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data?.type === 'disambiguation') return null;
    return {
      image: data?.originalimage?.source ?? data?.thumbnail?.source ?? null,
      lat: data?.coordinates?.lat ?? null,
      lng: data?.coordinates?.lon ?? null,
      extract: data?.extract ?? null,
      pageUrl: data?.content_urls?.desktop?.page ?? null,
    };
  } catch {
    return '__retry__'; // сеть/таймаут → повторить
  }
}

// С повтором и паузами — чтобы не ловить rate-limit Википедии.
async function fetchSummary(host: string, title: string): Promise<WikiSummary | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetchSummaryOnce(host, title);
    if (r === '__retry__') {
      await sleep(600 * (attempt + 1));
      continue;
    }
    return r;
  }
  return null;
}

const fetchWikiImage = async (title: string): Promise<string | null> =>
  (await fetchSummary('en.wikipedia.org', title))?.image ?? null;

// Обрезаем википедийное описание до 1–2 предложений (аккуратно, по границе).
function shortExtract(extract: string | null): string | undefined {
  if (!extract) return undefined;
  const clean = extract.replace(/\s+/g, ' ').trim();
  if (clean.length <= 240) return clean;
  const cut = clean.slice(0, 240);
  const lastDot = cut.lastIndexOf('. ');
  return (lastDot > 80 ? cut.slice(0, lastDot + 1) : `${cut.trimEnd()}…`).trim();
}

interface PlanPlace {
  wiki: string; // заголовок статьи ru.wikipedia
  name?: string; // отображаемое имя (по умолчанию — wiki без скобок)
  wikiEn?: string; // фолбэк: статья en.wikipedia (только фото/координаты, без описания)
}
interface PlanSegment {
  city: string; // город базирования (кириллица — попадает в baseCity и ссылки отелей)
  days: number; // сколько дней маршрута занимает сегмент (сумма = durationDays)
  places: PlanPlace[];
}

interface CountrySeed {
  code: string;
  name: string;
  landmark: string; // заголовок статьи en.wikipedia для hero-изображения
  title: string;
  subtitle: string;
  summary: string;
  highlights: string[];
  bestTime: string;
  seasonLabel: string;
  durationDays: number;
  plan: PlanSegment[];
}

// Китай ('cn') намеренно пропущен — для него есть флагманский маршрут
// «China — The Floating Mountains». 'other' — не страна.
const COUNTRIES: CountrySeed[] = [
  {
    code: 'ru', name: 'Россия', landmark: "Saint Basil's Cathedral",
    title: 'Россия — от Петербурга до Байкала', subtitle: 'Столицы, Золотое кольцо и великая природа',
    summary: 'Имперский Петербург, златоглавая Москва и природные чудеса — от Байкала до Кавказа.',
    highlights: ['Санкт-Петербург', 'Москва и Золотое кольцо', 'Байкал', 'Кавказ и Сочи'],
    bestTime: 'Лето — для природы и севера; зима — для городов и снежного отдыха.',
    seasonLabel: 'Лето / зима', durationDays: 10,
    plan: [
      { city: 'Санкт-Петербург', days: 3, places: [{ wiki: 'Государственный Эрмитаж', name: 'Эрмитаж' }, { wiki: 'Петергоф' }, { wiki: 'Исаакиевский собор' }] },
      { city: 'Москва', days: 3, places: [{ wiki: 'Московский Кремль' }, { wiki: 'Красная площадь' }, { wiki: 'Третьяковская галерея' }] },
      { city: 'Иркутск', days: 2, places: [{ wiki: 'Байкал' }, { wiki: 'Ольхон' }] },
      { city: 'Сочи', days: 2, places: [{ wiki: 'Роза Хутор' }, { wiki: 'Сочинский дендрарий', name: 'Дендрарий' }] },
    ],
  },
  {
    code: 'tr', name: 'Турция', landmark: 'Hagia Sophia',
    title: 'Турция — два континента и море', subtitle: 'Стамбул, Каппадокия и средиземноморские пляжи',
    summary: 'Стамбул на двух континентах, воздушные шары Каппадокии, античность и знаменитая кухня.',
    highlights: ['Стамбул', 'Каппадокия', 'Памуккале', 'Пляжи Анталии'],
    bestTime: 'Апрель–июнь и сентябрь–октябрь мягко; лето — пляжный пик.',
    seasonLabel: 'Весна и осень', durationDays: 8,
    plan: [
      { city: 'Стамбул', days: 3, places: [{ wiki: 'Айя-София', name: 'Собор Святой Софии' }, { wiki: 'Мечеть Султанахмет', name: 'Голубая мечеть' }, { wiki: 'Гранд-базар' }] },
      { city: 'Гёреме', days: 3, places: [{ wiki: 'Гёреме' }, { wiki: 'Каппадокия' }, { wiki: 'Ургюп' }] },
      { city: 'Памуккале', days: 1, places: [{ wiki: 'Памуккале' }] },
      { city: 'Анталья', days: 1, places: [{ wiki: 'Анталья' }] },
    ],
  },
  {
    code: 'ge', name: 'Грузия', landmark: 'Gergeti Trinity Church',
    title: 'Грузия — горы, вино и гостеприимство', subtitle: 'Тбилиси, Казбеги и Кахетия',
    summary: 'Колоритный Тбилиси, башни Сванетии, вино Кахетии и радушие Кавказа.',
    highlights: ['Тбилиси', 'Казбеги', 'Сванетия', 'Кахетия и вино'],
    bestTime: 'Май–июнь и сентябрь–октябрь; горы — лето, вино — осень.',
    seasonLabel: 'Весна и осень', durationDays: 7,
    plan: [
      { city: 'Тбилиси', days: 3, places: [{ wiki: 'Нарикала' }, { wiki: 'Мост Мира (Тбилиси)', name: 'Мост Мира' }, { wiki: 'Мтацминда (гора)', name: 'Мтацминда' }] },
      { city: 'Степанцминда', days: 2, places: [{ wiki: 'Казбек' }, { wiki: 'Степанцминда' }] },
      { city: 'Сигнахи', days: 2, places: [{ wiki: 'Сигнахи' }, { wiki: 'Алазанская долина' }] },
    ],
  },
  {
    code: 'am', name: 'Армения', landmark: 'Tatev Monastery',
    title: 'Армения — древние монастыри в горах', subtitle: 'Ереван, Гегард, Севан и Татев',
    summary: 'Одна из старейших христианских стран: монастыри среди гор, озеро Севан и тёплый приём.',
    highlights: ['Ереван', 'Гегард и Гарни', 'Озеро Севан', 'Татев'],
    bestTime: 'Май–июнь и сентябрь–октябрь.', seasonLabel: 'Весна и осень', durationDays: 6,
    plan: [
      { city: 'Ереван', days: 2, places: [{ wiki: 'Каскад (Ереван)', name: 'Каскад' }, { wiki: 'Матенадаран' }] },
      { city: 'Гарни', days: 1, places: [{ wiki: 'Гегард' }, { wiki: 'Гарни (храм)', name: 'Храм Гарни' }] },
      { city: 'Севан', days: 1, places: [{ wiki: 'Севанаванк' }] },
      { city: 'Горис', days: 2, places: [{ wiki: 'Татевский монастырь' }, { wiki: 'Крылья Татева' }] },
    ],
  },
  {
    code: 'az', name: 'Азербайджан', landmark: 'Flame Towers',
    title: 'Азербайджан — ветер, огонь и старый город', subtitle: 'Баку, Ичери-шехер и Гобустан',
    summary: 'Футуристичный Баку и старый город, петроглифы Гобустана и природа от гор до полупустынь.',
    highlights: ['Баку и Ичери-шехер', 'Гобустан', 'Шеки', 'Габала'],
    bestTime: 'Апрель–июнь и сентябрь–октябрь.', seasonLabel: 'Весна и осень', durationDays: 5,
    plan: [
      { city: 'Баку', days: 3, places: [{ wiki: 'Ичери-шехер' }, { wiki: 'Девичья башня (Баку)', name: 'Девичья башня' }, { wiki: 'Пламенные башни' }] },
      { city: 'Гобустан', days: 1, places: [{ wiki: 'Гобустанский заповедник', name: 'Гобустан' }] },
      { city: 'Шеки', days: 1, places: [{ wiki: 'Дворец шекинских ханов' }] },
    ],
  },
  {
    code: 'kz', name: 'Казахстан', landmark: 'Bayterek',
    title: 'Казахстан — степь и горы Тянь-Шаня', subtitle: 'Алматы, Астана и Чарынский каньон',
    summary: 'Современная Астана, зелёный Алматы и природные жемчужины у подножия Тянь-Шаня.',
    highlights: ['Алматы', 'Астана', 'Чарынский каньон', 'Озеро Кайынды'],
    bestTime: 'Май–сентябрь для природы; города — круглый год.', seasonLabel: 'Май–сентябрь', durationDays: 7,
    plan: [
      { city: 'Алматы', days: 3, places: [{ wiki: 'Медеу' }, { wiki: 'Большое Алматинское озеро' }, { wiki: 'Кок-Тобе' }] },
      { city: 'Чарын', days: 1, places: [{ wiki: 'Чарынский каньон' }] },
      { city: 'Саты', days: 1, places: [{ wiki: 'Каинды (озеро)', name: 'Озеро Каинды' }] },
      { city: 'Астана', days: 2, places: [{ wiki: 'Байтерек (монумент)', name: 'Байтерек' }, { wiki: 'Хан-Шатыр' }] },
    ],
  },
  {
    code: 'by', name: 'Беларусь', landmark: 'Mir Castle',
    title: 'Беларусь — замки и озёрный край', subtitle: 'Минск, Мир, Несвиж и Беловежская пуща',
    summary: 'Ухоженный Минск, средневековые замки, пущи и озёрный край — спокойно и зелено.',
    highlights: ['Минск', 'Мирский и Несвижский замки', 'Беловежская пуща', 'Браславские озёра'],
    bestTime: 'Май–сентябрь.', seasonLabel: 'Май–сентябрь', durationDays: 5,
    plan: [
      { city: 'Минск', days: 2, places: [{ wiki: 'Троицкое предместье' }, { wiki: 'Национальная библиотека Белоруссии', name: 'Национальная библиотека' }] },
      { city: 'Мир', days: 2, places: [{ wiki: 'Мирский замок' }, { wiki: 'Несвижский замок' }] },
      { city: 'Каменюки', days: 1, places: [{ wiki: 'Беловежская пуща' }] },
    ],
  },
  {
    code: 'th', name: 'Таиланд', landmark: 'Wat Arun',
    title: 'Таиланд — храмы, острова и вкус', subtitle: 'Бангкок, Чиангмай и острова юга',
    summary: 'Динамичный Бангкок, храмы, острова Андаманского моря и северный Чиангмай.',
    highlights: ['Бангкок', 'Пхукет и Краби', 'Чиангмай', 'Острова'],
    bestTime: 'Ноябрь–март — сухой сезон.', seasonLabel: 'Ноябрь–март', durationDays: 10,
    plan: [
      { city: 'Бангкок', days: 3, places: [{ wiki: 'Большой дворец (Бангкок)', name: 'Большой дворец' }, { wiki: 'Ват-Арун' }, { wiki: 'Ват-Пхо' }] },
      { city: 'Чиангмай', days: 3, places: [{ wiki: 'Чиангмай' }, { wiki: 'Дой-Сутхеп', name: 'Дой Сутхеп' }] },
      { city: 'Пхукет', days: 4, places: [{ wiki: 'Пхукет' }, { wiki: 'Пхипхи' }, { wiki: 'Краби' }, { wiki: 'Симиланские острова' }] },
    ],
  },
  {
    code: 'ae', name: 'ОАЭ', landmark: 'Burj Khalifa',
    title: 'ОАЭ — небоскрёбы и пустыня', subtitle: 'Дубай, Абу-Даби и сафари',
    summary: 'Витринный Дубай, культурный Абу-Даби, пляжи залива и сафари по золотой пустыне.',
    highlights: ['Дубай', 'Абу-Даби', 'Сафари по пустыне', 'Пляжи и аквапарки'],
    bestTime: 'Ноябрь–март; лето очень жаркое.', seasonLabel: 'Ноябрь–март', durationDays: 6,
    plan: [
      { city: 'Дубай', days: 4, places: [{ wiki: 'Бурдж-Халифа' }, { wiki: 'Дубай Молл' }, { wiki: 'Пальма Джумейра' }, { wiki: 'Бурдж-эль-Араб' }] },
      { city: 'Абу-Даби', days: 2, places: [{ wiki: 'Мечеть шейха Зайда' }, { wiki: 'Лувр Абу-Даби' }] },
    ],
  },
  {
    code: 'eg', name: 'Египет', landmark: 'Giza pyramid complex',
    title: 'Египет — пирамиды и Красное море', subtitle: 'Гиза, Луксор, Нил и рифы',
    summary: 'Колыбель древней цивилизации: пирамиды, круиз по Нилу и коралловые рифы Красного моря.',
    highlights: ['Пирамиды Гизы', 'Луксор', 'Круиз по Нилу', 'Дайвинг в Красном море'],
    bestTime: 'Октябрь–апрель; лето жаркое.', seasonLabel: 'Октябрь–апрель', durationDays: 8,
    plan: [
      { city: 'Каир', days: 3, places: [{ wiki: 'Пирамида Хеопса' }, { wiki: 'Большой сфинкс' }, { wiki: 'Каирский египетский музей', name: 'Египетский музей' }] },
      { city: 'Луксор', days: 2, places: [{ wiki: 'Карнак' }, { wiki: 'Долина Царей' }] },
      { city: 'Хургада', days: 3, places: [{ wiki: 'Хургада' }] },
    ],
  },
  {
    code: 'rs', name: 'Сербия', landmark: 'Belgrade Fortress',
    title: 'Сербия — живые Балканы', subtitle: 'Белград, Нови-Сад и парки',
    summary: 'Энергичный Белград, монастыри, каньоны и знаменитое балканское радушие.',
    highlights: ['Белград', 'Нови-Сад', 'Дрвенград и Шарган', 'Национальные парки'],
    bestTime: 'Май–сентябрь.', seasonLabel: 'Май–сентябрь', durationDays: 5,
    plan: [
      { city: 'Белград', days: 3, places: [{ wiki: 'Белградская крепость' }, { wiki: 'Храм Святого Саввы' }, { wiki: 'Скадарлия' }] },
      { city: 'Нови-Сад', days: 1, places: [{ wiki: 'Петроварадинская крепость' }] },
      { city: 'Мокра-Гора', days: 1, places: [{ wiki: 'Дрвенград' }] },
    ],
  },
  {
    code: 'me', name: 'Черногория', landmark: 'Bay of Kotor',
    title: 'Черногория — Адриатика и горы', subtitle: 'Котор, Будва и Дурмитор',
    summary: 'Изумрудные бухты Адриатики, старинный Котор и суровые горы Дурмитора рядом.',
    highlights: ['Котор', 'Будва', 'Свети-Стефан', 'Дурмитор'],
    bestTime: 'Июнь–сентябрь для моря; май и октябрь — тише.', seasonLabel: 'Июнь–сентябрь', durationDays: 6,
    plan: [
      { city: 'Котор', days: 2, places: [{ wiki: 'Котор' }, { wiki: 'Пераст' }] },
      { city: 'Будва', days: 2, places: [{ wiki: 'Будва' }, { wiki: 'Свети-Стефан' }] },
      { city: 'Жабляк', days: 2, places: [{ wiki: 'Дурмитор' }, { wiki: 'Чёрное озеро (Черногория)', name: 'Чёрное озеро' }] },
    ],
  },
  {
    code: 'jp', name: 'Япония', landmark: 'Mount Fuji',
    title: 'Япония — сакура, храмы и неон', subtitle: 'Токио, Киото и гора Фудзи',
    summary: 'Гармония традиции и хай-тека: неоновый Токио, храмы Киото, сакура и онсэны.',
    highlights: ['Токио', 'Киото', 'Гора Фудзи', 'Осака'],
    bestTime: 'Март–апрель (сакура) и октябрь–ноябрь (клёны).', seasonLabel: 'Весна / осень', durationDays: 9,
    plan: [
      { city: 'Токио', days: 3, places: [{ wiki: 'Сибуя (специальный район)', name: 'Сибуя' }, { wiki: 'Сэнсо-дзи' }, { wiki: 'Токийская башня' }] },
      { city: 'Хаконэ', days: 2, places: [{ wiki: 'Фудзияма', name: 'Гора Фудзи' }, { wiki: 'Хаконе (посёлок)', name: 'Хаконэ', wikiEn: 'Hakone' }] },
      { city: 'Киото', days: 3, places: [{ wiki: 'Кинкаку-дзи' }, { wiki: 'Фусими Инари-тайся' }, { wiki: 'Арасияма' }] },
      { city: 'Осака', days: 1, places: [{ wiki: 'Осакский замок' }] },
    ],
  },
  {
    code: 'kr', name: 'Южная Корея', landmark: 'Gyeongbokgung',
    title: 'Южная Корея — динамика и традиция', subtitle: 'Сеул, Пусан и Чеджу',
    summary: 'Технологичный Сеул, дворцы, кухня и вулканический остров Чеджу.',
    highlights: ['Сеул', 'Пусан', 'Кёнджу', 'Остров Чеджу'],
    bestTime: 'Апрель–июнь и сентябрь–ноябрь.', seasonLabel: 'Весна и осень', durationDays: 8,
    plan: [
      { city: 'Сеул', days: 4, places: [{ wiki: 'Кёнбоккун' }, { wiki: 'Чхандоккун' }, { wiki: 'Мёндон' }, { wiki: 'Сеульская башня', name: 'Башня N Seoul', wikiEn: 'N Seoul Tower' }] },
      { city: 'Пусан', days: 2, places: [{ wiki: 'Пусан' }, { wiki: 'Хэундэгу', name: 'Хэундэ' }] },
      { city: 'Чеджу', days: 2, places: [{ wiki: 'Чеджудо' }, { wiki: 'Халласан' }] },
    ],
  },
  {
    code: 'id', name: 'Индонезия (Бали)', landmark: 'Tanah Lot',
    title: 'Индонезия — Бали и вулканы', subtitle: 'Бали, Убуд и вулкан Бромо',
    summary: 'Духовный Бали, рисовые террасы, вулканы и подводный мир тысяч островов.',
    highlights: ['Бали', 'Убуд и рисовые террасы', 'Вулкан Бромо', 'Острова Гили'],
    bestTime: 'Апрель–октябрь — сухой сезон.', seasonLabel: 'Апрель–октябрь', durationDays: 9,
    plan: [
      { city: 'Убуд', days: 3, places: [{ wiki: 'Убуд' }, { wiki: 'Бали' }] },
      { city: 'Кута', days: 2, places: [{ wiki: 'Танах Лот', name: 'Танах-Лот' }, { wiki: 'Улувату', name: 'Храм Улувату', wikiEn: 'Uluwatu Temple' }] },
      { city: 'Проболинго', days: 2, places: [{ wiki: 'Бромо' }] },
      { city: 'Ломбок', days: 2, places: [{ wiki: 'Ломбок' }] },
    ],
  },
  {
    code: 'vn', name: 'Вьетнам', landmark: 'Ha Long Bay',
    title: 'Вьетнам — от Халонга до Меконга', subtitle: 'Ханой, Хойан и дельта Меконга',
    summary: 'Бухта Халонг, рисовые долины, старинный Хойан, кофе и уличная кухня.',
    highlights: ['Ханой и Халонг', 'Хойан', 'Дельта Меконга', 'Сапа'],
    bestTime: 'Различается по регионам; в целом ноябрь–апрель.', seasonLabel: 'Ноябрь–апрель', durationDays: 10,
    plan: [
      { city: 'Ханой', days: 3, places: [{ wiki: 'Ханой' }, { wiki: 'Озеро Возвращённого меча' }] },
      { city: 'Халонг', days: 2, places: [{ wiki: 'Залив Халонг', name: 'Бухта Халонг', wikiEn: 'Hạ Long Bay' }] },
      { city: 'Хойан', days: 2, places: [{ wiki: 'Хойан' }, { wiki: 'Мишон' }] },
      { city: 'Хошимин', days: 3, places: [{ wiki: 'Хошимин' }, { wiki: 'Меконг' }] },
    ],
  },
  {
    code: 'in', name: 'Индия', landmark: 'Taj Mahal',
    title: 'Индия — краски, форты и Гималаи', subtitle: 'Дели, Агра, Джайпур и Гоа',
    summary: 'Мир контрастов: Тадж-Махал, форты Раджастана, Гималаи и пляжи Гоа.',
    highlights: ['Дели и Агра', 'Джайпур', 'Гоа', 'Керала'],
    bestTime: 'Октябрь–март; лето жаркое, затем муссон.', seasonLabel: 'Октябрь–март', durationDays: 10,
    plan: [
      { city: 'Дели', days: 2, places: [{ wiki: 'Красный форт (Дели)', name: 'Красный форт' }, { wiki: 'Кутб-Минар' }] },
      { city: 'Агра', days: 2, places: [{ wiki: 'Тадж-Махал' }, { wiki: 'Агра' }] },
      { city: 'Джайпур', days: 2, places: [{ wiki: 'Хава-Махал' }, { wiki: 'Джайпур' }] },
      { city: 'Гоа', days: 4, places: [{ wiki: 'Гоа' }, { wiki: 'Старый Гоа' }] },
    ],
  },
  {
    code: 'lk', name: 'Шри-Ланка', landmark: 'Sigiriya',
    title: 'Шри-Ланка — чай, львиные скалы и океан', subtitle: 'Сигирия, Канди и пляжи юга',
    summary: 'Древние города, чайные плантации в горах и океанские пляжи острова.',
    highlights: ['Сигирия', 'Канди', 'Чайные плантации Эллы', 'Пляжи юга'],
    bestTime: 'Юго-запад — декабрь–март; восток — май–сентябрь.', seasonLabel: 'Декабрь–март', durationDays: 8,
    plan: [
      { city: 'Дамбулла', days: 2, places: [{ wiki: 'Сигирия' }, { wiki: 'Дамбулла (храм)', name: 'Дамбулла', wikiEn: 'Dambulla cave temple' }] },
      { city: 'Канди', days: 2, places: [{ wiki: 'Канди (Шри-Ланка)', name: 'Канди' }, { wiki: 'Храм Зуба Будды' }] },
      { city: 'Элла', days: 2, places: [{ wiki: 'Элла (Шри-Ланка)', name: 'Элла' }, { wiki: 'Адамов пик' }] },
      { city: 'Галле', days: 2, places: [{ wiki: 'Галле (Шри-Ланка)', name: 'Галле' }, { wiki: 'Мирисса' }] },
    ],
  },
  {
    code: 'mv', name: 'Мальдивы', landmark: 'Maldives',
    title: 'Мальдивы — атоллы и бирюза', subtitle: 'Острова-курорты и снорклинг',
    summary: 'Атоллы, бирюзовые лагуны, снорклинг и полное уединение над водой.',
    highlights: ['Атоллы и лагуны', 'Снорклинг и дайвинг', 'Виллы над водой', 'Мале'],
    bestTime: 'Ноябрь–апрель — сухой сезон.', seasonLabel: 'Ноябрь–апрель', durationDays: 6,
    plan: [
      { city: 'Мале', days: 1, places: [{ wiki: 'Мале' }] },
      { city: 'Атоллы', days: 5, places: [{ wiki: 'Мальдивы' }] },
    ],
  },
  {
    code: 'it', name: 'Италия', landmark: 'Colosseum',
    title: 'Италия — искусство и вкус', subtitle: 'Рим, Флоренция, Венеция и Амальфи',
    summary: 'Искусство, история и кухня: Рим, Тоскана, каналы Венеции и Амальфитанское побережье.',
    highlights: ['Рим', 'Флоренция и Тоскана', 'Венеция', 'Амальфи'],
    bestTime: 'Апрель–июнь и сентябрь–октябрь.', seasonLabel: 'Весна и осень', durationDays: 8,
    plan: [
      { city: 'Рим', days: 3, places: [{ wiki: 'Колизей' }, { wiki: 'Римский форум' }, { wiki: 'Фонтан Треви' }] },
      { city: 'Флоренция', days: 2, places: [{ wiki: 'Санта-Мария-дель-Фьоре' }, { wiki: 'Галерея Уффици' }] },
      { city: 'Венеция', days: 2, places: [{ wiki: 'Площадь Святого Марка' }, { wiki: 'Дворец дожей' }] },
      { city: 'Амальфи', days: 1, places: [{ wiki: 'Амальфитанское побережье' }] },
    ],
  },
  {
    code: 'fr', name: 'Франция', landmark: 'Eiffel Tower',
    title: 'Франция — Париж и Прованс', subtitle: 'Париж, Прованс и Лазурный берег',
    summary: 'Эталон стиля: Париж, замки Луары, лавандовый Прованс и лазурные берега.',
    highlights: ['Париж', 'Прованс', 'Лазурный берег', 'Замки Луары'],
    bestTime: 'Май–июнь и сентябрь.', seasonLabel: 'Весна и осень', durationDays: 8,
    plan: [
      { city: 'Париж', days: 4, places: [{ wiki: 'Эйфелева башня' }, { wiki: 'Лувр' }, { wiki: 'Собор Парижской Богоматери' }, { wiki: 'Монмартр' }] },
      { city: 'Блуа', days: 1, places: [{ wiki: 'Замок Шамбор' }] },
      { city: 'Авиньон', days: 2, places: [{ wiki: 'Авиньон' }, { wiki: 'Экс-ан-Прованс' }] },
      { city: 'Ницца', days: 1, places: [{ wiki: 'Ницца' }] },
    ],
  },
  {
    code: 'es', name: 'Испания', landmark: 'Sagrada Familia',
    title: 'Испания — солнце, Гауди и тапас', subtitle: 'Барселона, Мадрид и Андалусия',
    summary: 'Солнце, ритм и архитектура: Гауди в Барселоне, Андалусия, острова и тапас.',
    highlights: ['Барселона', 'Мадрид', 'Андалусия', 'Острова'],
    bestTime: 'Апрель–июнь и сентябрь–октябрь.', seasonLabel: 'Весна и осень', durationDays: 8,
    plan: [
      { city: 'Барселона', days: 3, places: [{ wiki: 'Храм Святого Семейства' }, { wiki: 'Парк Гуэль' }, { wiki: 'Готический квартал' }] },
      { city: 'Мадрид', days: 2, places: [{ wiki: 'Музей Прадо' }, { wiki: 'Королевский дворец в Мадриде', name: 'Королевский дворец' }] },
      { city: 'Гранада', days: 3, places: [{ wiki: 'Альгамбра' }, { wiki: 'Севилья' }] },
    ],
  },
  {
    code: 'de', name: 'Германия', landmark: 'Neuschwanstein Castle',
    title: 'Германия — замки и Альпы', subtitle: 'Берлин, Мюнхен и Нойшванштайн',
    summary: 'Замки, леса и живые города: Берлин, баварские Альпы и рождественские ярмарки.',
    highlights: ['Берлин', 'Мюнхен и Альпы', 'Замок Нойшванштайн', 'Рейн и Кёльн'],
    bestTime: 'Май–сентябрь; декабрь — ярмарки.', seasonLabel: 'Май–сентябрь', durationDays: 7,
    plan: [
      { city: 'Берлин', days: 3, places: [{ wiki: 'Бранденбургские ворота' }, { wiki: 'Музейный остров' }] },
      { city: 'Мюнхен', days: 2, places: [{ wiki: 'Мариенплац (Мюнхен)', name: 'Мариенплац' }] },
      { city: 'Фюссен', days: 1, places: [{ wiki: 'Нойшванштайн' }] },
      { city: 'Кёльн', days: 1, places: [{ wiki: 'Кёльнский собор' }] },
    ],
  },
  {
    code: 'gr', name: 'Греция', landmark: 'Acropolis of Athens',
    title: 'Греция — античность и острова', subtitle: 'Афины, Санторини и Крит',
    summary: 'Античность и острова: Акрополь, белоснежные Киклады и лазурное море.',
    highlights: ['Афины', 'Санторини', 'Миконос', 'Крит'],
    bestTime: 'Май–июнь и сентябрь–октябрь; лето — пляжный пик.', seasonLabel: 'Весна и осень', durationDays: 7,
    plan: [
      { city: 'Афины', days: 2, places: [{ wiki: 'Афинский Акрополь' }, { wiki: 'Парфенон' }] },
      { city: 'Санторини', days: 3, places: [{ wiki: 'Санторини' }] },
      { city: 'Ираклион', days: 2, places: [{ wiki: 'Кносс' }, { wiki: 'Крит' }] },
    ],
  },
  {
    code: 'cz', name: 'Чехия', landmark: 'Charles Bridge',
    title: 'Чехия — сказочная Прага и замки', subtitle: 'Прага, Чески-Крумлов и Карловы Вары',
    summary: 'Башни Праги, замки Богемии, знаменитое пиво и уютные городки.',
    highlights: ['Прага', 'Чески-Крумлов', 'Карловы Вары', 'Замки Богемии'],
    bestTime: 'Май–сентябрь; декабрь — ярмарки.', seasonLabel: 'Май–сентябрь', durationDays: 5,
    plan: [
      { city: 'Прага', days: 3, places: [{ wiki: 'Карлов мост' }, { wiki: 'Пражский Град' }, { wiki: 'Староместская площадь' }] },
      { city: 'Чески-Крумлов', days: 1, places: [{ wiki: 'Чески-Крумлов' }] },
      { city: 'Карловы Вары', days: 1, places: [{ wiki: 'Карловы Вары' }] },
    ],
  },
  {
    code: 'hu', name: 'Венгрия', landmark: 'Hungarian Parliament Building',
    title: 'Венгрия — Будапешт и термы', subtitle: 'Будапешт, купальни и Балатон',
    summary: 'Величественный Будапешт, термальные купальни, вина и озеро Балатон.',
    highlights: ['Будапешт', 'Термальные купальни', 'Озеро Балатон', 'Эгер и вино'],
    bestTime: 'Апрель–июнь и сентябрь–октябрь.', seasonLabel: 'Весна и осень', durationDays: 5,
    plan: [
      { city: 'Будапешт', days: 4, places: [{ wiki: 'Здание венгерского парламента', name: 'Здание парламента' }, { wiki: 'Рыбацкий бастион' }, { wiki: 'Купальня Сечени' }, { wiki: 'Цепной мост Сечени' }] },
      { city: 'Балатонфюред', days: 1, places: [{ wiki: 'Балатон' }] },
    ],
  },
  {
    code: 'us', name: 'США', landmark: 'Statue of Liberty',
    title: 'США — от океана до океана', subtitle: 'Нью-Йорк, Калифорния и парки',
    summary: 'Континент возможностей: мегаполисы, национальные парки и дороги от океана до океана.',
    highlights: ['Нью-Йорк', 'Калифорния', 'Гранд-Каньон', 'Флорида'],
    bestTime: 'Зависит от региона; весна и осень универсальны.', seasonLabel: 'Весна и осень', durationDays: 12,
    plan: [
      { city: 'Нью-Йорк', days: 4, places: [{ wiki: 'Статуя Свободы' }, { wiki: 'Центральный парк (Нью-Йорк)', name: 'Центральный парк' }, { wiki: 'Таймс-сквер' }, { wiki: 'Бруклинский мост' }] },
      { city: 'Лос-Анджелес', days: 4, places: [{ wiki: 'Голливуд' }, { wiki: 'Санта-Моника' }, { wiki: 'Йосемитский национальный парк' }] },
      { city: 'Лас-Вегас', days: 2, places: [{ wiki: 'Гранд-Каньон' }, { wiki: 'Лас-Вегас' }] },
      { city: 'Майами', days: 2, places: [{ wiki: 'Майами-Бич' }] },
    ],
  },
  {
    code: 'gb', name: 'Великобритания', landmark: 'Big Ben',
    title: 'Великобритания — Лондон и Шотландия', subtitle: 'Лондон, Эдинбург и графства',
    summary: 'История и характер: имперский Лондон, шотландские замки и зелёные графства.',
    highlights: ['Лондон', 'Шотландия и Эдинбург', 'Стоунхендж и Бат', 'Озёрный край'],
    bestTime: 'Май–сентябрь.', seasonLabel: 'Май–сентябрь', durationDays: 7,
    plan: [
      { city: 'Лондон', days: 4, places: [{ wiki: 'Биг-Бен' }, { wiki: 'Лондонский Тауэр' }, { wiki: 'Британский музей' }, { wiki: 'Букингемский дворец' }] },
      { city: 'Солсбери', days: 1, places: [{ wiki: 'Стоунхендж' }] },
      { city: 'Эдинбург', days: 2, places: [{ wiki: 'Эдинбургский замок' }, { wiki: 'Королевская миля' }] },
    ],
  },
];

// Строит читаемый план «по дням» из ключевых мест страны (ориентир, не точный
// маршрут — точки/бюджет пользователь настраивает в конструкторе).
function buildItinerary(highlights: string[], days: number): string {
  if (highlights.length === 0) return '';
  const perStop = Math.max(1, Math.round(days / highlights.length));
  const lines: string[] = [];
  let d = 1;
  highlights.forEach((h, i) => {
    const end = i === highlights.length - 1 ? days : Math.min(days, d + perStop - 1);
    if (d > days) return;
    const range = d >= end ? `День ${d}` : `Дни ${d}–${end}`;
    const lead = i === 0 ? 'Прибытие, акклиматизация и ' : '';
    lines.push(`• ${range} — ${lead}${h}.`);
    d = end + 1;
  });
  return lines.join('\n');
}

// Отображаемое имя места: явное name или заголовок статьи без уточнения в скобках.
const placeName = (p: PlanPlace) => p.name ?? p.wiki.replace(/\s*\(.+\)\s*$/, '');

/**
 * Строит маршрут по дням для поездки: RouteVariant (BALANCED) → Day → Place.
 * Каждое место обогащается данными ru.wikipedia (фото, координаты, описание,
 * ссылка на источник). Возвращает число мест без найденной статьи.
 */
async function buildDays(
  prisma: PrismaClient,
  tripId: string,
  countryId: string,
  code: string,
  plan: PlanSegment[],
): Promise<number> {
  const variant = await prisma.routeVariant.create({
    data: { tripId, pace: 'BALANCED', title: 'Сбалансированная' },
  });
  const region = await prisma.region.upsert({
    where: { countryId_slug: { countryId, slug: 'main' } },
    update: {},
    create: { countryId, slug: 'main', name: 'routes' },
  });

  let missed = 0;
  let dayNumber = 0;
  for (const seg of plan) {
    const citySlug = `city-${code}-${seg.city.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, '-')}`;
    const city = await prisma.city.upsert({
      where: { regionId_slug: { regionId: region.id, slug: citySlug } },
      update: {},
      create: { regionId: region.id, slug: citySlug, name: seg.city },
    });

    // Распределяем места сегмента по его дням (равномерно, лишние дни — свободные).
    const byDay: PlanPlace[][] = Array.from({ length: seg.days }, () => []);
    seg.places.forEach((p, i) => {
      const idx = Math.min(seg.days - 1, Math.floor((i * seg.days) / Math.max(1, seg.places.length)));
      byDay[idx].push(p);
    });

    for (let k = 0; k < seg.days; k++) {
      dayNumber += 1;
      const dayPlaces = byDay[k];
      const title =
        dayNumber === 1
          ? `Прибытие — ${dayPlaces.length ? placeName(dayPlaces[0]) : seg.city}`
          : dayPlaces.length
            ? dayPlaces.map(placeName).join(' · ')
            : `${seg.city}: свободный день`;
      const day = await prisma.day.create({
        data: { variantId: variant.id, dayNumber, title, baseCity: seg.city },
      });
      for (let j = 0; j < dayPlaces.length; j++) {
        const p = dayPlaces[j];
        let wiki = await fetchSummary('ru.wikipedia.org', p.wiki);
        let source = wiki ? 'ru.wikipedia.org' : 'seed-pending';
        let description = shortExtract(wiki?.extract ?? null);
        // Фолбэк: берём фото/координаты из en.wikipedia (описание не берём —
        // англоязычный текст в русском интерфейсе хуже, чем его отсутствие).
        if (!wiki && p.wikiEn) {
          wiki = await fetchSummary('en.wikipedia.org', p.wikiEn);
          if (wiki) {
            source = 'en.wikipedia.org';
            description = undefined;
          }
        }
        await sleep(200); // мягкая пауза — бережём rate-limit Википедии
        if (!wiki) missed += 1;
        const hasCoords = wiki?.lat != null && wiki?.lng != null;
        const data = {
          name: placeName(p),
          description,
          photoUrl: wiki?.image ?? undefined,
          lat: wiki?.lat ?? null,
          lng: wiki?.lng ?? null,
          // Координаты из Википедии — атрибутируемый источник → VERIFIED.
          dataStatus: (hasCoords ? 'VERIFIED' : 'PENDING') as 'VERIFIED' | 'PENDING',
          source,
          sourceUrl: wiki?.pageUrl ?? undefined,
          trustLevel: wiki ? 4 : 3,
          fetchedAt: new Date(),
        };
        // upsert — повторный прогон (после чистки вариантов) не падает на unique.
        const place = await prisma.place.upsert({
          where: { cityId_slug: { cityId: city.id, slug: `${code}-d${dayNumber}-p${j}` } },
          update: data,
          create: { cityId: city.id, slug: `${code}-d${dayNumber}-p${j}`, ...data },
        });
        await prisma.dayPlace.create({ data: { dayId: day.id, placeId: place.id, order: j } });
      }
    }
  }
  return missed;
}

export async function seedCountryTrips(prisma: PrismaClient) {
  let ok = 0;
  for (const c of COUNTRIES) {
    const country = await prisma.country.upsert({
      where: { slug: c.code },
      update: { name: c.name },
      create: { slug: c.code, name: c.name, isoCode: c.code.toUpperCase() },
    });

    const slug = `${c.code}-znakomstvo`;
    const existing = await prisma.trip.findUnique({
      where: { slug },
      select: { id: true, heroImage: true, variants: { select: { id: true }, take: 1 } },
    });

    // Hero тянем только если его ещё нет (бережём сеть на рестартах).
    const hero = existing?.heroImage ?? (await fetchWikiImage(c.landmark));
    if (!existing?.heroImage) await sleep(250);

    const itinerary = buildItinerary(c.highlights, c.durationDays);
    const longDescription =
      `${c.summary}\n\n` +
      `Что успеть за ${c.durationDays} дней. ${c.bestTime} Ниже — примерный план по дням: ` +
      'это ориентир, чтобы почувствовать ритм поездки. Точный маршрут с точками на карте, ' +
      'отелями и бюджетом вы настраиваете под себя в конструкторе.\n\n' +
      'Примерный план по дням:\n' +
      itinerary +
      '\n\nПрактика. Сверьте визовый режим и документы в разделе «Сообщество» по этой стране — ' +
      'там же справка по въезду/выезду и ссылка на посольство. Бюджет и цены рассчитываются под ' +
      'конкретные даты в конструкторе и помечаются как оценка.';

    const data = {
      slug,
      title: c.title,
      subtitle: c.subtitle,
      countryId: country.id,
      status: 'PUBLISHED' as const,
      visibility: 'PUBLIC' as const,
      durationDays: c.durationDays,
      seasonLabel: c.seasonLabel,
      heroImage: hero ?? undefined,
      summary: c.summary,
      longDescription,
      highlights: c.highlights,
      bestTime: c.bestTime,
      // Цены/бюджет намеренно не задаём (Real Data Policy) — только под конкретный план.
    };

    const trip = await prisma.trip.upsert({ where: { slug }, update: data, create: data });

    // План по дням строим один раз (идемпотентно): если у поездки уже есть
    // вариант маршрута — значит, дни на месте (или их правили в редакторе).
    let missNote = '';
    if (!existing?.variants?.length) {
      const missed = await buildDays(prisma, trip.id, country.id, c.code, c.plan);
      missNote = missed ? ` (${missed} мест без статьи Википедии)` : '';
    }

    ok++;
    // eslint-disable-next-line no-console
    console.log(`  · intro trip: ${c.name}${hero ? '' : ' (no hero image)'}${missNote}`);
  }
  // eslint-disable-next-line no-console
  console.log(`Seed complete: ${ok} ознакомительных маршрута по странам.`);
}
