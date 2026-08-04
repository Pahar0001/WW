/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ — не редактировать руками.
 * Источник: World Bank, индикатор PA.NUS.PRVT.PLI
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
  'https://data.worldbank.org/indicator/PA.NUS.PRVT.PLI';
export const PRICE_LEVEL_INDICATOR = 'PA.NUS.PRVT.PLI';

/** Страна-эталон: базовая корзина в common/estimate.ts задана по её ценам. */
export const PRICE_LEVEL_REFERENCE = {
  iso2: 'ru',
  pli: 36.76,
  year: 2025,
};

/** Ключ — ISO-2 в нижнем регистре, он же слаг страны в каталоге. */
export const PRICE_LEVELS: Record<string, PriceLevel> = {
  ad: { pli: 75.59, year: 2021 }, // Andorra
  ae: { pli: 69.79, year: 2024 }, // United Arab Emirates
  af: { pli: 19.71, year: 2024 }, // Afghanistan
  ag: { pli: 81.17, year: 2025 }, // Antigua and Barbuda
  al: { pli: 54.28, year: 2025 }, // Albania
  am: { pli: 40.96, year: 2025 }, // Armenia
  ao: { pli: 34.42, year: 2025 }, // Angola
  ar: { pli: 45.25, year: 2021 }, // Argentina
  as: { pli: 90.34, year: 2021 }, // American Samoa
  at: { pli: 84.79, year: 2025 }, // Austria
  au: { pli: 94.79, year: 2025 }, // Australia
  aw: { pli: 84.55, year: 2021 }, // Aruba
  az: { pli: 31.94, year: 2025 }, // Azerbaijan
  ba: { pli: 44.33, year: 2025 }, // Bosnia and Herzegovina
  bb: { pli: 131.87, year: 2021 }, // Barbados
  bd: { pli: 28.91, year: 2025 }, // Bangladesh
  be: { pli: 87.21, year: 2025 }, // Belgium
  bf: { pli: 33.18, year: 2025 }, // Burkina Faso
  bg: { pli: 46.74, year: 2025 }, // Bulgaria
  bh: { pli: 48.79, year: 2025 }, // Bahrain
  bi: { pli: 25.20, year: 2025 }, // Burundi
  bj: { pli: 33.71, year: 2025 }, // Benin
  bm: { pli: 144.14, year: 2021 }, // Bermuda
  bn: { pli: 40.31, year: 2025 }, // Brunei Darussalam
  bo: { pli: 39.06, year: 2025 }, // Bolivia
  br: { pli: 46.20, year: 2025 }, // Brazil
  bs: { pli: 110.68, year: 2024 }, // Bahamas, The
  bt: { pli: 24.15, year: 2025 }, // Bhutan
  bw: { pli: 39.33, year: 2025 }, // Botswana
  by: { pli: 27.65, year: 2025 }, // Belarus
  bz: { pli: 54.38, year: 2025 }, // Belize
  ca: { pli: 90.16, year: 2025 }, // Canada
  cd: { pli: 46.66, year: 2021 }, // Congo, Dem. Rep.
  cf: { pli: 44.51, year: 2025 }, // Central African Republic
  cg: { pli: 39.74, year: 2025 }, // Congo, Rep.
  ch: { pli: 128.17, year: 2025 }, // Switzerland
  ci: { pli: 39.22, year: 2025 }, // Cote d'Ivoire
  cl: { pli: 51.18, year: 2025 }, // Chile
  cm: { pli: 35.92, year: 2025 }, // Cameroon
  cn: { pli: 48.12, year: 2025 }, // China
  co: { pli: 41.09, year: 2025 }, // Colombia
  cr: { pli: 62.47, year: 2025 }, // Costa Rica
  cv: { pli: 54.14, year: 2025 }, // Cabo Verde
  cw: { pli: 78.72, year: 2021 }, // Curacao
  cy: { pli: 66.92, year: 2025 }, // Cyprus
  cz: { pli: 66.99, year: 2025 }, // Czechia
  de: { pli: 81.23, year: 2025 }, // Germany
  dj: { pli: 49.82, year: 2025 }, // Djibouti
  dk: { pli: 104.53, year: 2025 }, // Denmark
  dm: { pli: 57.70, year: 2025 }, // Dominica
  do: { pli: 38.41, year: 2025 }, // Dominican Republic
  dz: { pli: 31.71, year: 2025 }, // Algeria
  ec: { pli: 44.15, year: 2025 }, // Ecuador
  ee: { pli: 75.91, year: 2025 }, // Estonia
  eg: { pli: 15.55, year: 2025 }, // Egypt, Arab Rep.
  er: { pli: 34.47, year: 2021 }, // Eritrea
  es: { pli: 68.69, year: 2025 }, // Spain
  et: { pli: 22.61, year: 2025 }, // Ethiopia
  fi: { pli: 90.63, year: 2025 }, // Finland
  fj: { pli: 38.69, year: 2025 }, // Fiji
  fm: { pli: 92.67, year: 2022 }, // Micronesia, Fed. Sts.
  fo: { pli: 103.90, year: 2021 }, // Faroe Islands
  fr: { pli: 82.77, year: 2025 }, // France
  ga: { pli: 48.26, year: 2025 }, // Gabon
  gb: { pli: 92.37, year: 2025 }, // United Kingdom
  gd: { pli: 61.78, year: 2025 }, // Grenada
  ge: { pli: 39.66, year: 2025 }, // Georgia
  gh: { pli: 41.81, year: 2025 }, // Ghana
  gl: { pli: 87.26, year: 2021 }, // Greenland
  gm: { pli: 28.63, year: 2024 }, // Gambia, The
  gn: { pli: 41.83, year: 2025 }, // Guinea
  gq: { pli: 45.47, year: 2024 }, // Equatorial Guinea
  gr: { pli: 65.55, year: 2025 }, // Greece
  gt: { pli: 44.69, year: 2025 }, // Guatemala
  gu: { pli: 111.21, year: 2021 }, // Guam
  gw: { pli: 38.64, year: 2025 }, // Guinea-Bissau
  gy: { pli: 46.91, year: 2025 }, // Guyana
  hk: { pli: 73.97, year: 2025 }, // Hong Kong SAR, China
  hn: { pli: 48.62, year: 2025 }, // Honduras
  hr: { pli: 58.85, year: 2025 }, // Croatia
  ht: { pli: 102.17, year: 2025 }, // Haiti
  hu: { pli: 57.92, year: 2025 }, // Hungary
  id: { pli: 30.74, year: 2025 }, // Indonesia
  ie: { pli: 102.15, year: 2025 }, // Ireland
  il: { pli: 105.91, year: 2025 }, // Israel
  in: { pli: 22.72, year: 2025 }, // India
  iq: { pli: 42.00, year: 2025 }, // Iraq
  ir: { pli: 21.25, year: 2025 }, // Iran, Islamic Rep.
  is: { pli: 129.71, year: 2025 }, // Iceland
  it: { pli: 72.86, year: 2025 }, // Italy
  jm: { pli: 61.75, year: 2025 }, // Jamaica
  jo: { pli: 44.83, year: 2025 }, // Jordan
  jp: { pli: 69.05, year: 2025 }, // Japan
  ke: { pli: 34.79, year: 2025 }, // Kenya
  kg: { pli: 33.56, year: 2025 }, // Kyrgyz Republic
  kh: { pli: 36.70, year: 2025 }, // Cambodia
  ki: { pli: 61.66, year: 2024 }, // Kiribati
  km: { pli: 58.15, year: 2025 }, // Comoros
  kn: { pli: 79.49, year: 2023 }, // St. Kitts and Nevis
  kr: { pli: 61.87, year: 2025 }, // Korea, Rep.
  kw: { pli: 59.78, year: 2025 }, // Kuwait
  ky: { pli: 140.10, year: 2021 }, // Cayman Islands
  kz: { pli: 36.65, year: 2025 }, // Kazakhstan
  la: { pli: 28.71, year: 2025 }, // Lao PDR
  lb: { pli: 65.33, year: 2025 }, // Lebanon
  lc: { pli: 59.06, year: 2025 }, // St. Lucia
  lk: { pli: 26.96, year: 2025 }, // Sri Lanka
  lr: { pli: 53.35, year: 2025 }, // Liberia
  ls: { pli: 34.84, year: 2025 }, // Lesotho
  lt: { pli: 62.11, year: 2025 }, // Lithuania
  lu: { pli: 98.65, year: 2025 }, // Luxembourg
  lv: { pli: 62.39, year: 2025 }, // Latvia
  ly: { pli: 33.79, year: 2025 }, // Libya
  ma: { pli: 42.35, year: 2025 }, // Morocco
  md: { pli: 50.50, year: 2025 }, // Moldova
  me: { pli: 49.60, year: 2025 }, // Montenegro
  mg: { pli: 29.04, year: 2025 }, // Madagascar
  mh: { pli: 95.21, year: 2021 }, // Marshall Islands
  mk: { pli: 40.97, year: 2025 }, // North Macedonia
  ml: { pli: 33.24, year: 2025 }, // Mali
  mm: { pli: 29.21, year: 2021 }, // Myanmar
  mn: { pli: 33.31, year: 2025 }, // Mongolia
  mo: { pli: 61.61, year: 2025 }, // Macao SAR, China
  mp: { pli: 93.75, year: 2021 }, // Northern Mariana Islands
  mr: { pli: 30.64, year: 2025 }, // Mauritania
  mt: { pli: 68.97, year: 2025 }, // Malta
  mu: { pli: 43.71, year: 2025 }, // Mauritius
  mv: { pli: 62.11, year: 2025 }, // Maldives
  mw: { pli: 35.82, year: 2025 }, // Malawi
  mx: { pli: 58.79, year: 2025 }, // Mexico
  my: { pli: 33.39, year: 2025 }, // Malaysia
  mz: { pli: 39.79, year: 2025 }, // Mozambique
  na: { pli: 41.25, year: 2025 }, // Namibia
  nc: { pli: 115.08, year: 2021 }, // New Caledonia
  ne: { pli: 34.30, year: 2025 }, // Niger
  ng: { pli: 20.95, year: 2025 }, // Nigeria
  ni: { pli: 36.95, year: 2025 }, // Nicaragua
  nl: { pli: 86.71, year: 2025 }, // Netherlands
  no: { pli: 96.21, year: 2025 }, // Norway
  np: { pli: 25.88, year: 2025 }, // Nepal
  nr: { pli: 85.34, year: 2021 }, // Naoero
  nz: { pli: 89.77, year: 2025 }, // New Zealand
  om: { pli: 47.30, year: 2025 }, // Oman
  pa: { pli: 49.67, year: 2025 }, // Panama
  pe: { pli: 54.02, year: 2025 }, // Peru
  pf: { pli: 100.98, year: 2021 }, // French Polynesia
  pg: { pli: 66.99, year: 2025 }, // Papua New Guinea
  ph: { pli: 35.71, year: 2025 }, // Philippines
  pk: { pli: 23.40, year: 2025 }, // Pakistan
  pl: { pli: 54.86, year: 2025 }, // Poland
  pr: { pli: 89.69, year: 2021 }, // Puerto Rico (US)
  ps: { pli: 90.65, year: 2025 }, // West Bank and Gaza
  pt: { pli: 64.94, year: 2025 }, // Portugal
  pw: { pli: 96.33, year: 2025 }, // Palau
  py: { pli: 38.10, year: 2025 }, // Paraguay
  qa: { pli: 75.70, year: 2024 }, // Qatar
  ro: { pli: 48.78, year: 2025 }, // Romania
  rs: { pli: 50.91, year: 2025 }, // Serbia
  ru: { pli: 36.76, year: 2025 }, // Russian Federation
  rw: { pli: 26.09, year: 2025 }, // Rwanda
  sa: { pli: 49.90, year: 2025 }, // Saudi Arabia
  sb: { pli: 91.84, year: 2025 }, // Solomon Islands
  sc: { pli: 57.39, year: 2025 }, // Seychelles
  sd: { pli: 40.30, year: 2022 }, // Sudan
  se: { pli: 90.51, year: 2025 }, // Sweden
  sg: { pli: 78.31, year: 2025 }, // Singapore
  si: { pli: 66.99, year: 2025 }, // Slovenia
  sk: { pli: 63.93, year: 2025 }, // Slovak Republic
  sl: { pli: 30.57, year: 2025 }, // Sierra Leone
  sm: { pli: 83.16, year: 2025 }, // San Marino
  sn: { pli: 38.92, year: 2025 }, // Senegal
  so: { pli: 39.91, year: 2021 }, // Somalia, Fed. Rep.
  sr: { pli: 41.95, year: 2025 }, // Suriname
  ss: { pli: 83.10, year: 2021 }, // South Sudan
  st: { pli: 67.77, year: 2025 }, // Sao Tome and Principe
  sv: { pli: 46.88, year: 2025 }, // El Salvador
  sx: { pli: 85.87, year: 2021 }, // Sint Maarten (Dutch part)
  sy: { pli: 17.55, year: 2021 }, // Syrian Arab Republic
  sz: { pli: 41.86, year: 2021 }, // Eswatini
  tc: { pli: 131.72, year: 2021 }, // Turks and Caicos Islands
  td: { pli: 38.28, year: 2025 }, // Chad
  tg: { pli: 37.53, year: 2025 }, // Togo
  th: { pli: 32.25, year: 2025 }, // Thailand
  tj: { pli: 28.46, year: 2021 }, // Tajikistan
  tl: { pli: 44.56, year: 2025 }, // Timor-Leste
  tm: { pli: 23.91, year: 2021 }, // Turkmenistan
  tn: { pli: 32.71, year: 2025 }, // Tunisia
  to: { pli: 78.35, year: 2025 }, // Tonga
  tr: { pli: 44.97, year: 2025 }, // Turkiye
  tt: { pli: 56.91, year: 2025 }, // Trinidad and Tobago
  tv: { pli: 97.23, year: 2021 }, // Tuvalu
  tz: { pli: 26.03, year: 2025 }, // Tanzania
  ua: { pli: 28.46, year: 2025 }, // Ukraine
  ug: { pli: 36.37, year: 2025 }, // Uganda
  us: { pli: 100.00, year: 2025 }, // United States
  uy: { pli: 72.48, year: 2025 }, // Uruguay
  uz: { pli: 28.41, year: 2025 }, // Uzbekistan
  vc: { pli: 62.15, year: 2025 }, // St. Vincent and the Grenadines
  vi: { pli: 101.03, year: 2021 }, // Virgin Islands (U.S.)
  vn: { pli: 28.86, year: 2025 }, // Viet Nam
  vu: { pli: 101.59, year: 2025 }, // Vanuatu
  ws: { pli: 67.60, year: 2025 }, // Samoa
  xk: { pli: 40.67, year: 2022 }, // Kosovo
  za: { pli: 43.27, year: 2025 }, // South Africa
  zm: { pli: 33.40, year: 2025 }, // Zambia
  zw: { pli: 64.42, year: 2021 }, // Zimbabwe
};
