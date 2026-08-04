/**
 * Уровень цен по странам — выгрузка из World Bank (программа ICP).
 *
 * Зачем. «Примерные траты» считались по ОДНОЙ базовой ставке на весь мир:
 * ночь — 2000 ₽ и в Каире, и в Токио, день еды — 1200 ₽ где угодно. Число
 * выглядело точным, но не значило ничего: разница между странами больше, чем
 * разница между «Эконом» и «Комфорт», а её в расчёте не было вовсе.
 *
 * Индикатор `PA.NUS.PRVT.PLI` — price level index конечного потребления
 * домохозяйств, шкала «США = 100» (проверено: у США ровно 100 во всех годах).
 * Он показывает, во сколько раз дороже или дешевле одна и та же корзина в
 * стране при пересчёте по РЫНОЧНОМУ курсу, — то есть ровно то, что чувствует
 * приезжий, который платит своими деньгами.
 *
 * Расчёт трат берёт отношение к стране-эталону (Россия): базовая корзина
 * задана в рублях по российским ценам, а стоимость в стране — база × PLI_страны
 * / PLI_России. Египет ×0.42, Япония ×1.88 — числа из источника, а не на глаз.
 *
 * ⚠️ Честная граница метода: ICP считает корзину ЖИТЕЛЯ (там есть аренда,
 * коммуналка, местная еда), а турист тратит иначе — больше отелей и ресторанов.
 * Поэтому итог остаётся ОЦЕНКОЙ (ESTIMATED) с названным источником и годом, а
 * не котировкой. Это написано и в интерфейсе.
 *
 * Снимок коммитится, а не запрашивается в рантайме: данные годовые (меняются
 * раз в год), на free-плане Render внешний запрос при холодном старте — это
 * ожидание для первого посетителя, а падение World Bank не должно ронять
 * расчёт трат.
 *
 * Запуск (из корня репозитория):
 *   node --no-warnings scripts/build-price-levels.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const OUT_TS = join(ROOT, 'backend/src/common/price-levels.generated.ts');

const WB = 'https://api.worldbank.org/v2';
const INDICATOR = 'PA.NUS.PRVT.PLI';
/** Страна-эталон: базовая корзина в `estimate.ts` задана в рублях по её ценам. */
const REFERENCE_ISO2 = 'RU';
/** Раньше 2015 брать нет смысла: расчёт про сегодняшние поездки. */
const FROM_YEAR = 2015;

interface Row {
  countryiso3code: string;
  date: string;
  value: number | null;
}

async function wbJson(url: string): Promise<any[]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`World Bank ответил HTTP ${res.status}`);
  const body: any = await res.json();
  // Формат ответа: [метаданные, строки]. При ошибке приходит один элемент с message.
  if (!Array.isArray(body) || body.length < 2 || !Array.isArray(body[1])) {
    throw new Error(`Неожиданный ответ World Bank: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body[1];
}

async function main() {
  // 1. Соответствие ISO-3 → ISO-2. Берём у самого World Bank, чтобы не держать
  //    свою таблицу кодов: она разъедется молча и ошибётся ровно там, где никто
  //    не проверяет.
  console.log('Загружаю список стран World Bank…');
  const countries = await wbJson(`${WB}/country?format=json&per_page=400`);
  const iso3to2 = new Map<string, string>();
  const nameByIso2 = new Map<string, string>();
  for (const c of countries) {
    // У агрегатов (регионы, группы дохода) region.id = 'NA' — они не страны.
    if (!c?.iso2Code || c?.region?.id === 'NA') continue;
    iso3to2.set(c.id, c.iso2Code);
    nameByIso2.set(c.iso2Code, c.name);
  }
  console.log(`  стран: ${iso3to2.size}`);

  // 2. Индикатор по всем странам сразу — один запрос вместо двух сотен.
  console.log(`Загружаю ${INDICATOR} с ${FROM_YEAR} года…`);
  const rows = (await wbJson(
    `${WB}/country/all/indicator/${INDICATOR}?format=json&per_page=20000&date=${FROM_YEAR}:2026`,
  )) as Row[];
  console.log(`  строк: ${rows.length}`);

  // 3. По каждой стране — САМОЕ СВЕЖЕЕ непустое значение. У разных стран
  //    последний доступный год разный, и подставлять чужой год нельзя: год
  //    показывается в интерфейсе рядом с числом.
  const latest = new Map<string, { value: number; year: number }>();
  for (const r of rows) {
    if (r.value == null) continue;
    const iso2 = iso3to2.get(r.countryiso3code);
    if (!iso2) continue;
    const year = Number(r.date);
    const have = latest.get(iso2);
    if (!have || year > have.year) latest.set(iso2, { value: r.value, year });
  }
  console.log(`  стран со значением: ${latest.size}`);

  const reference = latest.get(REFERENCE_ISO2);
  if (!reference) {
    throw new Error(
      `Нет значения для страны-эталона ${REFERENCE_ISO2} — расчёт трат опереть не на что, сборка остановлена.`,
    );
  }
  console.log(
    `  эталон ${REFERENCE_ISO2}: PLI ${reference.value.toFixed(2)} за ${reference.year} год`,
  );

  // 4. Файл. Ключ — ISO-2 в нижнем регистре: именно так устроены слаги стран в
  //    каталоге (`seed-countries.ts` пишет slug = code, isoCode = code.toUpperCase()).
  const entries = [...latest.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([iso2, v]) =>
        `  ${iso2.toLowerCase()}: { pli: ${v.value.toFixed(2)}, year: ${v.year} }, // ${nameByIso2.get(iso2) ?? ''}`,
    )
    .join('\n');

  const file = `/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ — не редактировать руками.
 * Источник: World Bank, индикатор ${INDICATOR}
 *   «Price level index (Households and NPISHs Final consumption expenditure)».
 * Пересобрать: node --no-warnings scripts/build-price-levels.ts
 *
 * Шкала: США = 100. Значение — во сколько раз дороже или дешевле одна и та же
 * потребительская корзина в стране при пересчёте по рыночному курсу.
 * У каждой страны свой последний доступный год — он хранится рядом со
 * значением и показывается в интерфейсе.
 */

export interface PriceLevel {
  /** Индекс уровня цен, США = 100. */
  pli: number;
  /** Год данных World Bank для этой страны. */
  year: number;
}

export const PRICE_LEVEL_SOURCE = 'World Bank · International Comparison Program';
export const PRICE_LEVEL_SOURCE_URL =
  'https://data.worldbank.org/indicator/${INDICATOR}';
export const PRICE_LEVEL_INDICATOR = '${INDICATOR}';

/** Страна-эталон: базовая корзина в common/estimate.ts задана по её ценам. */
export const PRICE_LEVEL_REFERENCE = {
  iso2: '${REFERENCE_ISO2.toLowerCase()}',
  pli: ${reference.value.toFixed(2)},
  year: ${reference.year},
};

/** Ключ — ISO-2 в нижнем регистре, он же слаг страны в каталоге. */
export const PRICE_LEVELS: Record<string, PriceLevel> = {
${entries}
};
`;

  writeFileSync(OUT_TS, file, 'utf8');
  console.log(`\nГотово: ${latest.size} стран → ${OUT_TS}`);

  // Проверка глазами: если эти множители неправдоподобны, ошибка в методе, а не
  // в данных, и заметить её нужно здесь, а не на странице маршрута.
  console.log('\nМножитель к российским ценам (проверка):');
  for (const iso2 of ['eg', 'th', 'tr', 'ge', 'jp', 'ae', 'it', 'us']) {
    const v = latest.get(iso2.toUpperCase());
    if (!v) {
      console.log(`  ${iso2}: нет данных`);
      continue;
    }
    const k = v.value / reference.value;
    console.log(
      `  ${iso2}: ×${k.toFixed(2)}  (PLI ${v.value.toFixed(1)}, ${v.year}) — ${nameByIso2.get(iso2.toUpperCase())}`,
    );
  }
}

main().catch((e) => {
  console.error('Сборка уровней цен не удалась:', e);
  process.exit(1);
});
