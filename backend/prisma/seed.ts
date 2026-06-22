/**
 * Seed: "China — The Floating Mountains" (Китай 2027), the first Dream Trip.
 *
 * REAL DATA POLICY (enforced here):
 *  - Place names + approximate coordinates: dataStatus ESTIMATED, source noted.
 *    Coordinates are well-known public locations; verify against Wikidata/OSM
 *    before treating as VERIFIED.
 *  - Distances, travel times, prices, hotel/flight costs: NOT invented.
 *    Stored as PENDING (null) and surfaced in the UI as "data pending".
 *  - The 300k–350k RUB envelope is the user's stated target, not a quoted price.
 */
import { PrismaClient, Pace, Prisma } from '@prisma/client';
import { estimateBudget } from '../src/common/budget';

const prisma = new PrismaClient();
const SRC = 'wikidata/openstreetmap (approx; verify before VERIFIED)';

// Real landmark photos come from Wikipedia (a real, attributable source — never
// invented). Map each place slug to an English Wikipedia article title.
const WIKI_TITLE: Record<string, string> = {
  'zhangjiajie-national-forest-park': 'Zhangjiajie National Forest Park',
  'tianzi-mountain': 'Tianzi Mountain',
  'tianmen-mountain': 'Tianmen Mountain',
  'forbidden-city': 'Forbidden City',
  'great-wall-mutianyu': 'Mutianyu',
  'temple-of-heaven': 'Temple of Heaven',
  'terracotta-army': 'Terracotta Army',
  'xian-city-wall': "Fortifications of Xi'an",
  'muslim-quarter': "Great Mosque of Xi'an",
  'west-lake': 'West Lake',
  'lingyin-temple': 'Lingyin Temple',
  'humble-administrators-garden': "Humble Administrator's Garden",
  'pingjiang-road': 'Suzhou',
  'the-bund': 'The Bund',
  'yu-garden': 'Yu Garden',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fetch a landmark photo URL from Wikipedia. Returns null on any failure. */
async function fetchWikiImage(title: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { signal: ctrl.signal, headers: { 'User-Agent': 'Vela/0.1 (seed)' } },
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data: any = await res.json();
    return data?.originalimage?.source ?? data?.thumbnail?.source ?? null;
  } catch {
    return null; // offline / not found -> UI shows a branded placeholder
  }
}

interface PlaceSeed {
  slug: string;
  name: string;
  nameLocal?: string;
  kind: string;
  lat: number;
  lng: number;
  description: string;
}

// City -> key places. Coordinates approximate (ESTIMATED).
const CITIES: Record<
  string,
  { name: string; nameLocal: string; lat: number; lng: number; places: PlaceSeed[] }
> = {
  zhangjiajie: {
    name: 'Zhangjiajie',
    nameLocal: '张家界',
    lat: 29.117,
    lng: 110.479,
    places: [
      { slug: 'zhangjiajie-national-forest-park', name: 'Zhangjiajie National Forest Park', nameLocal: '张家界国家森林公园', kind: 'national-park', lat: 29.315, lng: 110.434, description: 'Sandstone pillar forest; inspiration for the "Avatar" Hallelujah Mountains.' },
      { slug: 'tianzi-mountain', name: 'Tianzi Mountain', nameLocal: '天子山', kind: 'viewpoint', lat: 29.36, lng: 110.47, description: 'Panoramic ridge of towering quartz-sandstone peaks.' },
      { slug: 'tianmen-mountain', name: 'Tianmen Mountain', nameLocal: '天门山', kind: 'viewpoint', lat: 29.05, lng: 110.487, description: 'Cable car, glass skywalk and the natural arch "Heaven\'s Gate".' },
    ],
  },
  beijing: {
    name: 'Beijing',
    nameLocal: '北京',
    lat: 39.904,
    lng: 116.407,
    places: [
      { slug: 'forbidden-city', name: 'Forbidden City', nameLocal: '故宫', kind: 'historic-site', lat: 39.9163, lng: 116.397, description: 'Imperial palace complex of the Ming and Qing dynasties.' },
      { slug: 'great-wall-mutianyu', name: 'Great Wall (Mutianyu)', nameLocal: '慕田峪长城', kind: 'historic-site', lat: 40.431, lng: 116.564, description: 'Restored, less-crowded section of the Great Wall.' },
      { slug: 'temple-of-heaven', name: 'Temple of Heaven', nameLocal: '天坛', kind: 'historic-site', lat: 39.882, lng: 116.406, description: 'Ming-era imperial sacrificial complex set in a large park.' },
    ],
  },
  xian: {
    name: "Xi'an",
    nameLocal: '西安',
    lat: 34.342,
    lng: 108.94,
    places: [
      { slug: 'terracotta-army', name: 'Terracotta Army', nameLocal: '兵马俑', kind: 'historic-site', lat: 34.385, lng: 109.279, description: 'Qin Shi Huang\'s funerary army of life-size clay soldiers.' },
      { slug: 'xian-city-wall', name: "Xi'an City Wall", nameLocal: '西安城墙', kind: 'old-town', lat: 34.261, lng: 108.94, description: 'Complete Ming-dynasty fortification ring around the old city.' },
      { slug: 'muslim-quarter', name: 'Muslim Quarter', nameLocal: '回民街', kind: 'old-town', lat: 34.267, lng: 108.939, description: 'Historic lanes known for street food and the Great Mosque.' },
    ],
  },
  hangzhou: {
    name: 'Hangzhou',
    nameLocal: '杭州',
    lat: 30.274,
    lng: 120.155,
    places: [
      { slug: 'west-lake', name: 'West Lake', nameLocal: '西湖', kind: 'nature', lat: 30.244, lng: 120.149, description: 'UNESCO-listed lake of causeways, pagodas and gardens.' },
      { slug: 'lingyin-temple', name: 'Lingyin Temple', nameLocal: '灵隐寺', kind: 'historic-site', lat: 30.241, lng: 120.101, description: 'One of China\'s largest and oldest Buddhist temples.' },
    ],
  },
  suzhou: {
    name: 'Suzhou',
    nameLocal: '苏州',
    lat: 31.299,
    lng: 120.585,
    places: [
      { slug: 'humble-administrators-garden', name: "Humble Administrator's Garden", nameLocal: '拙政园', kind: 'old-town', lat: 31.326, lng: 120.629, description: 'Classical Chinese garden, a UNESCO World Heritage Site.' },
      { slug: 'pingjiang-road', name: 'Pingjiang Road', nameLocal: '平江路', kind: 'old-town', lat: 31.32, lng: 120.63, description: 'Canal-side historic street of Ming/Qing architecture.' },
    ],
  },
  shanghai: {
    name: 'Shanghai',
    nameLocal: '上海',
    lat: 31.23,
    lng: 121.474,
    places: [
      { slug: 'the-bund', name: 'The Bund', nameLocal: '外滩', kind: 'viewpoint', lat: 31.24, lng: 121.49, description: 'Waterfront promenade facing the Pudong skyline.' },
      { slug: 'yu-garden', name: 'Yu Garden', nameLocal: '豫园', kind: 'old-town', lat: 31.227, lng: 121.492, description: 'Ming-dynasty garden in the old city.' },
    ],
  },
};

// Day plans per variant: which city each day is based in, and which place slugs.
type DayPlan = { city: keyof typeof CITIES; title: string; placeSlugs: string[] };

const BALANCED: DayPlan[] = [
  { city: 'beijing', title: 'Arrival in Beijing', placeSlugs: [] },
  { city: 'beijing', title: 'Forbidden City & Temple of Heaven', placeSlugs: ['forbidden-city', 'temple-of-heaven'] },
  { city: 'beijing', title: 'Great Wall at Mutianyu', placeSlugs: ['great-wall-mutianyu'] },
  { city: 'xian', title: "Train to Xi'an, city wall", placeSlugs: ['xian-city-wall', 'muslim-quarter'] },
  { city: 'xian', title: 'Terracotta Army', placeSlugs: ['terracotta-army'] },
  { city: 'zhangjiajie', title: 'Travel to Zhangjiajie', placeSlugs: [] },
  { city: 'zhangjiajie', title: 'National Forest Park (Avatar mountains)', placeSlugs: ['zhangjiajie-national-forest-park'] },
  { city: 'zhangjiajie', title: 'Tianzi Mountain viewpoints', placeSlugs: ['tianzi-mountain'] },
  { city: 'zhangjiajie', title: "Tianmen Mountain & Heaven's Gate", placeSlugs: ['tianmen-mountain'] },
  { city: 'hangzhou', title: 'Travel to Hangzhou, West Lake', placeSlugs: ['west-lake'] },
  { city: 'hangzhou', title: 'Lingyin Temple & tea hills', placeSlugs: ['lingyin-temple'] },
  { city: 'suzhou', title: 'Suzhou gardens', placeSlugs: ['humble-administrators-garden', 'pingjiang-road'] },
  { city: 'shanghai', title: 'Shanghai — Yu Garden & the Bund', placeSlugs: ['yu-garden', 'the-bund'] },
  { city: 'shanghai', title: 'Departure', placeSlugs: [] },
];

// Calm = fewer stops/day (drop the heaviest place from busy days, add rest).
const CALM: DayPlan[] = BALANCED.map((d) => ({ ...d, placeSlugs: d.placeSlugs.slice(0, 1) }));
// Active = more stops/day (no trimming; this is the fuller pace).
const ACTIVE: DayPlan[] = BALANCED;

async function main() {
  // Country
  const china = await prisma.country.upsert({
    where: { slug: 'china' },
    update: {},
    create: {
      slug: 'china',
      name: 'China',
      nameLocal: '中国',
      isoCode: 'CN',
      summary: 'From the floating sandstone peaks of Zhangjiajie to imperial Beijing and canal towns.',
    },
  });

  // Seasonality (relative indices are ESTIMATED; weather notes are PENDING until sourced)
  const monthsRecommended = [3, 4, 5, 9, 10];
  for (let m = 1; m <= 12; m++) {
    await prisma.seasonInsight.upsert({
      where: { countryId_month: { countryId: china.id, month: m } },
      update: {},
      create: {
        countryId: china.id,
        month: m,
        recommended: monthsRecommended.includes(m),
        weatherNote: null, // PENDING — do not invent weather
        priceIndex: null,
        crowdIndex: null,
        source: SRC,
        dataStatus: 'PENDING',
        trustLevel: 3,
      },
    });
  }

  // Region + cities + places
  const region = await prisma.region.upsert({
    where: { countryId_slug: { countryId: china.id, slug: 'classic-china' } },
    update: {},
    create: { countryId: china.id, slug: 'classic-china', name: 'Classic China', summary: 'Headline cities and parks of the route.' },
  });

  const placeIdBySlug: Record<string, string> = {};
  const photoBySlug: Record<string, string> = {};
  for (const [citySlug, c] of Object.entries(CITIES)) {
    const city = await prisma.city.upsert({
      where: { regionId_slug: { regionId: region.id, slug: citySlug } },
      update: {},
      create: {
        regionId: region.id,
        slug: citySlug,
        name: c.name,
        nameLocal: c.nameLocal,
        lat: c.lat,
        lng: c.lng,
      },
    });
    for (const p of c.places) {
      let photoUrl: string | null = null;
      if (WIKI_TITLE[p.slug]) {
        photoUrl = await fetchWikiImage(WIKI_TITLE[p.slug]);
        if (!photoUrl) photoUrl = await fetchWikiImage(WIKI_TITLE[p.slug]); // retry once
        if (photoUrl) photoBySlug[p.slug] = photoUrl;
        await sleep(180); // be gentle with Wikipedia's rate limit
      }
      const place = await prisma.place.upsert({
        where: { cityId_slug: { cityId: city.id, slug: p.slug } },
        update: { photoUrl: photoUrl ?? undefined, description: p.description },
        create: {
          cityId: city.id,
          slug: p.slug,
          name: p.name,
          nameLocal: p.nameLocal,
          kind: p.kind,
          lat: p.lat,
          lng: p.lng,
          description: p.description,
          photoUrl,
          source: SRC,
          dataStatus: 'ESTIMATED',
          trustLevel: 2,
          fetchedAt: new Date(),
        },
      });
      placeIdBySlug[p.slug] = place.id;
    }
  }

  // Trip — hero reuses the Zhangjiajie photo we already fetched (no extra call).
  const heroImage =
    photoBySlug['zhangjiajie-national-forest-park'] ??
    photoBySlug['tianzi-mountain'] ??
    (await fetchWikiImage('Zhangjiajie National Forest Park'));
  const tripData: Prisma.TripUncheckedCreateInput = {
      slug: 'china-floating-mountains',
      heroImage: heroImage ?? undefined,
      title: 'China — The Floating Mountains',
      subtitle: 'Zhangjiajie, ancient capitals and canal towns',
      countryId: china.id,
      status: 'PUBLISHED',
      durationDays: 14,
      seasonLabel: 'March–April 2027',
      summary:
        'A 14-day journey balancing the surreal peaks of Zhangjiajie with imperial ' +
        'history and water towns — designed not to exhaust.',
      longDescription:
        'Этот маршрут соединяет три лица Китая. Сначала — императорская история: ' +
        'Запретный город, Великая стена и терракотовая армия в Сиане. Затем — ' +
        'сюрреалистическая природа Чжанцзяцзе, песчаниковые столбы, вдохновившие ' +
        '«Аватар», со смотровыми площадками, канатными дорогами и стеклянными ' +
        'тропами. И финал — лиричные водные города: Западное озеро Ханчжоу, сады ' +
        'Сучжоу и набережная Шанхая. Темп подобран так, чтобы между насыщенными ' +
        'днями оставалось время выдохнуть: переезды на скоростных поездах, ' +
        'буферные дни в горах на случай погоды, вечера без жёсткого плана. ' +
        'Это не марафон по галочкам, а продуманное путешествие с воздухом между точками.',
      highlights: [
        'Горы «Аватара» — Чжанцзяцзе',
        'Великая стена (Мутяньюй) без толп',
        'Терракотовая армия в Сиане',
        'Водные города: Ханчжоу и Сучжоу',
        'Скоростные поезда между городами',
        'Буферный день в горах на случай погоды',
      ],
      bestTime:
        'Март–апрель: цветение и мягкая погода, но это пик сезона в Чжанцзяцзе — ' +
        'возможны очереди на канатные дороги. (Сезонные данные помечены как требующие проверки.)',
      visaNote:
        'Для большинства маршрутов в Китай нужна виза. Уточняйте актуальные правила ' +
        'на официальном консульском сайте — данные здесь не заменяют официальный источник.',
      budgetMinRub: 300000,
      budgetMaxRub: 350000,
  };

  const trip = await prisma.trip.upsert({
    where: { slug: 'china-floating-mountains' },
    update: tripData,
    create: tripData,
  });

  // Variants
  const plans: { pace: Pace; title: string; plan: DayPlan[] }[] = [
    { pace: 'CALM', title: 'Спокойная', plan: CALM },
    { pace: 'BALANCED', title: 'Сбалансированная', plan: BALANCED },
    { pace: 'ACTIVE', title: 'Активная', plan: ACTIVE },
  ];

  for (const { pace, title, plan } of plans) {
    const variant = await prisma.routeVariant.upsert({
      where: { tripId_pace: { tripId: trip.id, pace } },
      update: {},
      create: { tripId: trip.id, pace, title },
    });

    // Budget: ESTIMATED breakdown derived transparently from the stated envelope
    // (not a market quote). Flagged ESTIMATED so the UI never implies a real price.
    const budget = await prisma.budgetBreakdown.upsert({
      where: { variantId: variant.id },
      update: {},
      create: { variantId: variant.id, currency: 'RUB' },
    });
    const estimated = estimateBudget(300000, 350000, pace);
    const byCat = new Map(estimated?.map((e) => [e.category, e]));
    for (const category of ['FLIGHTS', 'HOTELS', 'TRANSPORT', 'FOOD', 'ACTIVITIES', 'RESERVE'] as const) {
      const e = byCat.get(category);
      await prisma.budgetLine.upsert({
        where: { breakdownId_category: { breakdownId: budget.id, category } },
        update: { amount: e?.amount ?? null, dataStatus: e ? 'ESTIMATED' : 'PENDING', source: e?.source ?? 'pending' },
        create: {
          breakdownId: budget.id,
          category,
          amount: e?.amount ?? null,
          dataStatus: e ? 'ESTIMATED' : 'PENDING',
          source: e?.source ?? 'pending',
          trustLevel: 3,
        },
      });
    }

    // Days + day-places. Transport legs are created with PENDING distance/time.
    for (let i = 0; i < plan.length; i++) {
      const d = plan[i];
      const day = await prisma.day.upsert({
        where: { variantId_dayNumber: { variantId: variant.id, dayNumber: i + 1 } },
        update: {},
        create: {
          variantId: variant.id,
          dayNumber: i + 1,
          title: d.title,
          baseCity: CITIES[d.city].name,
        },
      });
      for (let j = 0; j < d.placeSlugs.length; j++) {
        const placeId = placeIdBySlug[d.placeSlugs[j]];
        if (!placeId) continue;
        await prisma.dayPlace.upsert({
          where: { dayId_order: { dayId: day.id, order: j } },
          update: {},
          create: { dayId: day.id, placeId, order: j, dwellMin: null },
        });
      }
      // Inter-city travel day -> a PENDING transport leg (real durations TBD).
      const prev = plan[i - 1];
      if (prev && prev.city !== d.city) {
        await prisma.transportLeg.upsert({
          where: { dayId_order: { dayId: day.id, order: 0 } },
          update: {},
          create: {
            dayId: day.id,
            order: 0,
            mode: 'HIGH_SPEED_RAIL',
            fromLabel: CITIES[prev.city].name,
            toLabel: CITIES[d.city].name,
            distanceKm: null, // PENDING
            durationMin: null, // PENDING
            dataStatus: 'PENDING',
            source: 'pending',
            trustLevel: 3,
          },
        });
      }
    }
  }

  // Scores (these are editorial/derived assessments, transparently subjective).
  await prisma.tripScore.upsert({
    where: { tripId: trip.id },
    update: {},
    create: {
      tripId: trip.id,
      comfort: 74,
      beauty: 92,
      history: 88,
      load: 58,
      valueRatio: 70,
      uniqueness: 85,
      nature: 90,
      overall: 80,
    },
  });

  // Honest multi-persona opinions — not artificially inflated.
  const opinions: { persona: string; verdict: string; rating?: number }[] = [
    { persona: 'traveler', verdict: 'Сильные впечатления, но 6 городов за 14 дней — есть риск усталости от переездов.', rating: 78 },
    { persona: 'travel-blogger', verdict: 'Чжанцзяцзе + водные города = отличный визуальный контраст. Фотогенично.', rating: 85 },
    { persona: 'investor', verdict: 'Китай — крупный рынок, но виза/языковой барьер повышают стоимость поддержки.', rating: 70 },
    { persona: 'competitor', verdict: 'Похожие маршруты есть у Trip.com; нужно выделиться UX и честностью данных.', rating: 65 },
    { persona: 'skeptic', verdict: 'Переезд Сиань→Чжанцзяцзе логистически неудобен; нужно подтвердить реальное время в пути (сейчас PENDING).', rating: 60 },
    { persona: 'professional-guide', verdict: 'Добавьте буферный день в Чжанцзяцзе на случай погоды в горах.', rating: 80 },
  ];
  // Replace existing opinions idempotently.
  await prisma.tripOpinion.deleteMany({ where: { tripId: trip.id } });
  for (const o of opinions) {
    await prisma.tripOpinion.create({ data: { tripId: trip.id, ...o } });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete: China — The Floating Mountains (3 variants, data-provenance enforced).');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
