/**
 * Проверка связности сюжета: главы, фрагменты Карты Мира, задания, дневник.
 *
 * Ловит то, что не видят ни компилятор, ни быстрая проверка в браузере:
 * задание, которое невозможно закрыть; главу, которую нечем открыть; ссылку на
 * несуществующую запись дневника; цикл в предусловиях. Такие поломки
 * обнаруживаются игроком через полчаса игры — и только если он дойдёт.
 *
 * Запуск: node --no-warnings scripts/check-story.ts
 */
import {
  CHAPTERS,
  FRAGMENTS,
  JOURNAL,
  OPENING_JOURNAL,
  REGION_JOURNAL,
} from '../src/components/game/story.ts';
import { QUESTS } from '../src/components/game/quests.ts';
import { REGIONS } from '../src/components/game/regions.ts';

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

const chapterIds = new Set(CHAPTERS.map((c) => c.id));
const fragmentIds = new Set(FRAGMENTS.map((f) => f.id));
const journalIds = new Set(JOURNAL.map((j) => j.id));
const questIds = new Set(QUESTS.map((q) => q.id));

console.log(
  `сюжет: ${CHAPTERS.length} глав, ${FRAGMENTS.length} фрагментов, ${QUESTS.length} заданий, ${JOURNAL.length} записей дневника\n`,
);

// ── Уникальность идентификаторов ──
console.log('идентификаторы:');
{
  const seen = new Set<string>();
  for (const q of QUESTS) {
    if (seen.has(q.id)) fail(`задание ${q.id} объявлено дважды`);
    seen.add(q.id);
  }
  const objSeen = new Map<string, string>();
  for (const q of QUESTS) {
    for (const o of q.objectives) {
      const prev = objSeen.get(o.id);
      // Одна цель в двух заданиях — это гарантированный рассинхрон: закрытие
      // цели закроет её сразу в обоих, и второе задание завершится само.
      if (prev) fail(`цель ${o.id} используется и в ${prev}, и в ${q.id}`);
      objSeen.set(o.id, q.id);
    }
  }
  for (const set of [
    ['глава', CHAPTERS.map((c) => c.id)] as const,
    ['фрагмент', FRAGMENTS.map((f) => f.id)] as const,
    ['запись дневника', JOURNAL.map((j) => j.id)] as const,
  ]) {
    const dup = set[1].filter((id, i) => set[1].indexOf(id) !== i);
    for (const d of dup) fail(`${set[0]} ${d} объявлен дважды`);
  }
  if (errors === 0) console.log('  ✓ все идентификаторы уникальны');
}

// ── Ссылки ──
console.log('\nссылки:');
{
  const before = errors;
  for (const q of QUESTS) {
    if (!chapterIds.has(q.chapter)) fail(`задание ${q.id} ссылается на главу «${q.chapter}», которой нет`);
    if (q.reward.journal && !journalIds.has(q.reward.journal)) {
      fail(`награда задания ${q.id} ссылается на запись дневника «${q.reward.journal}», которой нет`);
    }
    for (const r of q.requires ?? []) {
      if (!questIds.has(r)) fail(`предусловие задания ${q.id} ссылается на «${r}», которого нет`);
    }
    for (const o of q.objectives) {
      if (o.kind === 'fragment' && !fragmentIds.has(o.fragment)) {
        fail(`цель ${o.id} ссылается на фрагмент «${o.fragment}», которого нет`);
      }
    }
  }
  for (const f of FRAGMENTS) {
    // Пустая глава допустима: последний фрагмент ничего не открывает.
    if (f.chapter && !chapterIds.has(f.chapter)) {
      fail(`фрагмент ${f.id} открывает главу «${f.chapter}», которой нет`);
    }
  }
  for (const j of JOURNAL) {
    if (!chapterIds.has(j.chapter)) fail(`запись ${j.id} привязана к главе «${j.chapter}», которой нет`);
  }
  if (errors === before) console.log('  ✓ все ссылки ведут в существующие сущности');
}

// ── Открываемость глав ──
// Первая глава открывается началом игры (gameStore.start), остальные —
// фрагментами. Глава без «открывателя» — это мёртвый текст в файле.
console.log('\nглавы:');
{
  const before = errors;
  const openedByFragment = new Set(FRAGMENTS.map((f) => f.chapter).filter(Boolean));
  const first = [...CHAPTERS].sort((a, b) => a.order - b.order)[0];
  for (const c of CHAPTERS) {
    if (c.id === first.id) continue;
    if (!openedByFragment.has(c.id)) {
      fail(`главу «${c.title}» (${c.id}) нечем открыть: ни один фрагмент на неё не ссылается`);
    }
  }
  const orders = CHAPTERS.map((c) => c.order).sort((a, b) => a - b);
  for (let i = 0; i < orders.length; i++) {
    if (orders[i] !== i + 1) {
      warn(`порядок глав не подряд: ожидался ${i + 1}, получен ${orders[i]}`);
      break;
    }
  }
  if (errors === before) {
    console.log(`  ✓ все главы открываемы (первая — «${first.title}» началом игры)`);
  }
}

// ── Выполнимость заданий ──
console.log('\nвыполнимость заданий:');
{
  const before = errors;
  for (const q of QUESTS) {
    if (q.objectives.length === 0) fail(`задание ${q.id} без целей — закрыть его невозможно`);

    // Работа требует, чтобы были собраны ВСЕ предметы того же задания
    // (см. quest-runner). Работа без предметов доступна сразу — это не ошибка,
    // но стоит знать: значит, «принеси и почини» вырождается в «почини».
    const works = q.objectives.filter((o) => o.kind === 'work');
    const pickups = q.objectives.filter((o) => o.kind === 'pickup');
    for (const w of works) {
      if (pickups.length === 0) {
        warn(`работа ${w.id} в задании ${q.id} не требует ни одного предмета — доступна сразу`);
      }
    }
  }

  // Цикл в предусловиях: задания заблокируют друг друга навсегда.
  const state = new Map<string, 0 | 1 | 2>();
  const walk = (id: string, path: string[]): void => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) {
      fail(`цикл в предусловиях: ${[...path, id].join(' → ')}`);
      return;
    }
    state.set(id, 1);
    const q = QUESTS.find((x) => x.id === id);
    for (const r of q?.requires ?? []) walk(r, [...path, id]);
    state.set(id, 2);
  };
  for (const q of QUESTS) walk(q.id, []);

  if (errors === before) console.log('  ✓ каждое задание закрываемо, циклов в предусловиях нет');
}

// ── Покрытие ──
console.log('\nпокрытие:');
{
  const referenced = new Set(
    QUESTS.flatMap((q) => q.objectives.filter((o) => o.kind === 'fragment').map((o) => o.fragment)),
  );
  const orphan = FRAGMENTS.filter((f) => !referenced.has(f.id));
  if (orphan.length) {
    warn(
      `фрагменты вне заданий (собираются, но без сюжетной рамки): ${orphan.map((f) => f.id).join(', ')}`,
    );
  } else {
    console.log(`  ✓ все ${FRAGMENTS.length} фрагментов входят в задания`);
  }

  // Каждая запись дневника обязана быть чем-то выдана: наградой за задание,
  // приходом в регион или началом игры. Запись, которую нельзя получить, —
  // это мёртвый текст, который читатель файла принимает за работающий.
  const usedJournal = new Set<string>([
    ...QUESTS.map((q) => q.reward.journal).filter((x): x is string => !!x),
    ...Object.values(REGION_JOURNAL),
    OPENING_JOURNAL,
  ]);
  for (const id of usedJournal) {
    if (!journalIds.has(id)) fail(`выдаётся запись дневника «${id}», которой нет`);
  }
  const unreachableEntries = JOURNAL.filter((j) => !usedJournal.has(j.id));
  if (unreachableEntries.length) {
    fail(
      `записи дневника невозможно получить: ${unreachableEntries.map((j) => j.id).join(', ')}`,
    );
  } else {
    console.log(`  ✓ все ${JOURNAL.length} записей дневника выдаются событиями`);
  }

  const regionKeys = Object.keys(REGION_JOURNAL);
  const unknownRegions = regionKeys.filter((r) => !REGIONS.some((x) => x.id === r));
  if (unknownRegions.length) {
    fail(`REGION_JOURNAL ссылается на регионы, которых нет: ${unknownRegions.join(', ')}`);
  }
}

console.log(
  `\n${errors === 0 ? '✓ сюжет связен' : `✗ ошибок: ${errors}`}${warnings ? `, предупреждений: ${warnings}` : ''}`,
);
process.exit(errors === 0 ? 0 : 1);
