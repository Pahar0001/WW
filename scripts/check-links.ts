/**
 * Проверка исходящих ссылок: возвращают ли они настоящую страницу.
 *
 * Появился после того, как владелец ткнул в две мёртвые ссылки подряд: парковка
 * Шереметьева отдавала 404, а «поиск отеля» на Яндекс Путешествиях открывал
 * пустую форму. Обе выглядели правдоподобно и обе были в коде — потому что
 * ссылку никто не открывал, её сочиняли по памяти.
 *
 * Мораль, ради которой скрипт и написан: **партнёрский или официальный адрес
 * нельзя писать по памяти, его нужно открыть.** Домены живут годами, а пути
 * внутри них меняются каждый редизайн.
 *
 * Что проверяется:
 *  · парковки аэропортов и справочник наземного транспорта (`airports.ts`,
 *    `ground-transport.ts`) — адреса берутся текстом из исходников;
 *  · сайты отелей из выгрузки OpenStreetMap;
 *  · шаблоны ссылок на бронирование и трансфер — на живом примере.
 *
 * ⚠️⚠️ ГЛАВНОЕ ОГРАНИЧЕНИЕ: скрипт НЕ ЗАМЕНЯЕТ БРАУЗЕР.
 *
 * Одностраничные приложения отдают код 200 и на мёртвый адрес — страницу «не
 * найдено» рисует уже скрипт в браузере. Именно так мимо проверки прошли
 * `svo.aero/ru/parkings` (curl: 200, браузер: «Ошибка 404») и первая правка
 * Ostrovok. Ловится это только открыванием страницы настоящим браузером.
 *
 * Поэтому исходов три, а не два: OK, МЁРТВАЯ и «посмотреть глазами». И даже
 * «OK» здесь означает лишь «сервер ответил», а не «человек увидит данные».
 *
 * Запуск:  node --no-warnings scripts/check-links.ts [--hotels]
 * `--hotels` добавляет 500+ сайтов отелей: долго, гонять отдельно.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36';

type Verdict = 'ok' | 'dead' | 'manual';

interface Result {
  url: string;
  where: string;
  status: number | string;
  verdict: Verdict;
  note?: string;
}

/** Хосты, которые отвечают роботу капчей: их код ответа ничего не значит. */
const CAPTCHA_HOSTS = ['travel.yandex.ru', 'yandex.ru', 'booking.com', 'www.booking.com'];

async function check(url: string, where: string): Promise<Result> {
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();

  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': UA, 'Accept-Language': 'ru,en;q=0.8' },
      signal: AbortSignal.timeout(25_000),
    });

    if (CAPTCHA_HOSTS.includes(host)) {
      return { url, where, status: res.status, verdict: 'manual', note: 'отвечает роботу капчей' };
    }
    // 401/403/429 — это защита от роботов, а не мёртвый адрес: живые сайты
    // перевозчиков (irctc.co.in, sncf-connect.com) отвечают роботу именно так.
    // Кричать «мёртвая ссылка» на них — значит приучить не верить проверке.
    if ([401, 403, 429].includes(res.status)) {
      return { url, where, status: res.status, verdict: 'manual', note: 'закрыт от роботов' };
    }
    if (res.status >= 400) return { url, where, status: res.status, verdict: 'dead' };

    // 200 у SPA ещё ничего не значит: страница «не найдено» тоже отдаётся кодом
    // 200. Смотрим на текст — дёшево и ловит ровно тот случай, что был у нас.
    const body = await res.text().catch(() => '');
    const notFound = /ошибка 404|страница не найдена|граница не найдена|page not found|404 not found/i;
    if (notFound.test(body.slice(0, 40_000))) {
      return { url, where, status: res.status, verdict: 'dead', note: 'в теле страница «не найдено»' };
    }
    return { url, where, status: res.status, verdict: 'ok' };
  } catch (e) {
    // Обрыв соединения — это чаще сеть или блокировка по региону, чем «нет
    // страницы». Судить по нему нельзя, но и молчать нельзя.
    return {
      url,
      where,
      status: (e as Error).name,
      verdict: 'manual',
      note: `не открылось отсюда: ${(e as Error).message}`,
    };
  }
}

/** Все http(s)-адреса из файла, вместе с номером строки. */
function urlsFrom(relPath: string): { url: string; where: string }[] {
  const src = readFileSync(join(ROOT, relPath), 'utf8');
  const out: { url: string; where: string }[] = [];
  src.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/https?:\/\/[^\s'"`)\\]+/g)) {
      const url = m[0].replace(/[.,;]+$/, '');
      out.push({ url, where: `${relPath}:${i + 1}` });
    }
  });
  return out;
}

/** Шаблоны ссылок, которые собираются в рантайме, — на живом примере. */
const TEMPLATES: { url: string; where: string }[] = [
  {
    url:
      'https://yandex.ru/maps/?ll=37.413810,55.965210&z=18' +
      '&whatshere%5Bpoint%5D=37.413810,55.965210&whatshere%5Bzoom%5D=18',
    where: 'place-links.ts → карточка отеля по координатам',
  },
  {
    url: 'https://yandex.ru/maps/?text=%D0%BE%D1%82%D0%B5%D0%BB%D0%B8&ll=37.414600,55.972600&z=14',
    where: 'place-links.ts → поиск отелей вокруг точки',
  },
  {
    url: 'https://www.openstreetmap.org/node/6864943985',
    where: 'airport-hotels.ts → объект-источник в OSM',
  },
  {
    url: 'https://www.aviasales.ru/search/MOW0309CAI10091',
    where: 'logistics.service.ts → поиск Aviasales',
  },
  {
    url: 'https://kiwitaxi.ru/search?to=%D0%A8%D0%B5%D1%80%D0%B5%D0%BC%D0%B5%D1%82%D1%8C%D0%B5%D0%B2%D0%BE%20(SVO)&date=2026-09-03',
    where: 'transfer.ts → Kiwitaxi',
  },
  { url: 'https://gettransfer.com/ru/', where: 'transfer.ts → GetTransfer' },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const withHotels = process.argv.includes('--hotels');

  const targets: { url: string; where: string }[] = [
    ...urlsFrom('backend/src/modules/logistics/airports.ts'),
    ...urlsFrom('backend/src/modules/logistics/ground-transport.ts'),
    ...TEMPLATES,
  ];

  if (withHotels) {
    const gen = readFileSync(
      join(ROOT, 'backend/src/modules/logistics/airport-hotels.generated.ts'),
      'utf8',
    );
    for (const m of gen.matchAll(/"website":\s*"([^"]+)"/g)) {
      targets.push({ url: m[1], where: 'airport-hotels.generated.ts → сайт отеля' });
    }
  }

  // Дубли не проверяем дважды: один адрес встречается у нескольких аэропортов.
  const seen = new Map<string, string>();
  for (const t of targets) if (!seen.has(t.url)) seen.set(t.url, t.where);
  const list = [...seen.entries()].map(([url, where]) => ({ url, where }));

  console.log(`Проверяю ${list.length} адресов${withHotels ? ' (включая сайты отелей)' : ''}…\n`);

  const results: Result[] = [];
  // По 6 за раз: мы в гостях у чужих серверов, а не нагружаем их.
  for (let i = 0; i < list.length; i += 6) {
    const chunk = list.slice(i, i + 6);
    results.push(...(await Promise.all(chunk.map((t) => check(t.url, t.where)))));
    process.stdout.write(`\r  ${Math.min(i + 6, list.length)}/${list.length}`);
    await sleep(300);
  }
  console.log('\n');

  const dead = results.filter((r) => r.verdict === 'dead');
  const manual = results.filter((r) => r.verdict === 'manual');

  if (dead.length) {
    console.log('✗ МЁРТВЫЕ ССЫЛКИ:');
    for (const r of dead) {
      console.log(`  ${r.status}  ${r.url}`);
      console.log(`        ${r.where}${r.note ? ` — ${r.note}` : ''}`);
    }
  }

  if (manual.length) {
    console.log('\n⚠ ПРОВЕРИТЬ ГЛАЗАМИ (сервис отвечает роботу капчей):');
    for (const r of manual) console.log(`  ${r.url}\n        ${r.where}`);
  }

  console.log(
    `\nИтого: ${results.length - dead.length - manual.length} живых, ${dead.length} мёртвых, ${manual.length} на ручную проверку.`,
  );
  if (dead.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error('Проверка ссылок не удалась:', e);
  process.exit(1);
});
