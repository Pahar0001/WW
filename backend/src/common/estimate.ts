// Расчёт «Примерные траты»: сколько стоит поездка целиком.
//
// ── Что здесь настоящее ────────────────────────────────────────────────────
// Раньше расчёт держался на ОДНОЙ базовой ставке на весь мир: ночь — 2000 ₽ и
// в Каире, и в Токио; день еды — 1200 ₽ где угодно. Число выглядело точным, но
// не значило ничего: разница между странами больше, чем разница между
// «Эконом» и «Комфорт», а её в расчёте не было вовсе.
//
// Теперь в расчёт входят четыре настоящих величины и одна названная гипотеза:
//   1. ПЕРЕЛЁТ        — котировка Aviasales на выбранные даты (VERIFIED).
//   2. УРОВЕНЬ ЦЕН    — индекс уровня цен потребления домохозяйств World Bank
//                       (ICP, шкала «США = 100»), у каждой страны свой и со
//                       своим годом. Египет ×0.42 к российским ценам, Япония
//                       ×1.88 — это данные, а не ощущение.
//   3. НОЧИ И ДНИ     — из длительности маршрута.
//   4. ПЕРЕЕЗДЫ       — из плана по дням: считаем настоящие межгородские плечи
//                       (TransportLeg), а не «городов минус один».
//   5. БАЗОВАЯ КОРЗИНА (гипотеза) — сколько стоит день поездки уровня «Эконом»
//                       в стране-эталоне (Россия), в рублях. Это единственное
//                       место, где числа заданы нами, и они собраны здесь, а не
//                       размазаны по коду.
//
// ⚠️ Почему итог всё равно ESTIMATED, а не «точная цена». Отельного API у нас
// нет (Hotellook закрыт совсем), поэтому настоящей цены ночи в конкретном
// городе на конкретную дату взять неоткуда. Кроме того, ICP считает корзину
// ЖИТЕЛЯ — с арендой и коммуналкой, — а турист тратит иначе. Расчёт честно
// говорит, из чего сделан каждый рубль, и не притворяется котировкой.
// Врать точностью хуже, чем признать оценку: человек строит на этих числах
// бюджет поездки.
//
// ── Алгоритм ───────────────────────────────────────────────────────────────
//   nights     = max(0, durationDays − 1)
//   days       = durationDays
//   transfers  = настоящие плечи из плана, иначе max(0, cities − 1)
//   kCountry   = PLI(страна) / PLI(Россия)          ← World Bank
//   kComfort   = COMFORT_INDEX[comfort]             ← выбор человека, не факт
//   HOTELS     = lodging        × nights    × kComfort × kCountry
//   FOOD       = subsistence    × days      × kComfort × kCountry
//   TRANSPORT  = (localTransport × days + intercity × transfers) × kComfort × kCountry
//   ACTIVITIES = activities     × days      × kComfort × kCountry
//   RESERVE    = 10 % от наземной суммы
//   FLIGHTS    = котировка Aviasales, НЕ индексируется ничем
//
// Суммы округляются до 100 ₽: это расчёт, а не счёт к оплате.

import { BudgetCategory, DataStatus } from '@prisma/client';
import {
  PRICE_LEVELS,
  PRICE_LEVEL_REFERENCE,
  PRICE_LEVEL_SOURCE,
  PRICE_LEVEL_SOURCE_URL,
  type PriceLevel,
} from './price-levels.generated';

export type Comfort = 'BUDGET' | 'STANDARD' | 'COMFORT';

/**
 * Базовая корзина: день и ночь поездки уровня «Эконом» в стране-эталоне
 * (Россия), рубли на человека. Единственная гипотеза расчёта — держим её в
 * одном месте, с явным описанием, что означает каждая строка.
 *
 * Пересматривать вместе с инфляцией; страна-эталон выбрана не случайно —
 * российские цены владелец может проверить по своему опыту, а World Bank
 * пересчитает их в любую другую страну сам.
 */
const BASE_RATES = {
  /** Ночь в эконом-отеле или хостеле, двухместное размещение, на человека. */
  lodging: 2000,
  /** «Прожиточный минимум» дня поездки: еда и бытовые мелочи. */
  subsistence: 1200,
  /** Городской транспорт за день. */
  localTransport: 400,
  /** Входные билеты и развлечения за день. */
  activities: 700,
  /** Один межгородской переезд эконом-классом (автобус, поезд). */
  intercity: 2000,
};

/**
 * Уровень комфорта — это ВЫБОР человека, а не факт о стране, поэтому здесь
 * множитель, а не отдельный набор выдуманных цен: «Стандарт» вдвое дороже
 * эконома, «Комфорт» втрое с небольшим. Так видно, что растёт, и во сколько раз.
 */
export const COMFORT_INDEX: Record<Comfort, number> = {
  BUDGET: 1,
  STANDARD: 1.8,
  COMFORT: 3.2,
};

const RESERVE_RATE = 0.1; // резерв на непредвиденное
/**
 * Полоса неопределённости вокруг наземной части. Держится не на данных, а на
 * природе оценки: одна и та же поездка у двух людей разойдётся примерно на
 * столько. К перелёту не применяется — там настоящая котировка.
 */
const BAND = 0.18;

const round100 = (n: number) => Math.round(n / 100) * 100;

/**
 * Слаги каталога, которые не совпадают с ISO-2. «Россия» в прод-базе заведена
 * четырьмя разными слагами (§4 хендоффа) — без этой таблицы часть маршрутов
 * молча осталась бы без уровня цен и посчиталась бы по российским ценам,
 * притом что страна другая.
 */
const SLUG_ALIASES: Record<string, string> = {
  china: 'cn',
  rossiya: 'ru',
  russia: 'ru',
  rossija: 'ru',
};

/** Уровень цен страны: сперва по ISO-коду, затем по слагу, затем по алиасу. */
export function lookupPriceLevel(
  countrySlug?: string | null,
  countryIso?: string | null,
): { key: string; level: PriceLevel } | null {
  const candidates = [
    countryIso?.trim().toLowerCase(),
    countrySlug?.trim().toLowerCase(),
    SLUG_ALIASES[countrySlug?.trim().toLowerCase() ?? ''],
  ].filter((v): v is string => Boolean(v));

  for (const key of candidates) {
    const level = PRICE_LEVELS[key];
    if (level) return { key, level };
  }
  return null;
}

export interface EstimateInput {
  durationDays: number;
  cities: number;
  travelers: number;
  comfort: Comfort;
  /** Реальная цена билетов туда-обратно на человека (Aviasales) — опционально. */
  flightRub?: number | null;
  /** Слаг страны маршрута — по нему берётся уровень цен. */
  countrySlug?: string | null;
  /** ISO-код страны из каталога, если он заполнен: точнее слага. */
  countryIso?: string | null;
  /** Название страны — только для подписи в интерфейсе. */
  countryName?: string | null;
  /**
   * Настоящее число межгородских переездов из плана по дням. Если план есть,
   * это факт маршрута, а не догадка «городов минус один»: маршрут может
   * возвращаться в один и тот же город дважды.
   */
  intercityLegs?: number | null;
}

/** Из чего сложилась строка расчёта — показывается человеку рядом с суммой. */
export interface EstimateLine {
  category: BudgetCategory;
  amount: number | null;
  dataStatus: DataStatus;
  /** Формула строки словами: «2000 ₽ × 6 ноч. × 0.42». */
  method: string;
  /** Откуда взялось число: 'aviasales' | 'worldbank+base' | null. */
  source: string | null;
}

export interface SpendEstimate {
  currency: 'RUB';
  comfort: Comfort;
  comfortIndex: number;
  travelers: number;
  durationDays: number;
  nights: number;
  cities: number;
  transfers: number;
  /** Откуда взялось число переездов: из плана или из числа городов. */
  transfersFrom: 'plan' | 'cities';
  /** Реальный перелёт, если котировка была передана (VERIFIED), иначе null. */
  flight: { perPerson: number; source: 'aviasales'; dataStatus: DataStatus } | null;
  /**
   * Уровень цен страны относительно эталона. `null` — страны нет в данных
   * World Bank; тогда расчёт идёт по ценам эталона и честно об этом говорит.
   */
  priceLevel: {
    country: string | null;
    /** Индекс уровня цен страны, США = 100. */
    pli: number;
    /** Год данных именно этой страны. */
    year: number;
    /** Множитель к ценам страны-эталона — то, на что умножается база. */
    index: number;
    reference: { iso2: string; pli: number; year: number };
    source: string;
    sourceUrl: string;
  } | null;
  perPerson: {
    categories: EstimateLine[];
    total: number;
    low: number;
    high: number;
  };
  group: { total: number; low: number; high: number };
  dataStatus: DataStatus;
  assumptions: {
    note: string;
    baseRatesReference: typeof BASE_RATES;
    referenceCountry: string;
    comfortIndex: number;
    countryIndex: number;
    reserveRate: number;
    band: number;
  };
}

/** Считает стоимость поездки. Чистая функция: те же входные — тот же ответ. */
export function estimateTripSpend(input: EstimateInput): SpendEstimate {
  const comfort: Comfort = (['BUDGET', 'STANDARD', 'COMFORT'] as Comfort[]).includes(input.comfort)
    ? input.comfort
    : 'STANDARD';
  const travelers = Math.min(20, Math.max(1, Math.round(input.travelers || 1)));
  const durationDays = Math.max(1, Math.round(input.durationDays || 1));
  const cities = Math.max(1, Math.round(input.cities || 1));
  const flightRub =
    input.flightRub != null && Number.isFinite(input.flightRub) && input.flightRub > 0
      ? Math.round(input.flightRub)
      : null;

  const nights = Math.max(0, durationDays - 1);
  const days = durationDays;

  // Переезды: настоящие плечи маршрута важнее арифметики по числу городов.
  const fromPlan = input.intercityLegs != null && input.intercityLegs >= 0;
  const transfers = fromPlan ? Math.round(input.intercityLegs!) : Math.max(0, cities - 1);

  const kComfort = COMFORT_INDEX[comfort];

  // Уровень цен страны. Нет данных — считаем по ценам эталона с индексом 1 и
  // говорим об этом (priceLevel === null), а не подставляем «среднее по миру»:
  // среднего по миру не существует, а число на экране выглядело бы таким же
  // уверенным, как настоящее.
  const found = lookupPriceLevel(input.countrySlug, input.countryIso);
  const kCountry = found ? found.level.pli / PRICE_LEVEL_REFERENCE.pli : 1;
  const k = kComfort * kCountry;

  const hotels = BASE_RATES.lodging * nights * k;
  const food = BASE_RATES.subsistence * days * k;
  const transport = (BASE_RATES.localTransport * days + BASE_RATES.intercity * transfers) * k;
  const activities = BASE_RATES.activities * days * k;
  const groundSubtotal = hotels + food + transport + activities;
  const reserve = groundSubtotal * RESERVE_RATE;

  // Формула словами. Человек должен уметь пересчитать любую строку на бумаге —
  // иначе «≈ 12 000 ₽» ничем не отличается от выдумки, даже когда оно честное.
  //
  // Множитель ×1 не пишем: «×1 (эконом)» — это шум, который читается как
  // недоделка. Пропадает вся хвостовая часть, если умножать не на что.
  const idx = (n: number) => n.toFixed(2).replace(/\.?0+$/, '');
  const tail =
    (kComfort !== 1 ? ` × ${idx(kComfort)} (${COMFORT_LABEL[comfort]})` : '') +
    (found ? ` × ${idx(kCountry)} (уровень цен страны)` : '');
  const groundSource = found ? 'worldbank+base' : 'base';
  const legWord = (n: number) => {
    const t = n % 100;
    if (t >= 11 && t <= 14) return 'переездов';
    return [, 'переезд', 'переезда', 'переезда', 'переезда'][n % 10] ?? 'переездов';
  };

  const categories: EstimateLine[] = [
    {
      category: 'FLIGHTS',
      amount: flightRub,
      dataStatus: flightRub != null ? 'VERIFIED' : 'PENDING',
      method: flightRub != null ? 'Котировка Aviasales на выбранные даты' : 'Нужны даты вылета и возвращения',
      source: flightRub != null ? 'aviasales' : null,
    },
    {
      category: 'HOTELS',
      amount: round100(hotels),
      dataStatus: 'ESTIMATED',
      method: `${BASE_RATES.lodging} ₽ × ${nights} ноч.${tail}`,
      source: groundSource,
    },
    {
      category: 'FOOD',
      amount: round100(food),
      dataStatus: 'ESTIMATED',
      method: `${BASE_RATES.subsistence} ₽ × ${days} дн.${tail}`,
      source: groundSource,
    },
    {
      category: 'TRANSPORT',
      amount: round100(transport),
      dataStatus: 'ESTIMATED',
      // Скобки обязательны: без них «400 × 8 дн. + 2000 × 2 × 0.42» читается
      // так, будто множитель относится только ко второму слагаемому.
      method:
        (transfers > 0
          ? `(${BASE_RATES.localTransport} ₽ × ${days} дн. + ${BASE_RATES.intercity} ₽ × ${transfers} ${legWord(transfers)})`
          : `${BASE_RATES.localTransport} ₽ × ${days} дн.`) + tail,
      source: groundSource,
    },
    {
      category: 'ACTIVITIES',
      amount: round100(activities),
      dataStatus: 'ESTIMATED',
      method: `${BASE_RATES.activities} ₽ × ${days} дн.${tail}`,
      source: groundSource,
    },
    {
      category: 'RESERVE',
      amount: round100(reserve),
      dataStatus: 'ESTIMATED',
      method: `${RESERVE_RATE * 100} % от наземных трат`,
      source: groundSource,
    },
  ];

  // Полоса неопределённости — только на оценочную часть: настоящая котировка
  // билета не «плавает» оттого, что мы не уверены в цене обеда.
  const groundTotal = groundSubtotal + reserve;
  const perPersonTotal = round100(groundTotal + (flightRub ?? 0));
  const perPersonLow = round100(groundTotal * (1 - BAND) + (flightRub ?? 0));
  const perPersonHigh = round100(groundTotal * (1 + BAND) + (flightRub ?? 0));

  return {
    currency: 'RUB',
    comfort,
    comfortIndex: kComfort,
    travelers,
    durationDays,
    nights,
    cities,
    transfers,
    transfersFrom: fromPlan ? 'plan' : 'cities',
    flight:
      flightRub != null ? { perPerson: flightRub, source: 'aviasales', dataStatus: 'VERIFIED' } : null,
    priceLevel: found
      ? {
          country: input.countryName ?? null,
          pli: found.level.pli,
          year: found.level.year,
          index: Number(kCountry.toFixed(3)),
          reference: PRICE_LEVEL_REFERENCE,
          source: PRICE_LEVEL_SOURCE,
          sourceUrl: PRICE_LEVEL_SOURCE_URL,
        }
      : null,
    perPerson: {
      categories,
      total: perPersonTotal,
      low: perPersonLow,
      high: perPersonHigh,
    },
    group: {
      total: perPersonTotal * travelers,
      low: perPersonLow * travelers,
      high: perPersonHigh * travelers,
    },
    dataStatus: 'ESTIMATED',
    assumptions: {
      note:
        'Наземные траты: базовая корзина дня и ночи уровня «Эконом» по ценам страны-эталона ' +
        '(Россия), умноженная на уровень комфорта и на индекс уровня цен страны из данных ' +
        'World Bank. Перелёт — только реальная котировка Aviasales, без множителей.',
      baseRatesReference: BASE_RATES,
      referenceCountry: PRICE_LEVEL_REFERENCE.iso2,
      comfortIndex: kComfort,
      countryIndex: Number(kCountry.toFixed(3)),
      reserveRate: RESERVE_RATE,
      band: BAND,
    },
  };
}

const COMFORT_LABEL: Record<Comfort, string> = {
  BUDGET: 'эконом',
  STANDARD: 'стандарт',
  COMFORT: 'комфорт',
};
