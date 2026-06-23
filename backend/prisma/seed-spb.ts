/**
 * Seed: "Санкт-Петербург — Белые ночи и фонтаны" — a PRIVATE trip owned by the
 * Super Admin. Idempotent (upsert by slug); safe to run on every boot.
 *
 * REAL DATA POLICY:
 *  - Coordinates are well-known public landmarks (rounded to 4 decimals),
 *    stored as ESTIMATED. Verify against Wikidata/OSM before treating as VERIFIED.
 *  - No prices/times invented. The rooftop dinner is left as a category choice
 *    with no coordinates (PENDING) — we don't fabricate a specific venue.
 */
import { PrismaClient } from '@prisma/client';

const SRC = 'openstreetmap (approx; verify before VERIFIED)';

interface SpbPlace {
  name: string;
  lat?: number;
  lng?: number;
  description: string;
  howToGet: string;
  tips: string;
  nearby: string;
}
interface SpbDay {
  title: string;
  baseCity: string;
  places: SpbPlace[];
}

const DAYS: SpbDay[] = [
  {
    title: 'День 1 — Ночной Петербург',
    baseCity: 'Санкт-Петербург',
    places: [
      {
        name: 'Московский вокзал',
        lat: 59.9286,
        lng: 30.3625,
        description: 'Точка прибытия в центре города, на площади Восстания у Невского проспекта.',
        howToGet: 'Метро «Площадь Восстания» / «Маяковская»; выход прямо к Невскому.',
        tips: '• Камеры хранения для багажа\n• Отсюда удобно стартовать по Невскому пешком\n• Время: 20–30 мин\nТеги: transport, landmark',
        nearby: 'Площадь Восстания, Невский проспект, Лиговский проспект',
      },
      {
        name: 'Дворцовый мост',
        lat: 59.941,
        lng: 30.3083,
        description: 'Главный разводной мост города; ночью развод крыльев — визитная карточка Петербурга.',
        howToGet: 'Пешком от Эрмитажа вдоль Дворцовой набережной к Неве.',
        tips: '• Развод моста обычно ок. 01:10 (уточняйте расписание сезона)\n• Лучшие виды — с набережных, не с самого моста\n• Время: 30–45 мин\nТеги: bridge, viewpoint, night',
        nearby: 'Эрмитаж, Стрелка В.О., Дворцовая набережная',
      },
      {
        name: 'Стрелка Васильевского острова',
        lat: 59.9444,
        lng: 30.3061,
        description: 'Панорамная точка между рукавами Невы с Ростральными колоннами.',
        howToGet: 'Пешком через Дворцовый мост на Васильевский остров.',
        tips: '• Лучшая ночная панорама на Петропавловку и Эрмитаж\n• Ветрено у воды — возьмите ветровку\n• Время: 30 мин\nТеги: viewpoint, landmark, night',
        nearby: 'Кунсткамера, Биржа, Дворцовый мост',
      },
      {
        name: 'Медный всадник',
        lat: 59.9362,
        lng: 30.3024,
        description: 'Памятник Петру I на Сенатской площади — символ города.',
        howToGet: 'Пешком вдоль набережной от Дворцового моста к Сенатской площади.',
        tips: '• Подсветка вечером\n• Рядом — выход к Неве и Адмиралтейству\n• Время: 15–20 мин\nТеги: monument, landmark',
        nearby: 'Сенатская площадь, Исаакиевский собор, Адмиралтейство',
      },
    ],
  },
  {
    title: 'День 2 — Центр и Петергоф',
    baseCity: 'Санкт-Петербург',
    places: [
      {
        name: 'Казанский собор',
        lat: 59.9343,
        lng: 30.3246,
        description: 'Кафедральный собор с грандиозной колоннадой прямо на Невском проспекте.',
        howToGet: 'Метро «Невский проспект» / «Гостиный двор», 3–5 мин пешком.',
        tips: '• Вход свободный, действующий храм — скромная одежда\n• Время: 30–40 мин\nТеги: cathedral, landmark',
        nearby: 'Невский проспект, Дом Зингера, Спас на Крови',
      },
      {
        name: 'Спас на Крови',
        lat: 59.94,
        lng: 30.329,
        description: 'Храм в русском стиле с уникальными мозаиками на месте гибели Александра II.',
        howToGet: 'Пешком от Казанского собора вдоль канала Грибоедова, ~7 мин.',
        tips: '• Вход платный; внутри — мозаики мирового уровня\n• Утром меньше очередей\n• Время: 45–60 мин\nТеги: church, museum, landmark',
        nearby: 'Канал Грибоедова, Марсово поле, Михайловский сад',
      },
      {
        name: 'Марсово поле',
        lat: 59.9445,
        lng: 30.3327,
        description: 'Большой мемориальный парк с Вечным огнём в самом центре.',
        howToGet: 'Пешком от Спаса на Крови, ~5 мин.',
        tips: '• Хорошее место для отдыха между точками\n• Время: 20–30 мин\nТеги: park, memorial',
        nearby: 'Летний сад, Михайловский замок, Троицкий мост',
      },
      {
        name: 'Летний сад',
        lat: 59.9457,
        lng: 30.3354,
        description: 'Старейший регулярный парк Петербурга со скульптурами и фонтанами.',
        howToGet: 'Пешком от Марсова поля через мост, ~5 мин.',
        tips: '• Вход свободный; закрывается на просушку весной\n• Время: 40–60 мин\nТеги: park, garden',
        nearby: 'Марсово поле, Михайловский замок, Фонтанка',
      },
      {
        name: 'Государственный Эрмитаж',
        lat: 59.9398,
        lng: 30.3146,
        description: 'Один из крупнейших музеев мира в Зимнем дворце на Дворцовой площади.',
        howToGet: 'Метро «Адмиралтейская», 7–10 мин пешком; или вдоль Невы.',
        tips: '• Билеты лучше брать онлайн заранее\n• Полный обход — целый день; выберите 2–3 крыла\n• Время: 2–4 часа\nТеги: museum, landmark',
        nearby: 'Дворцовая площадь, Дворцовый мост, Адмиралтейство',
      },
      {
        name: 'Петергоф',
        lat: 59.8855,
        lng: 29.908,
        description: 'Загородная резиденция с Большим каскадом и парком фонтанов у залива.',
        howToGet: 'Метеор (судно на подводных крыльях) от центра ~30–40 мин, либо электричка/автобус.',
        tips: '• Фонтаны работают сезонно (примерно конец апреля — октябрь)\n• Нижний парк — платный вход\n• Время: 3–4 часа\nТеги: park, palace, fountain',
        nearby: 'Большой дворец, Нижний парк, Финский залив',
      },
      {
        name: 'Исаакиевский собор',
        lat: 59.9342,
        lng: 30.3061,
        description: 'Крупнейший собор города; колоннада даёт круговую панораму центра.',
        howToGet: 'Метро «Адмиралтейская», ~5–7 мин пешком.',
        tips: '• Подъём на колоннаду оплачивается отдельно\n• Закат — лучшее время для панорамы\n• Время: 45–60 мин\nТеги: cathedral, viewpoint',
        nearby: 'Сенатская площадь, Медный всадник, Мариинский дворец',
      },
      {
        name: 'Панорамный ресторан (на выбор)',
        description: 'Ужин с видом на крыши центра — выберите проверенную площадку по рейтингу.',
        howToGet: 'Большинство rooftop-площадок — в районе Невского / Адмиралтейской.',
        tips: '• Бронируйте столик заранее, особенно на закат\n• Конкретное место и цены не выдумываем — выбирайте по актуальному рейтингу\n• Время: 1.5–2 часа\nТеги: restaurant, viewpoint',
        nearby: 'Исаакиевский собор, Невский проспект, Дворцовая площадь',
      },
    ],
  },
  {
    title: 'День 3 — Отъезд',
    baseCity: 'Санкт-Петербург',
    places: [
      {
        name: 'Исаакиевский собор',
        lat: 59.9342,
        lng: 30.3061,
        description: 'Утренний старт у Исаакия перед прогулкой по парадному центру.',
        howToGet: 'Метро «Адмиралтейская», ~5–7 мин пешком.',
        tips: '• Утром меньше людей на площади\n• Время: 20–30 мин\nТеги: cathedral, landmark',
        nearby: 'Сенатская площадь, Адмиралтейство, Медный всадник',
      },
      {
        name: 'Сенатская площадь',
        lat: 59.9357,
        lng: 30.3024,
        description: 'Историческая площадь у Невы с памятником Петру I.',
        howToGet: 'Пешком от Исаакиевского собора, ~3 мин.',
        tips: '• Выход к набережной и Адмиралтейству\n• Время: 15 мин\nТеги: square, landmark',
        nearby: 'Медный всадник, Адмиралтейство, Дворцовая набережная',
      },
      {
        name: 'Адмиралтейство',
        lat: 59.9377,
        lng: 30.3083,
        description: 'Здание со знаменитым золотым шпилем-корабликом, ось трёх проспектов.',
        howToGet: 'Пешком от Сенатской площади вдоль Александровского сада.',
        tips: '• Лучшие виды шпиля — из Александровского сада\n• Время: 15–20 мин\nТеги: landmark, architecture',
        nearby: 'Дворцовая площадь, Александровский сад, Невский проспект',
      },
      {
        name: 'Дворцовая площадь',
        lat: 59.9387,
        lng: 30.3158,
        description: 'Главная площадь города с Александровской колонной и аркой Главного штаба.',
        howToGet: 'Пешком от Адмиралтейства, ~5 мин.',
        tips: '• Простор для фото; уличные артисты днём\n• Время: 20–30 мин\nТеги: square, landmark',
        nearby: 'Эрмитаж, Главный штаб, Дворцовый мост',
      },
      {
        name: 'Петропавловская крепость',
        lat: 59.95,
        lng: 30.3167,
        description: 'Историческое ядро города на Заячьем острове с собором-усыпальницей.',
        howToGet: 'Метро «Горьковская», ~10 мин пешком через Александровский парк.',
        tips: '• Полуденный выстрел пушки в 12:00\n• Вход на территорию свободный, музеи — платно\n• Время: 1.5–2 часа\nТеги: fortress, museum, viewpoint',
        nearby: 'Александровский парк, Биржевой мост, Стрелка В.О.',
      },
      {
        name: 'Александровский парк',
        lat: 59.9533,
        lng: 30.3206,
        description: 'Зелёный парк у крепости — удобная передышка перед дорогой.',
        howToGet: 'Рядом с метро «Горьковская», у выхода из крепости.',
        tips: '• Тень и скамейки; рядом метро\n• Время: 20 мин\nТеги: park',
        nearby: 'Петропавловская крепость, метро Горьковская, Мечеть',
      },
      {
        name: 'Дворцовая набережная',
        lat: 59.9426,
        lng: 30.3247,
        description: 'Парадная набережная Невы вдоль Эрмитажа с видами на Стрелку.',
        howToGet: 'Пешком вдоль Невы от Дворцовой площади.',
        tips: '• Отличные кадры воды и мостов\n• Время: 30 мин\nТеги: embankment, viewpoint',
        nearby: 'Эрмитаж, Летний сад, Троицкий мост',
      },
      {
        name: 'Биржевой мост',
        lat: 59.9472,
        lng: 30.3017,
        description: 'Мост к Стрелке Васильевского острова с панорамой на крепость.',
        howToGet: 'Пешком от Стрелки В.О. или со стороны Петроградской.',
        tips: '• Финальная панорама перед отъездом\n• Время: 15 мин\nТеги: bridge, viewpoint',
        nearby: 'Стрелка В.О., Петропавловская крепость, Кунсткамера',
      },
      {
        name: 'Московский вокзал',
        lat: 59.9286,
        lng: 30.3625,
        description: 'Возвращение к точке отъезда на площади Восстания.',
        howToGet: 'Метро «Площадь Восстания» / «Маяковская».',
        tips: '• Заложите запас времени на дорогу и метро\n• Время: 30 мин\nТеги: transport, landmark',
        nearby: 'Невский проспект, площадь Восстания, Лиговский проспект',
      },
    ],
  },
];

const HIGHLIGHTS = [
  'Разводные мосты над Невой ночью',
  'Стрелка Васильевского острова — лучшая панорама города',
  'Эрмитаж и парадная Дворцовая площадь',
  'Фонтаны и парк Петергофа',
  'Колоннада Исаакиевского собора',
  'Мозаики Спаса на Крови',
  'Петропавловская крепость и полуденный выстрел',
];

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9а-я]+/gi, '-')
      .replace(/^-+|-+$/g, '') || 'spb'
  );
}

export async function seedSpb(prisma: PrismaClient) {
  const TRIP_SLUG = 'sankt-peterburg-belye-nochi';

  const country = await prisma.country.upsert({
    where: { slug: 'rossiya' },
    update: {},
    create: { slug: 'rossiya', name: 'Россия' },
  });
  const region = await prisma.region.upsert({
    where: { countryId_slug: { countryId: country.id, slug: 'main' } },
    update: {},
    create: { countryId: country.id, slug: 'main', name: 'Россия — маршруты' },
  });
  const city = await prisma.city.upsert({
    where: { regionId_slug: { regionId: region.id, slug: 'sankt-peterburg' } },
    update: {},
    create: { regionId: region.id, slug: 'sankt-peterburg', name: 'Санкт-Петербург' },
  });

  const trip = await prisma.trip.upsert({
    where: { slug: TRIP_SLUG },
    update: {
      visibility: 'PRIVATE',
      status: 'PUBLISHED',
      title: 'Санкт-Петербург — Белые ночи и фонтаны',
    },
    create: {
      slug: TRIP_SLUG,
      title: 'Санкт-Петербург — Белые ночи и фонтаны',
      subtitle: '3 дня в имперской столице',
      summary:
        'Три насыщенных дня в Петербурге: ночные мосты и панорамы Невы, парадный центр и Эрмитаж, фонтаны Петергофа. Маршрут собран по дням с точными координатами для карты.',
      longDescription:
        'Компактный городской маршрут на три дня. Первый вечер — ночной Петербург: Дворцовый мост, Стрелка Васильевского острова и Медный всадник. Второй день охватывает парадный центр (Казанский собор, Спас на Крови, Летний сад, Эрмитаж), поездку в Петергоф и закат у Исаакиевского собора. Третий день — неспешная прогулка по историческому ядру с возвращением на вокзал. Цены и точное время в пути не выдумываются; координаты мест — оценочные, проверяйте перед бронированием.',
      highlights: HIGHLIGHTS,
      bestTime: 'Конец мая — июль (белые ночи, работают фонтаны Петергофа).',
      seasonLabel: 'Белые ночи',
      durationDays: 3,
      heroImage:
        'https://upload.wikimedia.org/wikipedia/commons/9/9f/Spilled_blood.jpg',
      visibility: 'PRIVATE',
      status: 'PUBLISHED',
      countryId: country.id,
    },
  });

  // Owner: the Super Admin (by env email, else first SUPER_ADMIN).
  const superAdmin =
    (process.env.SUPERADMIN_EMAIL
      ? await prisma.user.findUnique({ where: { email: process.env.SUPERADMIN_EMAIL } })
      : null) ?? (await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }));
  if (superAdmin) {
    await prisma.tripMember.upsert({
      where: { tripId_userId: { tripId: trip.id, userId: superAdmin.id } },
      update: { role: 'ORGANIZER' },
      create: { tripId: trip.id, userId: superAdmin.id, role: 'ORGANIZER' },
    });
  }

  // Rebuild the itinerary idempotently on the BALANCED variant.
  let variant = await prisma.routeVariant.findFirst({ where: { tripId: trip.id } });
  if (!variant) {
    variant = await prisma.routeVariant.create({
      data: { tripId: trip.id, pace: 'BALANCED', title: 'Сбалансированная' },
    });
  }
  await prisma.day.deleteMany({ where: { variantId: variant.id } });

  for (let i = 0; i < DAYS.length; i++) {
    const d = DAYS[i];
    const day = await prisma.day.create({
      data: { variantId: variant.id, dayNumber: i + 1, title: d.title, baseCity: d.baseCity },
    });
    for (let j = 0; j < d.places.length; j++) {
      const p = d.places[j];
      const place = await prisma.place.create({
        data: {
          cityId: city.id,
          slug: `${slugify(p.name)}-${i}-${j}`,
          name: p.name,
          lat: p.lat ?? null,
          lng: p.lng ?? null,
          description: p.description,
          howToGet: p.howToGet,
          tips: p.tips,
          nearby: p.nearby,
          dataStatus: p.lat != null && p.lng != null ? 'ESTIMATED' : 'PENDING',
          source: SRC,
          trustLevel: 3,
          fetchedAt: new Date(),
        },
      });
      await prisma.dayPlace.create({ data: { dayId: day.id, placeId: place.id, order: j } });
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed complete: Санкт-Петербург (PRIVATE${superAdmin ? `, owner=${superAdmin.email}` : ', no super admin found'}).`,
  );
}
