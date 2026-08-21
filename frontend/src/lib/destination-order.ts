// Порядок направлений на витрине — Россия-first, затем по «удалённости»:
// Россия → ближнее зарубежье/популярное → Европа → дальнее/экзотика.
// Используется для сортировки маршрутов на главной (hero «маршрут недели»,
// коллекция, глобус), чтобы отечественные направления шли первыми.
const TIER: Record<string, number> = {
  ru: 0, // Россия — всегда первыми
  // ближнее зарубежье и массово-популярные
  ge: 1, am: 1, az: 1, kz: 1, uz: 1, kg: 1, by: 1, tr: 1, ae: 1, eg: 1, th: 1, cy: 1, rs: 1, me: 1, md: 1,
  // Европа
  it: 2, fr: 2, es: 2, de: 2, gb: 2, gr: 2, cz: 2, pt: 2, nl: 2, at: 2, hu: 2, hr: 2, ch: 2, be: 2,
  // дальнее / экзотика
  is: 3, np: 3, pe: 3, jp: 3, cn: 3, in: 3, id: 3, mx: 3, ma: 3, tz: 3, za: 3, vn: 3, lk: 3, ke: 3, ar: 3, cl: 3,
};

export function destinationRank(slug?: string | null): number {
  return slug && slug in TIER ? TIER[slug] : 2.5;
}

/** Стабильная сортировка «Россия-first» по тиру направления. */
export function sortRussiaFirst<T extends { country: { slug?: string } }>(items: T[]): T[] {
  return items
    .map((item, i) => [item, i] as const)
    .sort(([a, ia], [b, ib]) => {
      const d = destinationRank(a.country.slug) - destinationRank(b.country.slug);
      return d !== 0 ? d : ia - ib;
    })
    .map(([item]) => item);
}
