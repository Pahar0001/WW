/**
 * Проверка юридического слоя: версии документов, реквизиты, покрытие согласий.
 *
 * Главное, что ловит скрипт, — РАСХОЖДЕНИЕ ВЕРСИЙ между фронтом и бэком.
 * Список редакций объявлен дважды (`frontend/src/lib/legal/versions.ts` и
 * `backend/src/modules/legal/versions.ts`), потому что Docker собирает эти две
 * папки из разных контекстов и общий файл из корня репозитория не попадёт ни в
 * один образ. Если списки разъедутся, поломка будет бесшумной и хуже некуда:
 * человек видит на экране одну редакцию, а в базу как доказательство ложится
 * другая — и согласие перестаёт что-либо доказывать.
 *
 * ⚠️ Файлы читаются ТЕКСТОМ, а не импортируются. Импортировать их отсюда нельзя:
 * Node требует расширение `.ts` в пути, а настройки Next это расширение
 * запрещают (§12.7 хендоффа — на этом уже падала сборка). Структуру документов
 * и без того проверяет `tsc --noEmit`; здесь нужна сверка того, что компилятор
 * увидеть не может, — согласованность двух независимых списков.
 *
 * Запуск (из папки frontend): node --no-warnings scripts/check-legal.ts
 */
import { readFileSync } from 'node:fs';

let errors = 0;
let warnings = 0;
const fail = (msg: string) => {
  errors++;
  console.log(`  ✗ ${msg}`);
};
const warn = (msg: string) => {
  warnings++;
  console.log(`  ⚠ ${msg}`);
};
const ok = (msg: string) => console.log(`  ✓ ${msg}`);

const read = (relative: string): string | null => {
  try {
    return readFileSync(new URL(relative, import.meta.url), 'utf8');
  } catch {
    return null;
  }
};

/** Пары «ключ: 'значение'» внутри именованного объектного литерала. */
function parseMap(source: string, name: string): Record<string, string> | null {
  const block = source.match(new RegExp(`${name}[^=]*=\\s*{([^}]*)}`, 's'))?.[1];
  if (!block) return null;
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/(\w+)\s*:\s*'([^']*)'/g)) out[m[1]] = m[2];
  return Object.keys(out).length > 0 ? out : null;
}

const frontVersionsSrc = read('../src/lib/legal/versions.ts');
const backVersionsSrc = read('../../backend/src/modules/legal/versions.ts');
const schemaSrc = read('../../backend/prisma/schema.prisma');
const operatorSrc = read('../src/lib/legal/operator.ts');

// ── 1. Версии фронта и бэка ────────────────────────────────────────────────
console.log('версии документов');
const front = frontVersionsSrc && parseMap(frontVersionsSrc, 'DOCUMENT_VERSIONS');
const back = backVersionsSrc && parseMap(backVersionsSrc, 'DOCUMENT_VERSIONS');

if (!front) fail('не разобрать DOCUMENT_VERSIONS фронта (src/lib/legal/versions.ts)');
if (!back) fail('не разобрать DOCUMENT_VERSIONS бэкенда (backend/src/modules/legal/versions.ts)');

if (front && back) {
  for (const [key, version] of Object.entries(front)) {
    if (!(key in back)) fail(`бэкенд не знает документа ${key}`);
    else if (back[key] !== version) {
      fail(`${key}: фронт «${version}», бэкенд «${back[key]}» — версии разъехались`);
    }
  }
  for (const key of Object.keys(back)) {
    if (!(key in front)) fail(`фронт не знает документа ${key}`);
  }
  if (errors === 0) ok(`совпадают: ${Object.keys(front).join(', ')}`);
}

// ── 2. Документы берут версию из versions.ts, а не хардкодят ───────────────
console.log('\nдокументы');
{
  const files: Record<string, string> = {
    TERMS: '../src/lib/legal/terms.ts',
    PRIVACY: '../src/lib/legal/privacy.ts',
    COOKIES: '../src/lib/legal/cookies.ts',
  };
  for (const [key, path] of Object.entries(files)) {
    const src = read(path);
    if (!src) {
      fail(`нет файла ${path}`);
      continue;
    }
    if (!src.includes(`DOCUMENT_VERSIONS.${key}`)) {
      fail(`${key}: версия не берётся из DOCUMENT_VERSIONS.${key} — разъедется при следующей правке`);
    }
    if (!new RegExp(`key:\\s*'${key}'`).test(src)) fail(`${key}: в документе не тот key`);
    if (!/href:\s*'\//.test(src)) fail(`${key}: не указан href`);
  }
  if (front) {
    for (const key of Object.keys(front)) {
      if (!(key in files)) warn(`для документа ${key} нет файла в списке проверки`);
    }
  }
  if (errors === 0) ok('каждый документ берёт свою редакцию из versions.ts');
}

// ── 3. Виды согласий: схема БД ↔ карта документов ──────────────────────────
console.log('\nсогласия');
{
  const kinds = schemaSrc
    ? [...(schemaSrc.match(/enum ConsentKind \{([^}]*)\}/s)?.[1] ?? '').matchAll(/^\s*([A-Z_]+)/gm)].map(
        (m) => m[1],
      )
    : [];
  const map = backVersionsSrc && parseMap(backVersionsSrc, 'CONSENT_DOCUMENT');

  if (kinds.length === 0) fail('не найден enum ConsentKind в schema.prisma');
  if (!map) fail('не разобрать CONSENT_DOCUMENT бэкенда');

  if (kinds.length > 0 && map) {
    for (const kind of kinds) {
      if (!(kind in map)) fail(`вид согласия ${kind} есть в схеме, но не описан документом`);
      else if (front && !(map[kind] in front)) {
        fail(`${kind} ссылается на документ ${map[kind]}, которого нет`);
      }
    }
    for (const kind of Object.keys(map)) {
      if (!kinds.includes(kind)) fail(`CONSENT_DOCUMENT знает ${kind}, а в схеме такого нет`);
    }
    if (errors === 0) ok(`все ${kinds.length} видов согласия описаны существующими документами`);
  }
}

// ── 4. Реквизиты оператора ─────────────────────────────────────────────────
console.log('\nреквизиты оператора');
if (!operatorSrc) {
  fail('нет файла src/lib/legal/operator.ts');
} else {
  const stubs = [...operatorSrc.matchAll(/^\s*(\w+):\s*'\{\{([^}]*)\}\}'/gm)].map((m) => m[1]);
  if (stubs.length > 0) {
    warn(`не заполнены: ${stubs.join(', ')} — документы показываются как черновик`);
  } else {
    ok('заполнены');
  }
}

console.log(
  `\n${errors === 0 ? '✓ юридический слой согласован' : `✗ ошибок: ${errors}`}` +
    `${warnings ? `, предупреждений: ${warnings}` : ''}`,
);
process.exit(errors === 0 ? 0 : 1);
