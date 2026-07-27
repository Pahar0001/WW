/**
 * Задания мира Vela.
 *
 * Главное архитектурное решение: задание — это ДАННЫЕ, а не код. У каждой цели
 * есть тип (`Objective.kind`), и все типы обсчитывает один вычислитель
 * (`evaluateQuests` в `quest-runner.ts`). Альтернатива — по функции на задание —
 * означала бы, что добавление квеста требует правки игрового цикла, а десять
 * заданий превратились бы в десять особых случаев внутри `useFrame`.
 *
 * Поэтому здесь нет ни одной строчки логики: только что нужно сделать, где и
 * что игрок за это узнаёт.
 *
 * `giver` уже заложен, но пока не используется: NPC — следующий пункт работ, и
 * когда они появятся, выдача заданий подключится без изменения структуры.
 */

import type { Surface } from './world/terrain';

// ── Цели ───────────────────────────────────────────────────────────────

/**
 * Точка, до которой нужно дойти. Радиус щедрый (8–14 м): цель «встань ровно на
 * пиксель» в игре про прогулки раздражает, а не увлекает.
 */
export type ObjectiveReach = {
  kind: 'reach';
  id: string;
  label: string;
  at: [number, number];
  radius: number;
};

/**
 * Предмет, лежащий в мире. Собирается касанием, как артефакты.
 * `surface` — подсказка о том, на чём предмет лежит; используется только для
 * описания в журнале.
 */
export type ObjectivePickup = {
  kind: 'pickup';
  id: string;
  label: string;
  at: [number, number];
  lift: number;
  /** Внешний вид: доска, символ, ключ, находка. */
  look: 'plank' | 'symbol' | 'key' | 'relic';
  surface?: Surface;
};

/**
 * Место, которое нужно сфотографировать. Отличается от `reach` тем, что
 * недостаточно прийти — нужно нажать кнопку кадра, стоя в точке. Это единственная
 * цель, требующая осознанного действия, и потому она про «посмотреть», а не
 * «пробежать мимо».
 */
export type ObjectivePhoto = {
  kind: 'photo';
  id: string;
  label: string;
  at: [number, number];
  radius: number;
  /** Подпись под снимком в дневнике. */
  caption: string;
};

/**
 * Работа на месте: починить мост, открыть ворота. Требует, чтобы к этому моменту
 * были собраны нужные предметы (цели-`pickup` того же задания), и удержания
 * кнопки действия.
 */
export type ObjectiveWork = {
  kind: 'work';
  id: string;
  label: string;
  at: [number, number];
  radius: number;
  /** Сколько секунд удерживать действие. */
  seconds: number;
  /** Что появляется в мире после выполнения. */
  result: 'bridge' | 'gate';
};

/**
 * Фрагмент Карты Мира. Координат ЗДЕСЬ НЕТ намеренно: фрагменты живут в
 * `story.ts` (`FRAGMENTS`) и там же лежат в мире.
 *
 * Сначала фрагменты были описаны дважды — и как запись сюжета, и как цель
 * задания с теми же координатами. Это два независимых сборщика на одном
 * объекте: любая правка координаты в одном месте оставляла в мире второй,
 * невидимый предмет, а счётчики фрагментов и целей расходились. Теперь цель
 * лишь ССЫЛАЕТСЯ на фрагмент и закрывается, когда тот собран.
 */
export type ObjectiveFragment = {
  kind: 'fragment';
  id: string;
  label: string;
  /** id записи из FRAGMENTS. */
  fragment: string;
};

export type Objective =
  | ObjectiveReach
  | ObjectivePickup
  | ObjectivePhoto
  | ObjectiveWork
  | ObjectiveFragment;

// ── Задания ────────────────────────────────────────────────────────────

export type Quest = {
  id: string;
  title: string;
  /** Одна строка: что делать. Показывается в трекере поверх игры. */
  summary: string;
  /** Зачем это в мире — читается в журнале. */
  brief: string;
  /** Глава, к которой относится задание. */
  chapter: string;
  /** id NPC, который выдаёт задание. Пока не используется (NPC — следующий этап). */
  giver?: string;
  /** Задания, которые должны быть выполнены раньше. */
  requires?: string[];
  objectives: Objective[];
  /** Что игрок получает: запись в дневник и/или отметку о находке. */
  reward: {
    journal?: string;
    /** Короткий текст в тост при завершении. */
    note: string;
  };
};

/**
 * Двенадцать заданий, по одному-два на регион. Типы намеренно разные: прийти,
 * собрать, сфотографировать, починить, открыть, найти человека — иначе
 * «исследование» вырождается в один и тот же сбор предметов с разными
 * названиями.
 *
 * ⚠️ Все координаты обязаны быть на суше и достижимы пешком. Это проверяется
 * скриптом `scripts/check-world.ts` — гоняйте его после любой правки координат.
 */
export const QUESTS: Quest[] = [
  {
    id: 'q-first-steps',
    title: 'Берег без имени',
    summary: 'Дойти до Бухты Зари и осмотреть берег',
    brief:
      'Начинать с воды разумно: берег читается легче всего, и первые картографы описывали материк именно от кромки прибоя.',
    chapter: 'shore',
    objectives: [
      { kind: 'reach', id: 'o-cove', label: 'Спуститься к воде', at: [24, 324], radius: 14 },
      {
        kind: 'fragment',
        id: 'o-frag-shore',
        label: 'Подобрать обрывок с береговой линией',
        fragment: 'frag-shore',
      },
    ],
    reward: { journal: 'j-trails', note: 'Берег описан. Осталось семь частей.' },
  },
  {
    id: 'q-ruins-survey',
    title: 'Мастерская Ордена',
    summary: 'Осмотреть три опорных точки на площади руин',
    brief:
      'Площадь размечена не для красоты: три опорные точки задавали сетку, от которой отмеряли всё остальное. Если пройти по ним, станет видно, как здесь работали.',
    chapter: 'order',
    objectives: [
      { kind: 'reach', id: 'o-ruin-a', label: 'Северная опора', at: [196, 172], radius: 9 },
      { kind: 'reach', id: 'o-ruin-b', label: 'Восточная опора', at: [230, 200], radius: 9 },
      { kind: 'reach', id: 'o-ruin-c', label: 'Западная опора', at: [184, 210], radius: 9 },
      {
        kind: 'fragment',
        id: 'o-frag-ruins',
        label: 'Забрать фрагмент с сеткой меридианов',
        fragment: 'frag-ruins',
      },
    ],
    reward: { journal: 'j-order', note: 'Сетка меридианов на месте.' },
  },
  {
    id: 'q-symbols',
    title: 'Древние символы',
    summary: 'Собрать четыре знака Ордена',
    brief:
      'Картографы метили дороги короткими знаками: сколько дней пути, есть ли вода, проходим ли перевал. Четыре таких знака до сих пор стоят вдоль главной тропы.',
    chapter: 'order',
    objectives: [
      {
        kind: 'pickup',
        id: 'o-sym-1',
        label: 'Знак «вода рядом»',
        at: [40, 218],
        lift: 1.2,
        look: 'symbol',
      },
      {
        kind: 'pickup',
        id: 'o-sym-2',
        label: 'Знак «три дня пути»',
        at: [10, 48],
        lift: 1.2,
        look: 'symbol',
      },
      {
        kind: 'pickup',
        id: 'o-sym-3',
        label: 'Знак «перевал проходим»',
        at: [-16, 14],
        lift: 1.2,
        look: 'symbol',
      },
      {
        kind: 'pickup',
        id: 'o-sym-4',
        label: 'Знак «отсюда видно всё»',
        at: [-96, -22],
        lift: 1.2,
        look: 'symbol',
      },
    ],
    reward: { note: 'Четыре знака собраны. Тропа читается как текст.' },
  },
  {
    id: 'q-bridge',
    title: 'Восстановить мост',
    summary: 'Найти три доски и починить настил через реку',
    brief:
      'Мост через главную реку держится на честном слове. Настил можно восстановить: доски лежат неподалёку, их складывали здесь же.',
    chapter: 'water',
    objectives: [
      {
        kind: 'pickup',
        id: 'o-plank-1',
        label: 'Доска у брода',
        at: [58, 172],
        lift: 0.6,
        look: 'plank',
      },
      {
        kind: 'pickup',
        id: 'o-plank-2',
        label: 'Доска в излучине',
        at: [92, 186],
        lift: 0.6,
        look: 'plank',
      },
      {
        kind: 'pickup',
        id: 'o-plank-3',
        label: 'Доска под берегом',
        at: [66, 152],
        lift: 0.6,
        look: 'plank',
      },
      {
        kind: 'work',
        id: 'o-bridge-fix',
        label: 'Уложить настил',
        at: [73, 175],
        radius: 10,
        seconds: 2.4,
        result: 'bridge',
      },
    ],
    reward: { journal: 'j-water', note: 'Мост держит. Через реку можно ходить.' },
  },
  {
    id: 'q-falls',
    title: 'Правило воды',
    summary: 'Дойти до подножия Водопада Тысячи Лет',
    brief:
      'Река здесь падает с высоты в двадцать шесть метров. Именно на таких перепадах Орден выправлял карту: спорить с водой бессмысленно.',
    chapter: 'water',
    objectives: [
      { kind: 'reach', id: 'o-falls-base', label: 'Подойти к подножию', at: [44, 30], radius: 12 },
      {
        kind: 'fragment',
        id: 'o-frag-falls',
        label: 'Достать фрагмент с речной системой',
        fragment: 'frag-falls',
      },
    ],
    reward: { note: 'Речная система нанесена.' },
  },
  {
    id: 'q-summit',
    title: 'Подняться на вершину',
    summary: 'Дойти до смотровой на Хребте Ветров',
    brief:
      'Сто сорок шесть метров над морем — высшая точка материка. Тропа серпантином: в лоб этот склон не берётся.',
    chapter: 'above',
    objectives: [
      { kind: 'reach', id: 'o-summit', label: 'Выйти на смотровую', at: [16, -282], radius: 12 },
      {
        kind: 'fragment',
        id: 'o-frag-summit',
        label: 'Забрать фрагмент с высотами',
        fragment: 'frag-summit',
      },
    ],
    reward: { journal: 'j-summit', note: 'Высоты хребта нанесены.' },
  },
  {
    id: 'q-photo',
    title: 'Сохранить вид',
    summary: 'Сделать снимок с Балкона Ветров',
    brief:
      'Есть места, которые незачем описывать словами. Балкон над обрывом руин — одно из них: оттуда виден весь юго-восток разом.',
    chapter: 'above',
    objectives: [
      {
        kind: 'photo',
        id: 'o-photo-balcony',
        label: 'Встать на балкон и сделать кадр',
        at: [258, 168],
        radius: 11,
        caption: 'Юго-восток с Балкона Ветров: плато, река и полоса моря за ней.',
      },
    ],
    reward: { journal: 'j-secret', note: 'Кадр сохранён в дневнике.' },
  },
  {
    id: 'q-lost',
    title: 'Потерянный путешественник',
    summary: 'Найти того, кто не вернулся с ледника',
    brief:
      'На леднике осталась стоянка: кто-то дошёл до трещин, разбил лагерь и не пошёл дальше. Его записи должны быть там же.',
    chapter: 'ice',
    objectives: [
      { kind: 'reach', id: 'o-camp', label: 'Найти стоянку на льду', at: [-176, -258], radius: 13 },
      {
        kind: 'fragment',
        id: 'o-frag-glacier',
        label: 'Забрать карту трещин',
        fragment: 'frag-glacier',
      },
    ],
    reward: { journal: 'j-ice', note: 'Карта трещин найдена. Он дошёл дальше, чем думал.' },
  },
  {
    id: 'q-gate',
    title: 'Древние ворота',
    summary: 'Найти ключ и открыть ворота на дне каньона',
    brief:
      'Дно каньона перекрыто воротами Ордена — не от врагов, а от воды: створки держали паводок. Ключ должен быть на плато выше.',
    chapter: 'sand',
    objectives: [
      {
        kind: 'pickup',
        id: 'o-gate-key',
        label: 'Найти ключ на плато',
        at: [-286, 78],
        lift: 1.2,
        look: 'key',
      },
      {
        kind: 'work',
        id: 'o-gate-open',
        label: 'Открыть створки',
        at: [-310, 8],
        radius: 11,
        seconds: 3,
        result: 'gate',
      },
    ],
    reward: { note: 'Ворота открыты. Каньон проходим насквозь.' },
  },
  {
    id: 'q-volcano',
    title: 'Гора, которая дышит',
    summary: 'Выйти на гребень вулкана над жерлом',
    brief:
      'Единственное место на материке, где карта устаревает быстрее, чем её чертят. Гребень над жерлом — самая высокая точка, до которой ещё можно дойти живым.',
    chapter: 'fire',
    objectives: [
      { kind: 'reach', id: 'o-rim', label: 'Подняться на гребень', at: [222, -272], radius: 12 },
      {
        kind: 'fragment',
        id: 'o-frag-volcano',
        label: 'Забрать фрагмент с кальдерой',
        fragment: 'frag-volcano',
      },
    ],
    reward: { journal: 'j-fire', note: 'Кальдера нанесена. Трижды поверх — как и было.' },
  },
  {
    id: 'q-desert',
    title: 'Песок считает шаги',
    summary: 'Дойти до оазиса через восточную гряду',
    brief:
      'В пустыне отмечают только воду: всё остальное здесь лишнее, а лишнее убивает. До оазиса от руин — переход через гряду, и он честно длинный.',
    chapter: 'sand',
    objectives: [
      { kind: 'reach', id: 'o-oasis', label: 'Выйти к воде', at: [286, 124], radius: 14 },
      {
        kind: 'fragment',
        id: 'o-frag-desert',
        label: 'Забрать фрагмент с колодцами',
        fragment: 'frag-desert',
      },
    ],
    reward: { journal: 'j-sand', note: 'Колодцы нанесены. Вода на карте важнее рельефа.' },
  },
  {
    id: 'q-temple',
    title: 'Скрытый храм',
    summary: 'Найти то, чего нет ни на одном фрагменте',
    brief:
      'На всех восьми частях карты одно место оставлено пустым. Либо Орден до него не дошёл, либо дошёл и решил не записывать.',
    chapter: 'map',
    requires: ['q-summit'],
    objectives: [
      { kind: 'reach', id: 'o-temple', label: 'Найти вход', at: [-196, 254], radius: 14 },
      {
        kind: 'fragment',
        id: 'o-frag-lake',
        label: 'Забрать сердцевину карты',
        fragment: 'frag-lake',
      },
    ],
    reward: { journal: 'j-map', note: 'Сердцевина карты на месте.' },
  },
];

export const QUEST_BY_ID = new Map(QUESTS.map((q) => [q.id, q]));

/** Все цели всех заданий, разложенные по id — для быстрого поиска в цикле. */
export const OBJECTIVE_BY_ID = new Map<string, { quest: Quest; objective: Objective }>();
for (const quest of QUESTS) {
  for (const objective of quest.objectives) {
    OBJECTIVE_BY_ID.set(objective.id, { quest, objective });
  }
}

/** Предметы, лежащие в мире: нужны и логике, и отрисовке. */
export const PICKUPS = QUESTS.flatMap((q) =>
  q.objectives.filter((o): o is ObjectivePickup => o.kind === 'pickup').map((o) => ({ quest: q.id, ...o })),
);

/** Места работ (мост, ворота) — отрисовываются до и после выполнения. */
export const WORKS = QUESTS.flatMap((q) =>
  q.objectives.filter((o): o is ObjectiveWork => o.kind === 'work').map((o) => ({ quest: q.id, ...o })),
);

/** Точки съёмки. */
export const PHOTOS = QUESTS.flatMap((q) =>
  q.objectives.filter((o): o is ObjectivePhoto => o.kind === 'photo').map((o) => ({ quest: q.id, ...o })),
);
