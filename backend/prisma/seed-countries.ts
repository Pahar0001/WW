/**
 * Seed: ознакомительные поездки по странам сообщества.
 *
 * REAL DATA POLICY:
 *  - Это ОЗНАКОМИТЕЛЬНЫЕ маршруты: общее описание страны, реальные известные
 *    места и общий сезон. Без выдуманных цен, точных сроков и координат.
 *  - Детальный план по дням (с точками на карте и бюджетом) пользователь
 *    собирает в конструкторе поездки; здесь его нет намеренно.
 *  - Hero-изображения берутся из Википедии (реальный атрибутируемый источник).
 */
import { PrismaClient } from '@prisma/client';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchOnce(title: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`,
      { signal: ctrl.signal, headers: { 'User-Agent': 'Vela/0.1 (seed; contact admin@velatrips.ru)' } },
    );
    clearTimeout(timer);
    if (res.status === 429) return '__retry__';
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
  } catch {
    return '__retry__'; // сеть/таймаут → повторить
  }
}

// С повтором и паузами — чтобы не ловить rate-limit Википедии.
async function fetchWikiImage(title: string): Promise<string | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetchOnce(title);
    if (r === '__retry__') {
      await sleep(600 * (attempt + 1));
      continue;
    }
    return r;
  }
  return null;
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
}

// Китай ('cn') намеренно пропущен — для него есть флагманский маршрут
// «China — The Floating Mountains». 'other' — не страна.
const COUNTRIES: CountrySeed[] = [
  { code: 'ru', name: 'Россия', landmark: "Saint Basil's Cathedral", title: 'Россия — от Петербурга до Байкала', subtitle: 'Столицы, Золотое кольцо и великая природа', summary: 'Имперский Петербург, златоглавая Москва и природные чудеса — от Байкала до Кавказа.', highlights: ['Санкт-Петербург', 'Москва и Золотое кольцо', 'Байкал', 'Кавказ и Сочи'], bestTime: 'Лето — для природы и севера; зима — для городов и снежного отдыха.', seasonLabel: 'Лето / зима', durationDays: 10 },
  { code: 'tr', name: 'Турция', landmark: 'Hagia Sophia', title: 'Турция — два континента и море', subtitle: 'Стамбул, Каппадокия и средиземноморские пляжи', summary: 'Стамбул на двух континентах, воздушные шары Каппадокии, античность и знаменитая кухня.', highlights: ['Стамбул', 'Каппадокия', 'Памуккале', 'Пляжи Анталии'], bestTime: 'Апрель–июнь и сентябрь–октябрь мягко; лето — пляжный пик.', seasonLabel: 'Весна и осень', durationDays: 8 },
  { code: 'ge', name: 'Грузия', landmark: 'Gergeti Trinity Church', title: 'Грузия — горы, вино и гостеприимство', subtitle: 'Тбилиси, Казбеги и Кахетия', summary: 'Колоритный Тбилиси, башни Сванетии, вино Кахетии и радушие Кавказа.', highlights: ['Тбилиси', 'Казбеги', 'Сванетия', 'Кахетия и вино'], bestTime: 'Май–июнь и сентябрь–октябрь; горы — лето, вино — осень.', seasonLabel: 'Весна и осень', durationDays: 7 },
  { code: 'am', name: 'Армения', landmark: 'Tatev Monastery', title: 'Армения — древние монастыри в горах', subtitle: 'Ереван, Гегард, Севан и Татев', summary: 'Одна из старейших христианских стран: монастыри среди гор, озеро Севан и тёплый приём.', highlights: ['Ереван', 'Гегард и Гарни', 'Озеро Севан', 'Татев'], bestTime: 'Май–июнь и сентябрь–октябрь.', seasonLabel: 'Весна и осень', durationDays: 6 },
  { code: 'az', name: 'Азербайджан', landmark: 'Flame Towers', title: 'Азербайджан — ветер, огонь и старый город', subtitle: 'Баку, Ичери-шехер и Гобустан', summary: 'Футуристичный Баку и старый город, петроглифы Гобустана и природа от гор до полупустынь.', highlights: ['Баку и Ичери-шехер', 'Гобустан', 'Шеки', 'Габала'], bestTime: 'Апрель–июнь и сентябрь–октябрь.', seasonLabel: 'Весна и осень', durationDays: 5 },
  { code: 'kz', name: 'Казахстан', landmark: 'Bayterek', title: 'Казахстан — степь и горы Тянь-Шаня', subtitle: 'Алматы, Астана и Чарынский каньон', summary: 'Современная Астана, зелёный Алматы и природные жемчужины у подножия Тянь-Шаня.', highlights: ['Алматы', 'Астана', 'Чарынский каньон', 'Озеро Кайынды'], bestTime: 'Май–сентябрь для природы; города — круглый год.', seasonLabel: 'Май–сентябрь', durationDays: 7 },
  { code: 'by', name: 'Беларусь', landmark: 'Mir Castle', title: 'Беларусь — замки и озёрный край', subtitle: 'Минск, Мир, Несвиж и Беловежская пуща', summary: 'Ухоженный Минск, средневековые замки, пущи и озёрный край — спокойно и зелено.', highlights: ['Минск', 'Мирский и Несвижский замки', 'Беловежская пуща', 'Браславские озёра'], bestTime: 'Май–сентябрь.', seasonLabel: 'Май–сентябрь', durationDays: 5 },
  { code: 'th', name: 'Таиланд', landmark: 'Wat Arun', title: 'Таиланд — храмы, острова и вкус', subtitle: 'Бангкок, Чиангмай и острова юга', summary: 'Динамичный Бангкок, храмы, острова Андаманского моря и северный Чиангмай.', highlights: ['Бангкок', 'Пхукет и Краби', 'Чиангмай', 'Острова'], bestTime: 'Ноябрь–март — сухой сезон.', seasonLabel: 'Ноябрь–март', durationDays: 10 },
  { code: 'ae', name: 'ОАЭ', landmark: 'Burj Khalifa', title: 'ОАЭ — небоскрёбы и пустыня', subtitle: 'Дубай, Абу-Даби и сафари', summary: 'Витринный Дубай, культурный Абу-Даби, пляжи залива и сафари по золотой пустыне.', highlights: ['Дубай', 'Абу-Даби', 'Сафари по пустыне', 'Пляжи и аквапарки'], bestTime: 'Ноябрь–март; лето очень жаркое.', seasonLabel: 'Ноябрь–март', durationDays: 6 },
  { code: 'eg', name: 'Египет', landmark: 'Giza pyramid complex', title: 'Египет — пирамиды и Красное море', subtitle: 'Гиза, Луксор, Нил и рифы', summary: 'Колыбель древней цивилизации: пирамиды, круиз по Нилу и коралловые рифы Красного моря.', highlights: ['Пирамиды Гизы', 'Луксор', 'Круиз по Нилу', 'Дайвинг в Красном море'], bestTime: 'Октябрь–апрель; лето жаркое.', seasonLabel: 'Октябрь–апрель', durationDays: 8 },
  { code: 'rs', name: 'Сербия', landmark: 'Belgrade Fortress', title: 'Сербия — живые Балканы', subtitle: 'Белград, Нови-Сад и парки', summary: 'Энергичный Белград, монастыри, каньоны и знаменитое балканское радушие.', highlights: ['Белград', 'Нови-Сад', 'Дрвенград и Шарган', 'Национальные парки'], bestTime: 'Май–сентябрь.', seasonLabel: 'Май–сентябрь', durationDays: 5 },
  { code: 'me', name: 'Черногория', landmark: 'Bay of Kotor', title: 'Черногория — Адриатика и горы', subtitle: 'Котор, Будва и Дурмитор', summary: 'Изумрудные бухты Адриатики, старинный Котор и суровые горы Дурмитора рядом.', highlights: ['Котор', 'Будва', 'Свети-Стефан', 'Дурмитор'], bestTime: 'Июнь–сентябрь для моря; май и октябрь — тише.', seasonLabel: 'Июнь–сентябрь', durationDays: 6 },
  { code: 'jp', name: 'Япония', landmark: 'Mount Fuji', title: 'Япония — сакура, храмы и неон', subtitle: 'Токио, Киото и гора Фудзи', summary: 'Гармония традиции и хай-тека: неоновый Токио, храмы Киото, сакура и онсэны.', highlights: ['Токио', 'Киото', 'Гора Фудзи', 'Осака'], bestTime: 'Март–апрель (сакура) и октябрь–ноябрь (клёны).', seasonLabel: 'Весна / осень', durationDays: 9 },
  { code: 'kr', name: 'Южная Корея', landmark: 'Gyeongbokgung', title: 'Южная Корея — динамика и традиция', subtitle: 'Сеул, Пусан и Чеджу', summary: 'Технологичный Сеул, дворцы, кухня и вулканический остров Чеджу.', highlights: ['Сеул', 'Пусан', 'Кёнджу', 'Остров Чеджу'], bestTime: 'Апрель–июнь и сентябрь–ноябрь.', seasonLabel: 'Весна и осень', durationDays: 8 },
  { code: 'id', name: 'Индонезия (Бали)', landmark: 'Tanah Lot', title: 'Индонезия — Бали и вулканы', subtitle: 'Бали, Убуд и вулкан Бромо', summary: 'Духовный Бали, рисовые террасы, вулканы и подводный мир тысяч островов.', highlights: ['Бали', 'Убуд и рисовые террасы', 'Вулкан Бромо', 'Острова Гили'], bestTime: 'Апрель–октябрь — сухой сезон.', seasonLabel: 'Апрель–октябрь', durationDays: 9 },
  { code: 'vn', name: 'Вьетнам', landmark: 'Ha Long Bay', title: 'Вьетнам — от Халонга до Меконга', subtitle: 'Ханой, Хойан и дельта Меконга', summary: 'Бухта Халонг, рисовые долины, старинный Хойан, кофе и уличная кухня.', highlights: ['Ханой и Халонг', 'Хойан', 'Дельта Меконга', 'Сапа'], bestTime: 'Различается по регионам; в целом ноябрь–апрель.', seasonLabel: 'Ноябрь–апрель', durationDays: 10 },
  { code: 'in', name: 'Индия', landmark: 'Taj Mahal', title: 'Индия — краски, форты и Гималаи', subtitle: 'Дели, Агра, Джайпур и Гоа', summary: 'Мир контрастов: Тадж-Махал, форты Раджастана, Гималаи и пляжи Гоа.', highlights: ['Дели и Агра', 'Джайпур', 'Гоа', 'Керала'], bestTime: 'Октябрь–март; лето жаркое, затем муссон.', seasonLabel: 'Октябрь–март', durationDays: 10 },
  { code: 'lk', name: 'Шри-Ланка', landmark: 'Sigiriya', title: 'Шри-Ланка — чай, львиные скалы и океан', subtitle: 'Сигирия, Канди и пляжи юга', summary: 'Древние города, чайные плантации в горах и океанские пляжи острова.', highlights: ['Сигирия', 'Канди', 'Чайные плантации Эллы', 'Пляжи юга'], bestTime: 'Юго-запад — декабрь–март; восток — май–сентябрь.', seasonLabel: 'Декабрь–март', durationDays: 8 },
  { code: 'mv', name: 'Мальдивы', landmark: 'Maldives', title: 'Мальдивы — атоллы и бирюза', subtitle: 'Острова-курорты и снорклинг', summary: 'Атоллы, бирюзовые лагуны, снорклинг и полное уединение над водой.', highlights: ['Атоллы и лагуны', 'Снорклинг и дайвинг', 'Виллы над водой', 'Мале'], bestTime: 'Ноябрь–апрель — сухой сезон.', seasonLabel: 'Ноябрь–апрель', durationDays: 6 },
  { code: 'it', name: 'Италия', landmark: 'Colosseum', title: 'Италия — искусство и вкус', subtitle: 'Рим, Флоренция, Венеция и Амальфи', summary: 'Искусство, история и кухня: Рим, Тоскана, каналы Венеции и Амальфитанское побережье.', highlights: ['Рим', 'Флоренция и Тоскана', 'Венеция', 'Амальфи'], bestTime: 'Апрель–июнь и сентябрь–октябрь.', seasonLabel: 'Весна и осень', durationDays: 8 },
  { code: 'fr', name: 'Франция', landmark: 'Eiffel Tower', title: 'Франция — Париж и Прованс', subtitle: 'Париж, Прованс и Лазурный берег', summary: 'Эталон стиля: Париж, замки Луары, лавандовый Прованс и лазурные берега.', highlights: ['Париж', 'Прованс', 'Лазурный берег', 'Замки Луары'], bestTime: 'Май–июнь и сентябрь.', seasonLabel: 'Весна и осень', durationDays: 8 },
  { code: 'es', name: 'Испания', landmark: 'Sagrada Familia', title: 'Испания — солнце, Гауди и тапас', subtitle: 'Барселона, Мадрид и Андалусия', summary: 'Солнце, ритм и архитектура: Гауди в Барселоне, Андалусия, острова и тапас.', highlights: ['Барселона', 'Мадрид', 'Андалусия', 'Острова'], bestTime: 'Апрель–июнь и сентябрь–октябрь.', seasonLabel: 'Весна и осень', durationDays: 8 },
  { code: 'de', name: 'Германия', landmark: 'Neuschwanstein Castle', title: 'Германия — замки и Альпы', subtitle: 'Берлин, Мюнхен и Нойшванштайн', summary: 'Замки, леса и живые города: Берлин, баварские Альпы и рождественские ярмарки.', highlights: ['Берлин', 'Мюнхен и Альпы', 'Замок Нойшванштайн', 'Рейн и Кёльн'], bestTime: 'Май–сентябрь; декабрь — ярмарки.', seasonLabel: 'Май–сентябрь', durationDays: 7 },
  { code: 'gr', name: 'Греция', landmark: 'Acropolis of Athens', title: 'Греция — античность и острова', subtitle: 'Афины, Санторини и Крит', summary: 'Античность и острова: Акрополь, белоснежные Киклады и лазурное море.', highlights: ['Афины', 'Санторини', 'Миконос', 'Крит'], bestTime: 'Май–июнь и сентябрь–октябрь; лето — пляжный пик.', seasonLabel: 'Весна и осень', durationDays: 7 },
  { code: 'cz', name: 'Чехия', landmark: 'Charles Bridge', title: 'Чехия — сказочная Прага и замки', subtitle: 'Прага, Чески-Крумлов и Карловы Вары', summary: 'Башни Праги, замки Богемии, знаменитое пиво и уютные городки.', highlights: ['Прага', 'Чески-Крумлов', 'Карловы Вары', 'Замки Богемии'], bestTime: 'Май–сентябрь; декабрь — ярмарки.', seasonLabel: 'Май–сентябрь', durationDays: 5 },
  { code: 'hu', name: 'Венгрия', landmark: 'Hungarian Parliament Building', title: 'Венгрия — Будапешт и термы', subtitle: 'Будапешт, купальни и Балатон', summary: 'Величественный Будапешт, термальные купальни, вина и озеро Балатон.', highlights: ['Будапешт', 'Термальные купальни', 'Озеро Балатон', 'Эгер и вино'], bestTime: 'Апрель–июнь и сентябрь–октябрь.', seasonLabel: 'Весна и осень', durationDays: 5 },
  { code: 'us', name: 'США', landmark: 'Statue of Liberty', title: 'США — от океана до океана', subtitle: 'Нью-Йорк, Калифорния и парки', summary: 'Континент возможностей: мегаполисы, национальные парки и дороги от океана до океана.', highlights: ['Нью-Йорк', 'Калифорния', 'Гранд-Каньон', 'Флорида'], bestTime: 'Зависит от региона; весна и осень универсальны.', seasonLabel: 'Весна и осень', durationDays: 12 },
  { code: 'gb', name: 'Великобритания', landmark: 'Big Ben', title: 'Великобритания — Лондон и Шотландия', subtitle: 'Лондон, Эдинбург и графства', summary: 'История и характер: имперский Лондон, шотландские замки и зелёные графства.', highlights: ['Лондон', 'Шотландия и Эдинбург', 'Стоунхендж и Бат', 'Озёрный край'], bestTime: 'Май–сентябрь.', seasonLabel: 'Май–сентябрь', durationDays: 7 },
];

export async function seedCountryTrips(prisma: PrismaClient) {
  let ok = 0;
  for (const c of COUNTRIES) {
    const country = await prisma.country.upsert({
      where: { slug: c.code },
      update: { name: c.name },
      create: { slug: c.code, name: c.name, isoCode: c.code.toUpperCase() },
    });

    const hero = await fetchWikiImage(c.landmark);
    await sleep(250); // мягкая пауза между странами
    const slug = `${c.code}-znakomstvo`;
    const longDescription =
      `${c.summary} ` +
      'Это ознакомительный маршрут: общие ориентиры по стране, ключевые места и сезон. ' +
      'Детальный план по дням — с картой, отелями и бюджетом — соберите под себя в конструкторе поездки.';

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

    await prisma.trip.upsert({ where: { slug }, update: data, create: data });
    ok++;
    // eslint-disable-next-line no-console
    console.log(`  · intro trip: ${c.name}${hero ? '' : ' (no hero image)'}`);
  }
  // eslint-disable-next-line no-console
  console.log(`Seed complete: ${ok} ознакомительных маршрута по странам.`);
}
