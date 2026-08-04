/**
 * Справочник отелей у аэропортов — выгрузка из OpenStreetMap.
 *
 * Зачем скрипт, а не запрос в рантайме. Раздел логистики раньше отдавал ссылку
 * в ПОИСК («отели рядом с Шереметьево»), то есть перекладывал работу на
 * человека. Чтобы дать ссылку на КОНКРЕТНЫЙ отель, нужен источник настоящих
 * отелей с координатами. Отельного API у нас нет (Hotellook закрыт совсем,
 * см. §12 хендоффа), но есть OpenStreetMap: имена, координаты, сайты и
 * телефоны там настоящие и проверяемые по ссылке на объект.
 *
 * Ходить в Overpass из рантайма нельзя по двум причинам: это бесплатный общий
 * сервис с лимитами (§1 п. 4 — внешние API только через кэш бэкенда), а на
 * free-плане Render процесс засыпает и первый посетитель ждал бы выгрузку.
 * Поэтому справочник собирается заранее и коммитится: он детерминированный,
 * его видно в ревью, и страница не зависит от чужого сервиса вообще.
 *
 * ⚠️ REAL DATA POLICY. Цен здесь нет и не будет: OSM их не хранит, а выдумывать
 * запрещено. Настоящее в этом файле — название, координаты, расстояние до
 * терминала (считается по координатам, не на глаз), сайт и телефон. Дата
 * выгрузки пишется в файл: данные OSM живые, отель может закрыться.
 *
 * Лицензия источника: ODbL, обязательна атрибуция OpenStreetMap — она стоит в
 * интерфейсе раздела.
 *
 * Запуск (из корня репозитория):
 *   node --no-warnings scripts/build-airport-hotels.ts
 * Полная пересборка занимает пару минут: запросы идут последовательно и с
 * паузой, чтобы не злоупотреблять бесплатным Overpass.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const AIRPORTS_TS = join(ROOT, 'backend/src/modules/logistics/airports.ts');
const OUT_TS = join(ROOT, 'backend/src/modules/logistics/airport-hotels.generated.ts');

const OVERPASS = 'https://overpass-api.de/api/interpreter';
/** Радиус поиска вокруг точки аэропорта. Дальше 6 км «рядом с аэропортом» уже неправда. */
const RADIUS_M = 6000;
/** Сколько отелей оставляем на аэропорт: список для выбора, а не каталог. */
const KEEP = 10;
/** Пауза между запросами — общий бесплатный сервис, торопиться некуда. */
const PAUSE_MS = 1500;

interface AirportPoint {
  iata: string;
  lat: number;
  lng: number;
  name: string;
}

interface Hotel {
  name: string;
  /** Название латиницей, если OSM его знает: по нему лучше ищут русские сервисы бронирования. */
  nameEn?: string;
  lat: number;
  lng: number;
  /** Расстояние до точки аэропорта по прямой, км. Посчитано по координатам. */
  distanceKm: number;
  kind: 'hotel' | 'hostel' | 'guest_house' | 'apartment' | 'motel';
  website?: string;
  phone?: string;
  /** Звёзды из OSM (stars) — только если проставлены, сами не присваиваем. */
  stars?: number;
  /** Ссылка на объект в OpenStreetMap: любой факт отсюда можно проверить. */
  osm: string;
}

// ── Разбор справочника аэропортов ────────────────────────────────────────────

/**
 * Координаты берём из `airports.ts` ТЕКСТОМ, а не импортом: тот же приём, что в
 * `check-legal.ts`, — импорт .ts из скрипта требует расширения в пути, которое
 * запрещено настройками сборки. Формат записей в файле однороден, и разбор
 * регуляркой здесь надёжнее, чем кажется: если формат изменится, скрипт найдёт
 * ноль аэропортов и громко упадёт, а не соберёт мусор.
 */
function readAirports(): AirportPoint[] {
  const src = readFileSync(AIRPORTS_TS, 'utf8');
  const re =
    /iata:\s*'([A-Z]{3})',\s*lat:\s*(-?[\d.]+),\s*lng:\s*(-?[\d.]+),\s*name:\s*'([^']+)'/g;
  const seen = new Map<string, AirportPoint>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    // Один аэропорт может стоять и в списке прилёта, и в списке вылета (Пулково) —
    // выгружаем его один раз.
    if (!seen.has(m[1])) {
      seen.set(m[1], { iata: m[1], lat: Number(m[2]), lng: Number(m[3]), name: m[4] });
    }
  }
  if (seen.size === 0) {
    throw new Error(
      `Не найдено ни одного аэропорта в ${AIRPORTS_TS}. Изменился формат записей — поправьте регулярку.`,
    );
  }
  return [...seen.values()];
}

// ── Overpass ─────────────────────────────────────────────────────────────────

const KINDS = ['hotel', 'hostel', 'guest_house', 'apartment', 'motel'] as const;

function query(lat: number, lng: number): string {
  const filter = `["tourism"~"^(${KINDS.join('|')})$"]["name"]`;
  return (
    `[out:json][timeout:60];(` +
    `node${filter}(around:${RADIUS_M},${lat},${lng});` +
    `way${filter}(around:${RADIUS_M},${lat},${lng});` +
    `);out center tags;`
  );
}

/** Расстояние по большому кругу, км. Земля — сфера радиусом 6371 км. */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Запрос к Overpass с повторами: 429 и 504 у бесплатного сервиса — норма.
 *
 * ⚠️ Возвращает `null`, если все попытки провалились, и это ПРИНЦИПИАЛЬНО не то
 * же самое, что пустой массив. При первой сборке восемь аэропортов — включая
 * Пулково и Внуково, откуда люди реально улетают, — вернулись пустыми просто
 * потому, что Overpass был занят. Записав их как «отелей нет», мы бы получили
 * тихую дыру в данных: блок «где ночевать» молча деградировал бы до поиска, и
 * никто бы не понял почему.
 */
async function overpass(body: string, label: string): Promise<any[] | null> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(OVERPASS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          // Overpass просит представляться, чтобы было кого попросить умерить пыл.
          'User-Agent': 'vela-trips/airport-hotels-builder (https://velatrips.ru)',
        },
        body: new URLSearchParams({ data: body }),
        signal: AbortSignal.timeout(90_000),
      });
      if (res.status === 429 || res.status === 504) {
        const wait = attempt * 5000;
        console.log(`    ${label}: ${res.status}, ждём ${wait / 1000} с и повторяем`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: any = await res.json();
      return json?.elements ?? [];
    } catch (e) {
      const wait = attempt * 5000;
      console.log(`    ${label}: ${(e as Error).message}, повтор через ${wait / 1000} с`);
      if (attempt < 4) await sleep(wait);
    }
  }
  return null; // не «пусто», а «не удалось спросить»
}

/** Телефон и сайт лежат в OSM под несколькими ключами — берём первый заполненный. */
const pick = (tags: Record<string, string>, keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = tags[k]?.trim();
    if (v) return v;
  }
  return undefined;
};

function toHotel(el: any, airport: AirportPoint): Hotel | null {
  const tags: Record<string, string> = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  // Показываем по-русски, если OSM знает русское имя, иначе как есть.
  const name = pick(tags, ['name:ru', 'name'])!;
  const nameEn = pick(tags, ['name:en', 'int_name']);
  if (!name) return null;

  const kind = tags.tourism as Hotel['kind'];
  if (!KINDS.includes(kind)) return null;

  let website = pick(tags, ['website', 'contact:website', 'url']);
  // В OSM встречается адрес без схемы — без неё ссылка уедет на наш же домен.
  if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
  // Ссылки должны быть только http(s): в тегах попадается и мусор.
  if (website && !/^https?:\/\/[^\s"'<>]+$/i.test(website)) website = undefined;

  const starsRaw = Number(tags.stars);
  const stars = Number.isInteger(starsRaw) && starsRaw >= 1 && starsRaw <= 5 ? starsRaw : undefined;

  return {
    name,
    ...(nameEn && nameEn !== name ? { nameEn } : {}),
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
    distanceKm: Number(haversineKm(airport.lat, airport.lng, lat, lng).toFixed(1)),
    kind,
    ...(website ? { website } : {}),
    ...(pick(tags, ['phone', 'contact:phone']) ? { phone: pick(tags, ['phone', 'contact:phone']) } : {}),
    ...(stars ? { stars } : {}),
    osm: `https://www.openstreetmap.org/${el.type}/${el.id}`,
  };
}

// ── Сборка ───────────────────────────────────────────────────────────────────

/**
 * Что уже выгружено. Нужно для режима дозагрузки: Overpass отказывает часто, и
 * гонять все 64 аэропорта по часу ради восьми недостающих — расточительно.
 * Читаем текстом, как и всё остальное здесь, — импортировать .ts нельзя.
 */
function readExisting(): Record<string, Hotel[]> {
  try {
    const src = readFileSync(OUT_TS, 'utf8');
    const start = src.indexOf('AIRPORT_HOTELS: Record<string, AirportHotel[]> = {');
    if (start < 0) return {};
    const body = src.slice(src.indexOf('{', start));
    // Файл собран нами: значения — валидный JSON, ключи — коды IATA без кавычек.
    const json = body.replace(/^\s*([A-Z]{3}):/gm, '"$1":').replace(/,(\s*})/g, '$1');
    return JSON.parse(json.slice(0, json.lastIndexOf('}') + 1));
  } catch {
    return {};
  }
}

async function main() {
  // `--missing` — дозагрузить только те аэропорты, которых в файле ещё нет.
  const onlyMissing = process.argv.includes('--missing');
  const airports = readAirports();
  const existing = onlyMissing ? readExisting() : {};
  const todo = onlyMissing ? airports.filter((a) => !existing[a.iata]) : airports;

  console.log(`Аэропортов в справочнике: ${airports.length}`);
  if (onlyMissing) {
    console.log(`Уже выгружено: ${Object.keys(existing).length}. Дозагружаем: ${todo.length}.`);
  }
  console.log(`Радиус ${RADIUS_M / 1000} км, оставляем до ${KEEP} мест на аэропорт.\n`);

  const result: Record<string, Hotel[]> = { ...existing };
  let total = Object.values(existing).reduce((n, h) => n + h.length, 0);
  const empty: string[] = [];
  const failed: string[] = [];

  for (const [i, a] of todo.entries()) {
    const label = `${a.iata} (${a.name})`;
    process.stdout.write(`  [${i + 1}/${todo.length}] ${label} … `);
    const elements = await overpass(query(a.lat, a.lng), a.iata);

    // Отказ сервиса и отсутствие отелей — разные вещи, и путать их нельзя.
    if (elements === null) {
      failed.push(a.iata);
      console.log('НЕ УДАЛОСЬ СПРОСИТЬ (Overpass отказал) — запустите с --missing');
      if (i < todo.length - 1) await sleep(PAUSE_MS);
      continue;
    }

    const hotels = elements
      .map((el) => toHotel(el, a))
      .filter((h): h is Hotel => h !== null)
      // Ближе к терминалу — выше: ради этого блок и существует.
      .sort((x, y) => x.distanceKm - y.distanceKm)
      .slice(0, KEEP);

    if (hotels.length > 0) {
      result[a.iata] = hotels;
      total += hotels.length;
      console.log(`${hotels.length} шт., ближайший ${hotels[0].distanceKm} км`);
    } else {
      empty.push(a.iata);
      console.log('отелей рядом нет (ответ получен, он пустой)');
    }
    if (i < todo.length - 1) await sleep(PAUSE_MS);
  }

  const fetchedAt = new Date().toISOString().slice(0, 10);
  const body = Object.entries(result)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([iata, hotels]) => `  ${iata}: ${JSON.stringify(hotels, null, 2).replace(/\n/g, '\n  ')},`)
    .join('\n');

  const file = `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ — не редактировать руками.
 * Источник: OpenStreetMap через Overpass API, лицензия ODbL.
 * Пересобрать: node --no-warnings scripts/build-airport-hotels.ts
 *
 * Отели, хостелы и апартаменты в радиусе ${RADIUS_M / 1000} км от точки аэропорта.
 * Расстояние посчитано по координатам (большой круг), а не взято из описания.
 * Цен здесь нет: OSM их не хранит, а выдумывать запрещено (Real Data Policy).
 */

export interface AirportHotel {
  name: string;
  nameEn?: string;
  lat: number;
  lng: number;
  /** Километры до точки аэропорта по прямой. */
  distanceKm: number;
  kind: 'hotel' | 'hostel' | 'guest_house' | 'apartment' | 'motel';
  website?: string;
  phone?: string;
  stars?: number;
  /** Объект в OpenStreetMap — источник каждого факта выше. */
  osm: string;
}

/** Дата выгрузки: данные OSM живые, отель мог закрыться или переехать. */
export const AIRPORT_HOTELS_FETCHED_AT = '${fetchedAt}';
export const AIRPORT_HOTELS_SOURCE = 'OpenStreetMap';
export const AIRPORT_HOTELS_SOURCE_URL = 'https://www.openstreetmap.org/copyright';

export const AIRPORT_HOTELS: Record<string, AirportHotel[]> = {
${body}
};
`;

  writeFileSync(OUT_TS, file, 'utf8');
  console.log(`\nГотово: ${total} мест по ${Object.keys(result).length} аэропортам → ${OUT_TS}`);
  if (empty.length) console.log(`Отелей рядом нет: ${empty.join(', ')}`);
  if (failed.length) {
    console.log(
      `\n⚠️ Overpass отказал по ${failed.length} аэропортам: ${failed.join(', ')}.\n` +
        `   Это НЕ значит, что там нет отелей. Допросите их отдельно:\n` +
        `   node --no-warnings scripts/build-airport-hotels.ts --missing`,
    );
    // Ненулевой код: незамеченная дыра в данных хуже шумного падения.
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('Сборка справочника не удалась:', e);
  process.exit(1);
});
