/**
 * СГЕНЕРИРОВАННЫЙ ФАЙЛ — не редактировать руками.
 * Источник: OpenStreetMap через Overpass API, лицензия ODbL.
 * Пересобрать: node --no-warnings scripts/build-airport-hotels.ts
 *
 * Отели, хостелы и апартаменты в радиусе 6 км от точки аэропорта.
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
export const AIRPORT_HOTELS_FETCHED_AT = '2026-08-04';
export const AIRPORT_HOTELS_SOURCE = 'OpenStreetMap';
export const AIRPORT_HOTELS_SOURCE_URL = 'https://www.openstreetmap.org/copyright';

export const AIRPORT_HOTELS: Record<string, AirportHotel[]> = {
  AER: [
    {
      "name": "Сергий",
      "lat": 43.45616,
      "lng": 39.95008,
      "distanceKm": 0.9,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/4379400493"
    },
    {
      "name": "Мегафон",
      "lat": 43.45096,
      "lng": 39.9431,
      "distanceKm": 1.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/68171023"
    },
    {
      "name": "Коттеджный поселок \"Лесная Поляна\"",
      "lat": 43.44199,
      "lng": 39.96708,
      "distanceKm": 1.2,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/7503579918"
    },
    {
      "name": "Панорама",
      "lat": 43.44929,
      "lng": 39.97422,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/731993826"
    },
    {
      "name": "Оранжереи",
      "lat": 43.44136,
      "lng": 39.97034,
      "distanceKm": 1.5,
      "kind": "guest_house",
      "website": "https://www.oranjerei.com/",
      "osm": "https://www.openstreetmap.org/node/7164284631"
    },
    {
      "name": "Аэропорт",
      "nameEn": "Aeroport",
      "lat": 43.44709,
      "lng": 39.93333,
      "distanceKm": 1.9,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/13046828601"
    },
    {
      "name": "Отель Атрия",
      "lat": 43.44743,
      "lng": 39.93215,
      "distanceKm": 2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6494252594"
    },
    {
      "name": "Саня Таня",
      "lat": 43.43202,
      "lng": 39.96448,
      "distanceKm": 2.1,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/5201666821"
    },
    {
      "name": "Hostel House Sochi",
      "lat": 43.44713,
      "lng": 39.93095,
      "distanceKm": 2.1,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/6494244800"
    },
    {
      "name": "Papaya Park Hotel",
      "lat": 43.44333,
      "lng": 39.92197,
      "distanceKm": 2.9,
      "kind": "hotel",
      "website": "https://papayahotel.ru/",
      "phone": "+7 918 0006716",
      "osm": "https://www.openstreetmap.org/way/150742817"
    }
  ],
  ALA: [
    {
      "name": "Аксункар",
      "nameEn": "Aksunkar",
      "lat": 43.3452,
      "lng": 77.01093,
      "distanceKm": 2.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/3259287412"
    },
    {
      "name": "Экипаж",
      "lat": 43.34034,
      "lng": 77.00986,
      "distanceKm": 2.8,
      "kind": "hotel",
      "website": "https://www.equipagehotel.com",
      "phone": "+7 (727) 383 8746; +7 (727) 383 8763; +7 (702) 640 8135",
      "osm": "https://www.openstreetmap.org/node/2390651786"
    },
    {
      "name": "Фаворит",
      "lat": 43.34667,
      "lng": 77.00658,
      "distanceKm": 2.8,
      "kind": "hotel",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/node/3901010876"
    },
    {
      "name": "Гостиница Алматы-Транзит N1",
      "nameEn": "Almaty-Tranzit N1 Hotel",
      "lat": 43.3409,
      "lng": 77.00956,
      "distanceKm": 2.8,
      "kind": "hotel",
      "phone": "+77273838747;+77273838750;моб. +77783523783;моб +77019824939",
      "osm": "https://www.openstreetmap.org/node/4101233391"
    },
    {
      "name": "Шарапат",
      "lat": 43.35791,
      "lng": 76.99002,
      "distanceKm": 4.1,
      "kind": "hotel",
      "phone": "+ 7 (727) 252-80-52",
      "osm": "https://www.openstreetmap.org/node/4515728659"
    },
    {
      "name": "Эвелина",
      "lat": 43.36389,
      "lng": 76.99283,
      "distanceKm": 4.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4515757369"
    },
    {
      "name": "Экспресс",
      "nameEn": "Express",
      "lat": 43.3644,
      "lng": 76.9838,
      "distanceKm": 4.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/2373296102"
    }
  ],
  ATH: [
    {
      "name": "Sofitel Athens Airport",
      "lat": 37.93693,
      "lng": 23.94572,
      "distanceKm": 0.1,
      "kind": "hotel",
      "website": "https://sofitel.accor.com/en/hotels/3167.html",
      "phone": "+30 210 3544000",
      "stars": 5,
      "osm": "https://www.openstreetmap.org/way/174886450"
    },
    {
      "name": "AIR-IN Rooms with magnificent views",
      "lat": 37.96044,
      "lng": 23.97981,
      "distanceKm": 4.1,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/12967285501"
    },
    {
      "name": "Tina's Apartments",
      "lat": 37.96537,
      "lng": 23.97671,
      "distanceKm": 4.3,
      "kind": "hotel",
      "website": "https://www.tinasapartments.com/",
      "phone": "+30698 421 1880",
      "osm": "https://www.openstreetmap.org/node/9680688734"
    },
    {
      "name": "AIRPORT SUITES MICHELLE",
      "lat": 37.96795,
      "lng": 23.91249,
      "distanceKm": 4.5,
      "kind": "hotel",
      "website": "https://www.airportsuitesmichelle.com",
      "phone": "+306976678118",
      "osm": "https://www.openstreetmap.org/node/13536936868"
    },
    {
      "name": "Peri's Hotel",
      "lat": 37.96534,
      "lng": 23.99205,
      "distanceKm": 5.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/3582710452"
    },
    {
      "name": "MODULAR BUNGALOWS",
      "lat": 37.93259,
      "lng": 24.0061,
      "distanceKm": 5.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/8933916630"
    },
    {
      "name": "Mare Nostrum",
      "lat": 37.92993,
      "lng": 24.00715,
      "distanceKm": 5.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/334846960"
    },
    {
      "name": "Natalie Apartments",
      "lat": 37.96065,
      "lng": 24.00328,
      "distanceKm": 5.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6593048993"
    },
    {
      "name": "Εξοχική Οικία Φράγκου",
      "nameEn": "Fragou Summer House",
      "lat": 37.93293,
      "lng": 24.0107,
      "distanceKm": 5.8,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/6728265385"
    }
  ],
  AUH: [
    {
      "name": "Premier Inn Abu Dhabi Airport",
      "lat": 24.42883,
      "lng": 54.64158,
      "distanceKm": 1.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12533351545"
    },
    {
      "name": "Premier Inn Abu Dhabi Airport (Business Park) Hotel",
      "lat": 24.42934,
      "lng": 54.64126,
      "distanceKm": 1.1,
      "kind": "hotel",
      "website": "https://mena.premierinn.com/en/hotel-directory/abu-dhabi/abu-dhabi-airport-business-park-hotel/",
      "osm": "https://www.openstreetmap.org/node/12720867660"
    },
    {
      "name": "Apartments",
      "lat": 24.40018,
      "lng": 54.65221,
      "distanceKm": 3.7,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/5992905585"
    },
    {
      "name": "منزل عملي",
      "nameEn": "Manzel 3amali",
      "lat": 24.42697,
      "lng": 54.60491,
      "distanceKm": 4.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4820061321"
    },
    {
      "name": "فيلا محمود ابو ملوح",
      "nameEn": "Mahmoud fella",
      "lat": 24.42666,
      "lng": 54.60545,
      "distanceKm": 4.7,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/4838261826"
    },
    {
      "name": "المنيره",
      "nameEn": "ALMONIRA RAHA",
      "lat": 24.45181,
      "lng": 54.60633,
      "distanceKm": 5,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/7329138185"
    },
    {
      "name": "Caphy 84",
      "lat": 24.43716,
      "lng": 54.59945,
      "distanceKm": 5.2,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/4439005490"
    },
    {
      "name": "Hilton Abu Dhabi Yas Island",
      "lat": 24.45929,
      "lng": 54.60142,
      "distanceKm": 5.8,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/auhyihi-hilton-abu-dhabi-yas-island/",
      "phone": "+971 2 208 6888",
      "osm": "https://www.openstreetmap.org/way/723863424"
    }
  ],
  AYT: [
    {
      "name": "Tunç Suites",
      "lat": 36.90354,
      "lng": 30.81688,
      "distanceKm": 1.6,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/13055128947"
    },
    {
      "name": "Isnova Hotel",
      "lat": 36.91359,
      "lng": 30.77515,
      "distanceKm": 2.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12088376969"
    },
    {
      "name": "Hampton by Hilton Antalya Airport",
      "lat": 36.90854,
      "lng": 30.76751,
      "distanceKm": 3.1,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/aytaahx-hampton-antalya-airport/",
      "phone": "+90 242 966 7070",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/1245479772"
    },
    {
      "name": "IC Hotels Airport",
      "lat": 36.92762,
      "lng": 30.80987,
      "distanceKm": 3.3,
      "kind": "hotel",
      "website": "https://www.ichotels.com.tr/",
      "osm": "https://www.openstreetmap.org/way/431358896"
    },
    {
      "name": "Red Flag",
      "lat": 36.92755,
      "lng": 30.81546,
      "distanceKm": 3.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12995292063"
    },
    {
      "name": "Tema Martılı Apart",
      "lat": 36.8615,
      "lng": 30.82434,
      "distanceKm": 4.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/8960532609"
    },
    {
      "name": "Elysium Green Suites",
      "lat": 36.85987,
      "lng": 30.82084,
      "distanceKm": 4.7,
      "kind": "hotel",
      "website": "https://elysiumgreensuites.com/",
      "phone": "+90 555 962 39 51;+90 242 349 51 51",
      "osm": "https://www.openstreetmap.org/node/8958034655"
    },
    {
      "name": "Corendon Hotels & Resort",
      "lat": 36.85852,
      "lng": 30.81847,
      "distanceKm": 4.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/8960532606"
    },
    {
      "name": "Laralya apart",
      "lat": 36.86083,
      "lng": 30.82649,
      "distanceKm": 4.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/8960532613"
    },
    {
      "name": "Lara Garden Hotel",
      "lat": 36.85595,
      "lng": 30.80961,
      "distanceKm": 4.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/797844058"
    }
  ],
  BCN: [
    {
      "name": "ACAR - El Prat",
      "lat": 41.27981,
      "lng": 2.07701,
      "distanceKm": 2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12117402048"
    },
    {
      "name": "Centre Esplai",
      "lat": 41.31538,
      "lng": 2.08251,
      "distanceKm": 2,
      "kind": "hostel",
      "website": "https://www.albergueesplaibarcelona.com/",
      "phone": "+34 934 744 678",
      "osm": "https://www.openstreetmap.org/way/99696849"
    },
    {
      "name": "Barcelona Aeropuerto",
      "lat": 41.31258,
      "lng": 2.06849,
      "distanceKm": 2.1,
      "kind": "hotel",
      "website": "https://www.melia.com/es/hoteles/espana/barcelona/hotel-barcelona-aeropuerto-by-melia",
      "phone": "+34 933 78 10 00",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/313691453"
    },
    {
      "name": "BAH Barcelona Airport Hotel",
      "lat": 41.31748,
      "lng": 2.0743,
      "distanceKm": 2.4,
      "kind": "hotel",
      "website": "https://barcelonairporthotel.com/en/",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/313063486"
    },
    {
      "name": "Hostal Cal Siles",
      "lat": 41.32102,
      "lng": 2.09347,
      "distanceKm": 2.8,
      "kind": "hotel",
      "website": "https://www.hostalcalsiles.com/",
      "phone": "+34 933 79 12 87",
      "osm": "https://www.openstreetmap.org/way/1484032882"
    },
    {
      "name": "Hotel Sallés Ciutat del Prat",
      "lat": 41.32507,
      "lng": 2.08707,
      "distanceKm": 3.1,
      "kind": "hotel",
      "website": "https://www.hotelciutatdelprat.com",
      "phone": "+34 933 78 83 33",
      "osm": "https://www.openstreetmap.org/way/294500823"
    },
    {
      "name": "AirHostel Barcelona",
      "lat": 41.3246,
      "lng": 2.09392,
      "distanceKm": 3.2,
      "kind": "hotel",
      "website": "https://airhostel.com/",
      "phone": "+34 938 33 68 37",
      "osm": "https://www.openstreetmap.org/way/1480434607"
    },
    {
      "name": "Mucha Masia Hostel Rural-Urbà",
      "lat": 41.32839,
      "lng": 2.09281,
      "distanceKm": 3.5,
      "kind": "hotel",
      "website": "https://muchamasia.com/es/",
      "phone": "+34 936 81 41 89",
      "osm": "https://www.openstreetmap.org/way/295093280"
    },
    {
      "name": "Pensió Rosita",
      "lat": 41.32842,
      "lng": 2.09612,
      "distanceKm": 3.6,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/way/1501218556"
    },
    {
      "name": "Barcelona PR Guesthouse",
      "lat": 41.3282,
      "lng": 2.09626,
      "distanceKm": 3.6,
      "kind": "guest_house",
      "website": "https://welotel.com/hoteles/barcelona-pr-guesthouse-69740fefd89a1",
      "phone": "+34 629 88 74 28",
      "osm": "https://www.openstreetmap.org/way/1501218577"
    }
  ],
  BEG: [
    {
      "name": "West Hostel BG",
      "lat": 44.8333,
      "lng": 20.32392,
      "distanceKm": 2,
      "kind": "hostel",
      "phone": "+381 62 1174771",
      "osm": "https://www.openstreetmap.org/node/10173037098"
    },
    {
      "name": "Airport View Apartments",
      "lat": 44.80232,
      "lng": 20.32112,
      "distanceKm": 2,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/way/679616182"
    },
    {
      "name": "Air Star Hotel",
      "lat": 44.80392,
      "lng": 20.32515,
      "distanceKm": 2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/917875489"
    },
    {
      "name": "Air Mi",
      "lat": 44.79827,
      "lng": 20.31683,
      "distanceKm": 2.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/9672713562"
    },
    {
      "name": "Airport Garni Hotel",
      "lat": 44.79695,
      "lng": 20.31324,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/473652590"
    },
    {
      "name": "China Town",
      "lat": 44.79777,
      "lng": 20.31627,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/545918181"
    },
    {
      "name": "Airport Rest Apartments",
      "lat": 44.80325,
      "lng": 20.33195,
      "distanceKm": 2.5,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/7475902619"
    },
    {
      "name": "Libero Apartmani",
      "lat": 44.7953,
      "lng": 20.29899,
      "distanceKm": 2.7,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/10899128928"
    },
    {
      "name": "Конак Јовање",
      "nameEn": "Konak Jovanje",
      "lat": 44.80038,
      "lng": 20.33371,
      "distanceKm": 2.8,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/14029734397"
    },
    {
      "name": "Hotel Hollywoodland",
      "lat": 44.80129,
      "lng": 20.34307,
      "distanceKm": 3.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/788268138"
    }
  ],
  BER: [
    {
      "name": "Albergo Hotel Berlin",
      "lat": 52.38822,
      "lng": 13.50691,
      "distanceKm": 2.4,
      "kind": "hotel",
      "website": "https://www.albergo.de/",
      "osm": "https://www.openstreetmap.org/node/428229961"
    },
    {
      "name": "Holiday Inn Berlin Airport – Conference Centre",
      "lat": 52.38898,
      "lng": 13.49857,
      "distanceKm": 2.5,
      "kind": "hotel",
      "website": "https://www.holidayinn-berlin.de/",
      "phone": "+49 30 634010",
      "osm": "https://www.openstreetmap.org/node/262394173"
    },
    {
      "name": "B&B Hotel Berlin-Airport",
      "lat": 52.37451,
      "lng": 13.54169,
      "distanceKm": 2.7,
      "kind": "hotel",
      "website": "https://www.hotel-bb.com/de/hotel/berlin-airport",
      "phone": "+49 6146 8153542",
      "osm": "https://www.openstreetmap.org/way/314465934"
    },
    {
      "name": "Campanile",
      "lat": 52.39275,
      "lng": 13.5012,
      "distanceKm": 2.9,
      "kind": "hotel",
      "website": "https://berlin-brandenburg-airport.campanile.com/de-de/",
      "osm": "https://www.openstreetmap.org/node/6710315453"
    },
    {
      "name": "Motelplus",
      "lat": 52.39312,
      "lng": 13.50173,
      "distanceKm": 2.9,
      "kind": "motel",
      "osm": "https://www.openstreetmap.org/node/6968481310"
    },
    {
      "name": "Moxy Berlin Airport",
      "lat": 52.37548,
      "lng": 13.54365,
      "distanceKm": 2.9,
      "kind": "hotel",
      "website": "https://www.marriott.de/hotels/travel/beroa-moxy-berlin-airport/",
      "phone": "+49 30 31198987",
      "osm": "https://www.openstreetmap.org/way/1042973533"
    },
    {
      "name": "IntercityHotel Berlin Airport Area North",
      "lat": 52.39222,
      "lng": 13.51831,
      "distanceKm": 3,
      "kind": "hotel",
      "website": "https://hrewards.com/es/intercityhotel-berlin-airport-area-north",
      "phone": "+49 30 75657510",
      "osm": "https://www.openstreetmap.org/way/37042105"
    },
    {
      "name": "Motel Airport Schönefeld",
      "lat": 52.36321,
      "lng": 13.55635,
      "distanceKm": 3.6,
      "kind": "motel",
      "phone": "+493076728787",
      "osm": "https://www.openstreetmap.org/way/36898753"
    },
    {
      "name": "Pension Zur Hecke",
      "lat": 52.36539,
      "lng": 13.55724,
      "distanceKm": 3.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/429113202"
    },
    {
      "name": "Hotel Garni El-Condor",
      "lat": 52.39697,
      "lng": 13.53117,
      "distanceKm": 3.9,
      "kind": "hotel",
      "website": "https://www.hotel-berlin-schoenefeld.net/",
      "phone": "+49 30 634880",
      "osm": "https://www.openstreetmap.org/way/772452798"
    }
  ],
  BKK: [
    {
      "name": "YHA Bangkok Airport",
      "lat": 13.69809,
      "lng": 100.73479,
      "distanceKm": 1.9,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/6043933474"
    },
    {
      "name": "Siam Mandarina Hotel",
      "lat": 13.68991,
      "lng": 100.72945,
      "distanceKm": 2.2,
      "kind": "hotel",
      "website": "https://www.siammandarinahotel.com/",
      "phone": "+6627388191",
      "osm": "https://www.openstreetmap.org/way/856420191"
    },
    {
      "name": "Thongtha Residence",
      "lat": 13.70397,
      "lng": 100.73457,
      "distanceKm": 2.3,
      "kind": "hotel",
      "website": "https://www.thongtharesidence.com/",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/4145222790"
    },
    {
      "name": "A-Place Suvarnabhumi",
      "lat": 13.69454,
      "lng": 100.7272,
      "distanceKm": 2.5,
      "kind": "hotel",
      "phone": "+66 2 424 224",
      "osm": "https://www.openstreetmap.org/node/5521782731"
    },
    {
      "name": "OYO Plai and Herbs Suvarnabhumi",
      "lat": 13.70936,
      "lng": 100.73463,
      "distanceKm": 2.7,
      "kind": "guest_house",
      "website": "https://www.plaigarden.com/",
      "phone": "+66 2 181 2255",
      "osm": "https://www.openstreetmap.org/node/4627631573"
    },
    {
      "name": "Dwella Suvarnabhumi Hotel",
      "lat": 13.71155,
      "lng": 100.73484,
      "distanceKm": 2.9,
      "kind": "hotel",
      "website": "https://www.dwellaresort.com/",
      "phone": "+66 2 181 2551",
      "osm": "https://www.openstreetmap.org/node/4215255390"
    },
    {
      "name": "วิสมายาสุวรรณภูมิ",
      "nameEn": "Vismaya Suvarnabhumi",
      "lat": 13.70999,
      "lng": 100.7322,
      "distanceKm": 2.9,
      "kind": "hotel",
      "website": "http://thevismaya.com/",
      "phone": "+66 2 738 4988",
      "osm": "https://www.openstreetmap.org/node/5521607458"
    },
    {
      "name": "OK Mansion",
      "lat": 13.71448,
      "lng": 100.74042,
      "distanceKm": 2.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/321780928"
    },
    {
      "name": "PA Mansion (2)",
      "lat": 13.71379,
      "lng": 100.74026,
      "distanceKm": 2.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/321780937"
    },
    {
      "name": "PA Mansion (1)",
      "lat": 13.71428,
      "lng": 100.7403,
      "distanceKm": 2.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/321781545"
    }
  ],
  BOM: [
    {
      "name": "Taj Santacruz Mumbai",
      "lat": 19.09269,
      "lng": 72.85438,
      "distanceKm": 1.2,
      "kind": "hotel",
      "website": "https://taj.tajhotels.com/en-in/taj-santacruz-mumbai/",
      "phone": "0091 2262115211",
      "stars": 5,
      "osm": "https://www.openstreetmap.org/way/457922231"
    },
    {
      "name": "Kamat Plaza",
      "lat": 19.09634,
      "lng": 72.8545,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/1375251414"
    },
    {
      "name": "Sahara Star",
      "lat": 19.09563,
      "lng": 72.85399,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/40772065"
    },
    {
      "name": "Hotel Transit",
      "lat": 19.09738,
      "lng": 72.85489,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/192537219"
    },
    {
      "name": "T24 Retro",
      "lat": 19.09717,
      "lng": 72.85427,
      "distanceKm": 1.5,
      "kind": "hotel",
      "website": "https://t24retro.in",
      "osm": "https://www.openstreetmap.org/node/12249980901"
    },
    {
      "name": "Bawa International",
      "lat": 19.09654,
      "lng": 72.85377,
      "distanceKm": 1.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/192537217"
    },
    {
      "name": "Ibis",
      "lat": 19.0967,
      "lng": 72.85349,
      "distanceKm": 1.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/192537218"
    },
    {
      "name": "Hindi, Gujarati, English",
      "nameEn": "Hotel Aircraft International",
      "lat": 19.09577,
      "lng": 72.8519,
      "distanceKm": 1.6,
      "kind": "hotel",
      "website": "http://www.hotelaircraft.in",
      "phone": "+912226187717",
      "osm": "https://www.openstreetmap.org/node/4512547390"
    },
    {
      "name": "Aurika By Lemon Tree Hotels, Mumbai",
      "lat": 19.10334,
      "lng": 72.86309,
      "distanceKm": 1.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1338609056"
    },
    {
      "name": "Aurika Hotel by Lemon Tree",
      "lat": 19.10339,
      "lng": 72.86301,
      "distanceKm": 1.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1411408611"
    }
  ],
  BUD: [
    {
      "name": "ibis Styles - Budapest Airport Hotel",
      "lat": 47.43024,
      "lng": 19.26238,
      "distanceKm": 0.1,
      "kind": "hotel",
      "website": "https://all.accor.com/hotel/B0I7/index.en.shtml",
      "phone": "+36 1 296 0060",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/way/492211317"
    },
    {
      "name": "TRIBE Budapest Airport Hotel",
      "lat": 47.43068,
      "lng": 19.26263,
      "distanceKm": 0.2,
      "kind": "hotel",
      "website": "https://all.accor.com/hotel/B925/index.en.shtml",
      "phone": "+36 1 296 0070",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/1393881523"
    },
    {
      "name": "Airport17 B&B",
      "lat": 47.41613,
      "lng": 19.25546,
      "distanceKm": 1.6,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/11772005739"
    },
    {
      "name": "Night & Flight Airport Apartman",
      "lat": 47.41362,
      "lng": 19.25617,
      "distanceKm": 1.8,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/11772005738"
    },
    {
      "name": "Sarokház Panzió",
      "lat": 47.42141,
      "lng": 19.23885,
      "distanceKm": 1.9,
      "kind": "hotel",
      "website": "https://www.sarokhazpanzio.hu/",
      "phone": "+36 29 355 255",
      "osm": "https://www.openstreetmap.org/way/449169719"
    },
    {
      "name": "Tenisz Apartment",
      "lat": 47.42181,
      "lng": 19.23803,
      "distanceKm": 1.9,
      "kind": "guest_house",
      "phone": "+36 20 3147553",
      "osm": "https://www.openstreetmap.org/way/449169721"
    },
    {
      "name": "Airport Jazmin Guesthouse",
      "lat": 47.41144,
      "lng": 19.26583,
      "distanceKm": 2.1,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/11771992965"
    },
    {
      "name": "Hotel Ferihegy",
      "lat": 47.42314,
      "lng": 19.23359,
      "distanceKm": 2.2,
      "kind": "hotel",
      "website": "https://www.hotelferihegy.hu/",
      "phone": "+36 1 765 4004",
      "osm": "https://www.openstreetmap.org/node/703392672"
    },
    {
      "name": "Airport Hotel Budapest",
      "lat": 47.41413,
      "lng": 19.24434,
      "distanceKm": 2.2,
      "kind": "hotel",
      "website": "https://www.airporthotel.hu",
      "phone": "+36 1 688 2000",
      "osm": "https://www.openstreetmap.org/node/1593535627"
    },
    {
      "name": "Airport Glossel Panzio",
      "lat": 47.40991,
      "lng": 19.27144,
      "distanceKm": 2.3,
      "kind": "guest_house",
      "phone": "+36 29 355 555",
      "osm": "https://www.openstreetmap.org/node/4252446694"
    }
  ],
  BUS: [
    {
      "name": "Black Sea hotel",
      "lat": 41.61611,
      "lng": 41.60309,
      "distanceKm": 0.7,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/5855590285"
    },
    {
      "name": "Mango",
      "lat": 41.61689,
      "lng": 41.59961,
      "distanceKm": 0.7,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/12244943133"
    },
    {
      "name": "Family house",
      "lat": 41.61951,
      "lng": 41.60414,
      "distanceKm": 1.1,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/4971206121"
    },
    {
      "name": "Hotel Wave",
      "lat": 41.61773,
      "lng": 41.61013,
      "distanceKm": 1.2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1148683860"
    },
    {
      "name": "Wyn Residence",
      "lat": 41.62088,
      "lng": 41.59209,
      "distanceKm": 1.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/11167068398"
    },
    {
      "name": "Rainbow",
      "lat": 41.6206,
      "lng": 41.59192,
      "distanceKm": 1.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12760264322"
    },
    {
      "name": "Гостевой дом Джемаль",
      "nameEn": "GuestHouse Jemal",
      "lat": 41.62273,
      "lng": 41.6011,
      "distanceKm": 1.4,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/6550935386"
    },
    {
      "name": "კოლუმბია",
      "nameEn": "Columbia",
      "lat": 41.62211,
      "lng": 41.59335,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/10246959195"
    },
    {
      "name": "პალმ",
      "nameEn": "Batumi Palm Hotel",
      "lat": 41.62193,
      "lng": 41.59191,
      "distanceKm": 1.4,
      "kind": "hotel",
      "website": "https://sites.google.com/view/batumi-palm-hotel/",
      "osm": "https://www.openstreetmap.org/node/10246959198"
    },
    {
      "name": "Sunrise",
      "lat": 41.62101,
      "lng": 41.5917,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/11167068399"
    }
  ],
  CAI: [
    {
      "name": "نوفوتيل",
      "nameEn": "Novotel",
      "lat": 30.12135,
      "lng": 31.40214,
      "distanceKm": 0.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/961972426"
    },
    {
      "name": "نوفوتيل مطار القاهرة",
      "nameEn": "Novotel Cairo Airport",
      "lat": 30.12093,
      "lng": 31.40189,
      "distanceKm": 0.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/34206985"
    },
    {
      "name": "Le Passage",
      "lat": 30.12152,
      "lng": 31.40055,
      "distanceKm": 0.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/53659494"
    },
    {
      "name": "Le Méridien Cairo Airport",
      "lat": 30.11372,
      "lng": 31.39535,
      "distanceKm": 1.3,
      "kind": "hotel",
      "website": "https://www.marriott.com/en-us/hotels/caiam-le-meridien-cairo-airport/overview/",
      "phone": "+20222659600",
      "stars": 5,
      "osm": "https://www.openstreetmap.org/node/3887776725"
    },
    {
      "name": "Radisson",
      "lat": 30.10948,
      "lng": 31.3822,
      "distanceKm": 2.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/13177658003"
    },
    {
      "name": "عمارة البيت",
      "lat": 30.10714,
      "lng": 31.38245,
      "distanceKm": 2.8,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/6575135854"
    },
    {
      "name": "ذا غابرييل هوتيل",
      "nameEn": "The Gabriel Hotel",
      "lat": 30.10319,
      "lng": 31.38634,
      "distanceKm": 2.8,
      "kind": "hotel",
      "website": "https://gabrielhotelcairo.website/",
      "osm": "https://www.openstreetmap.org/node/9612949911"
    },
    {
      "name": "عامر جروب",
      "nameEn": "Amer Group",
      "lat": 30.10354,
      "lng": 31.37879,
      "distanceKm": 3.3,
      "kind": "apartment",
      "phone": "01273860900",
      "osm": "https://www.openstreetmap.org/node/6581391597"
    },
    {
      "name": "عامر جروب",
      "nameEn": "Amer Group",
      "lat": 30.10378,
      "lng": 31.37846,
      "distanceKm": 3.3,
      "kind": "apartment",
      "phone": "01273860900",
      "osm": "https://www.openstreetmap.org/node/7494320085"
    },
    {
      "name": "Radisson Blu Hotel",
      "lat": 30.10639,
      "lng": 31.37522,
      "distanceKm": 3.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/53658188"
    }
  ],
  CDG: [
    {
      "name": "Holiday Inn Express Paris - CDG Airport",
      "lat": 49.00882,
      "lng": 2.54764,
      "distanceKm": 0.1,
      "kind": "hotel",
      "website": "https://www.ihg.com/holidayinnexpress/hotels/us/en/roissy-en-france/pardg/hoteldetail",
      "phone": "+33 1 80 43 03 43",
      "osm": "https://www.openstreetmap.org/way/578778300"
    },
    {
      "name": "Mercure Paris Charles de Gaulle Airport & Convention",
      "lat": 49.0076,
      "lng": 2.54871,
      "distanceKm": 0.2,
      "kind": "hotel",
      "website": "http://www.mercure.com/fr/hotel-0577-hotel-mercure-paris-cdg-airport-convention/index.shtml",
      "phone": "+33 1 49 19 29 29",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/104936609"
    },
    {
      "name": "Moxy Paris Charles de Gaulle Airport",
      "lat": 49.00761,
      "lng": 2.54734,
      "distanceKm": 0.2,
      "kind": "hotel",
      "website": "https://www.marriott.com/PAROX",
      "phone": "+33 1 82 88 79 19",
      "osm": "https://www.openstreetmap.org/way/1043797984"
    },
    {
      "name": "Residence Inn",
      "lat": 49.00838,
      "lng": 2.54886,
      "distanceKm": 0.2,
      "kind": "hotel",
      "website": "https://www.marriott.com/parri",
      "phone": "+33174371570",
      "osm": "https://www.openstreetmap.org/way/1080515057"
    },
    {
      "name": "Courtyard",
      "lat": 49.00826,
      "lng": 2.54938,
      "distanceKm": 0.2,
      "kind": "hotel",
      "website": "https://www.marriott.com/parca",
      "phone": "+33174372070",
      "osm": "https://www.openstreetmap.org/way/1080515058"
    },
    {
      "name": "citizenM hotel Paris Charles de Gaulle Airport",
      "lat": 49.00948,
      "lng": 2.55633,
      "distanceKm": 0.6,
      "kind": "hotel",
      "website": "https://www.citizenm.com/destinations/paris/paris-charles-de-gaulle-hotel",
      "osm": "https://www.openstreetmap.org/way/510716283"
    },
    {
      "name": "Hilton Paris Charles de Gaulle Airport",
      "lat": 49.01044,
      "lng": 2.55792,
      "distanceKm": 0.7,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/cdghitw-hilton-paris-charles-de-gaulle-airport/?SEO_id=OTHR-EMEA-TW-CDGHITW",
      "phone": "+33 1 49 19 77 77",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/31884151"
    },
    {
      "name": "Ibis",
      "lat": 49.01071,
      "lng": 2.56053,
      "distanceKm": 0.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/31884123"
    },
    {
      "name": "Ibis",
      "lat": 49.01023,
      "lng": 2.56064,
      "distanceKm": 0.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/31884127"
    },
    {
      "name": "Novotel Paris Charles-de-Gaulle Airport",
      "lat": 49.00922,
      "lng": 2.56078,
      "distanceKm": 0.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/140912880"
    }
  ],
  CGK: [
    {
      "name": "D'prima Hotel",
      "lat": -6.12913,
      "lng": 106.65781,
      "distanceKm": 0.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6894284985"
    },
    {
      "name": "Jakarta Airport Hotel",
      "lat": -6.12254,
      "lng": 106.65263,
      "distanceKm": 0.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/494903786"
    },
    {
      "name": "Anara Hotel",
      "lat": -6.11969,
      "lng": 106.6624,
      "distanceKm": 1,
      "kind": "hotel",
      "website": "https://www.anara.id",
      "phone": "+62 21 39508599",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/747480169"
    },
    {
      "name": "Digital Airport Hotel",
      "lat": -6.11799,
      "lng": 106.6676,
      "distanceKm": 1.5,
      "kind": "hotel",
      "website": "https://digitalairporthotel.com/",
      "phone": "+62 811 9000 619",
      "osm": "https://www.openstreetmap.org/node/10804650512"
    },
    {
      "name": "Anara Hotel",
      "lat": -6.11703,
      "lng": 106.6692,
      "distanceKm": 1.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/924734336"
    },
    {
      "name": "Kost Bandara Soekarno Hatta",
      "lat": -6.12918,
      "lng": 106.62983,
      "distanceKm": 2.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/8404604210"
    },
    {
      "name": "POP! Hotel",
      "lat": -6.11638,
      "lng": 106.68199,
      "distanceKm": 3.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/477980568"
    },
    {
      "name": "Ibis Budget",
      "lat": -6.11635,
      "lng": 106.68281,
      "distanceKm": 3.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1152959829"
    },
    {
      "name": "Fairfield Marriott",
      "lat": -6.11541,
      "lng": 106.68409,
      "distanceKm": 3.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/477980501"
    },
    {
      "name": "Bale Ocasa",
      "lat": -6.1408,
      "lng": 106.63079,
      "distanceKm": 3.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/501187991"
    }
  ],
  CMB: [
    {
      "name": "Airport City Hotel",
      "lat": 7.1675,
      "lng": 79.88282,
      "distanceKm": 1.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12581936057"
    },
    {
      "name": "Hotel Good Wood Plaza",
      "lat": 7.16608,
      "lng": 79.88161,
      "distanceKm": 1.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/1268329290"
    },
    {
      "name": "Eden Bliss Retreat",
      "lat": 7.17074,
      "lng": 79.87124,
      "distanceKm": 1.8,
      "kind": "hotel",
      "website": "https://www.edenblissretreat.com",
      "phone": "+94740574077",
      "osm": "https://www.openstreetmap.org/node/13255503847"
    },
    {
      "name": "VILLA VISH",
      "lat": 7.17931,
      "lng": 79.9008,
      "distanceKm": 1.8,
      "kind": "guest_house",
      "website": "https://www.facebook.com/share/1ELcDkkv7d/",
      "osm": "https://www.openstreetmap.org/node/13728979294"
    },
    {
      "name": "Concey Transit Hotel Airport view",
      "lat": 7.17003,
      "lng": 79.87108,
      "distanceKm": 1.9,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/11016544505"
    },
    {
      "name": "SLNCO Villa Airport Transit Hotel",
      "lat": 7.16914,
      "lng": 79.86971,
      "distanceKm": 2,
      "kind": "guest_house",
      "website": "http://slncovilla.com",
      "phone": "+94 71 684 9205",
      "osm": "https://www.openstreetmap.org/way/390009077"
    },
    {
      "name": "Palms Villa Negombo",
      "lat": 7.1949,
      "lng": 79.87108,
      "distanceKm": 2.1,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/4041436300"
    },
    {
      "name": "Antonio Transit Katunayake",
      "lat": 7.1651,
      "lng": 79.86985,
      "distanceKm": 2.3,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/13503872143"
    },
    {
      "name": "Hostel First",
      "lat": 7.17056,
      "lng": 79.86529,
      "distanceKm": 2.4,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/3399861823"
    },
    {
      "name": "Chen villa",
      "lat": 7.18466,
      "lng": 79.86292,
      "distanceKm": 2.4,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/11473327933"
    }
  ],
  DAD: [
    {
      "name": "Khách sạn Bốn Mùa",
      "nameEn": "4Seasons Hotel",
      "lat": 16.04289,
      "lng": 108.21009,
      "distanceKm": 1.1,
      "kind": "hotel",
      "phone": "02363799777",
      "osm": "https://www.openstreetmap.org/node/5450558021"
    },
    {
      "name": "Nhà Khách Quân Chủng Phòng Không- Không Quân",
      "nameEn": "Air Defense - Air Force Guest House",
      "lat": 16.05161,
      "lng": 108.20592,
      "distanceKm": 1.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12920427943"
    },
    {
      "name": "Hoàng Phương Hotel",
      "lat": 16.04091,
      "lng": 108.21077,
      "distanceKm": 1.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4249901095"
    },
    {
      "name": "Homestay Halley",
      "lat": 16.04336,
      "lng": 108.21201,
      "distanceKm": 1.3,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/5426555721"
    },
    {
      "name": "Homestay Heo Đất",
      "lat": 16.04343,
      "lng": 108.2121,
      "distanceKm": 1.4,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/4677455200"
    },
    {
      "name": "Landing house",
      "lat": 16.0542,
      "lng": 108.20631,
      "distanceKm": 1.4,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/5947478386"
    },
    {
      "name": "quan quan hotel",
      "lat": 16.0537,
      "lng": 108.20962,
      "distanceKm": 1.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4707610291"
    },
    {
      "name": "chung cư số 4 nguyễn tri phương",
      "lat": 16.03745,
      "lng": 108.21192,
      "distanceKm": 1.5,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/5307682921"
    },
    {
      "name": "King Garden Hotel",
      "lat": 16.05144,
      "lng": 108.21144,
      "distanceKm": 1.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5413973628"
    },
    {
      "name": "Red Palace Hotel",
      "lat": 16.05167,
      "lng": 108.21193,
      "distanceKm": 1.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5413973113"
    }
  ],
  DEL: [
    {
      "name": "Round D Clock",
      "lat": 28.54829,
      "lng": 77.10476,
      "distanceKm": 1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1498980224"
    },
    {
      "name": "Lemon Tree Premier, Delhi Airport",
      "lat": 28.55161,
      "lng": 77.1208,
      "distanceKm": 2.1,
      "kind": "hotel",
      "website": "https://www.lemontreehotels.com/",
      "phone": "+91 11 6676 3950, +91 11 4423 2323",
      "osm": "https://www.openstreetmap.org/node/7389622179"
    },
    {
      "name": "Novotel - Pullman",
      "lat": 28.55387,
      "lng": 77.12369,
      "distanceKm": 2.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/313541232"
    },
    {
      "name": "Pride Plaza",
      "lat": 28.55251,
      "lng": 77.12295,
      "distanceKm": 2.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/313541233"
    },
    {
      "name": "ibis New Delhi Aerocity",
      "lat": 28.55141,
      "lng": 77.12328,
      "distanceKm": 2.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/313544660"
    },
    {
      "name": "Holiday Inn New Delhi Int'l Airport",
      "lat": 28.55022,
      "lng": 77.12282,
      "distanceKm": 2.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/505667468"
    },
    {
      "name": "Radisson Blu Plaza Hotel,Delhi Airport",
      "lat": 28.54315,
      "lng": 77.11953,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/438040050"
    },
    {
      "name": "Vishal Residency Hotel",
      "lat": 28.54268,
      "lng": 77.11903,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/821201866"
    },
    {
      "name": "Airport Hotel",
      "lat": 28.56534,
      "lng": 77.12282,
      "distanceKm": 2.4,
      "kind": "hotel",
      "website": "https://airporthoteldelhi.com/",
      "osm": "https://www.openstreetmap.org/way/350514023"
    },
    {
      "name": "Hotel Delhi Aerocity (Purple Orchid)",
      "lat": 28.53973,
      "lng": 77.11736,
      "distanceKm": 2.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6901871085"
    }
  ],
  DME: [
    {
      "name": "Аэротель",
      "lat": 55.41501,
      "lng": 37.90205,
      "distanceKm": 0.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5513755755"
    },
    {
      "name": "Аэротель",
      "nameEn": "Aerotel",
      "lat": 55.42031,
      "lng": 37.89589,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/778358017"
    },
    {
      "name": "Планерная",
      "lat": 55.4101,
      "lng": 37.85041,
      "distanceKm": 3.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4737495723"
    },
    {
      "name": "Отель Авиации",
      "lat": 55.41225,
      "lng": 37.84093,
      "distanceKm": 4.1,
      "kind": "hotel",
      "website": "https://www.aviationhotel.ru",
      "osm": "https://www.openstreetmap.org/node/5370569298"
    },
    {
      "name": "9вять Домодедово",
      "lat": 55.41196,
      "lng": 37.84169,
      "distanceKm": 4.1,
      "kind": "hostel",
      "website": "https://9hostel.ru/",
      "osm": "https://www.openstreetmap.org/node/13096854401"
    },
    {
      "name": "S7 Hotel Домодедово",
      "nameEn": "S7 Hotel Domodedovo",
      "lat": 55.41869,
      "lng": 37.84213,
      "distanceKm": 4.2,
      "kind": "hotel",
      "website": "https://domodedovo.s7hotel.ru/",
      "phone": "+7 495 6510667",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/211734556"
    },
    {
      "name": "Отель Александрия-Домодедово",
      "lat": 55.45279,
      "lng": 37.9073,
      "distanceKm": 4.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/11961322957"
    },
    {
      "name": "Fat Cat Boutique",
      "lat": 55.45287,
      "lng": 37.90854,
      "distanceKm": 4.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/11961322958"
    },
    {
      "name": "Татьяна",
      "lat": 55.41851,
      "lng": 37.83107,
      "distanceKm": 4.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/77436594"
    },
    {
      "name": "Цветы",
      "lat": 55.40669,
      "lng": 37.82793,
      "distanceKm": 5,
      "kind": "hotel",
      "website": "http://www.hotel-cvety.ru/sample-page/",
      "phone": "+7 985 4556224",
      "osm": "https://www.openstreetmap.org/way/174045578"
    }
  ],
  DMK: [
    {
      "name": "Sloth Hos",
      "nameEn": "Sloth Hostel",
      "lat": 13.91683,
      "lng": 100.59763,
      "distanceKm": 1.1,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/5510104323"
    },
    {
      "name": "Amari Don Muang Airport Hotel",
      "lat": 13.92092,
      "lng": 100.60015,
      "distanceKm": 1.2,
      "kind": "hotel",
      "website": "https://www.amari.com/donmuang/",
      "phone": "+66 2 5661020",
      "osm": "https://www.openstreetmap.org/way/194876474"
    },
    {
      "name": "The Alex",
      "lat": 13.92318,
      "lng": 100.60151,
      "distanceKm": 1.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12580297601"
    },
    {
      "name": "BS Hostel",
      "lat": 13.91606,
      "lng": 100.59536,
      "distanceKm": 1.3,
      "kind": "hostel",
      "phone": "+66 92 759 2936;+66 83 492 2900",
      "osm": "https://www.openstreetmap.org/node/13361400701"
    },
    {
      "name": "Dragon XIV Hostel",
      "lat": 13.92318,
      "lng": 100.60152,
      "distanceKm": 1.3,
      "kind": "hostel",
      "website": "https://dragon-xiv-hostel.business.site/",
      "phone": "0925163956",
      "osm": "https://www.openstreetmap.org/way/534816202"
    },
    {
      "name": "D.DonMuang Hostel",
      "lat": 13.92342,
      "lng": 100.60087,
      "distanceKm": 1.4,
      "kind": "hostel",
      "phone": "+66 2 929 8915",
      "osm": "https://www.openstreetmap.org/node/5185762861"
    },
    {
      "name": "Add Home Hostel",
      "lat": 13.92368,
      "lng": 100.6013,
      "distanceKm": 1.4,
      "kind": "hostel",
      "phone": "+66 2 929 9607",
      "osm": "https://www.openstreetmap.org/node/5185990331"
    },
    {
      "name": "Phoom House",
      "lat": 13.92358,
      "lng": 100.59875,
      "distanceKm": 1.5,
      "kind": "hotel",
      "phone": "+6625663216",
      "osm": "https://www.openstreetmap.org/node/4224966391"
    },
    {
      "name": "The Prima Residence",
      "lat": 13.91266,
      "lng": 100.59284,
      "distanceKm": 1.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/636822415"
    },
    {
      "name": "The Prima Residence",
      "lat": 13.91292,
      "lng": 100.59284,
      "distanceKm": 1.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/636822416"
    }
  ],
  DPS: [
    {
      "name": "Bakung Beach Hotel",
      "lat": -8.74287,
      "lng": 115.16976,
      "distanceKm": 0.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4248007431"
    },
    {
      "name": "Novotel Bali Ngurah Rai Airport",
      "lat": -8.74366,
      "lng": 115.1652,
      "distanceKm": 0.6,
      "kind": "hotel",
      "website": "https://all.accor.com/hotel/9105/index.en.shtml",
      "osm": "https://www.openstreetmap.org/node/5655312739"
    },
    {
      "name": "Praba Guesthouse",
      "lat": -8.74263,
      "lng": 115.16891,
      "distanceKm": 0.6,
      "kind": "guest_house",
      "phone": "+6281338307713",
      "osm": "https://www.openstreetmap.org/node/10092473017"
    },
    {
      "name": "Praba Guest House",
      "lat": -8.74259,
      "lng": 115.16925,
      "distanceKm": 0.7,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/7012999307"
    },
    {
      "name": "Hilton Garden Inn Bali Ngurah Rai Airport",
      "lat": -8.74318,
      "lng": 115.17088,
      "distanceKm": 0.7,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/dpsjagi-hilton-garden-inn-bali-ngurah-rai-airport/",
      "phone": "+62-361-897 6100",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/568824564"
    },
    {
      "name": "Anika Melati Hotel And Spa",
      "lat": -8.74369,
      "lng": 115.17231,
      "distanceKm": 0.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/568824646"
    },
    {
      "name": "Dinko Bali Homestay",
      "lat": -8.74263,
      "lng": 115.17266,
      "distanceKm": 0.8,
      "kind": "hotel",
      "phone": "+62 36-1752061",
      "osm": "https://www.openstreetmap.org/node/4180109040"
    },
    {
      "name": "Kuta Indonésie",
      "lat": -8.74073,
      "lng": 115.16892,
      "distanceKm": 0.8,
      "kind": "guest_house",
      "phone": "+6281338307713",
      "osm": "https://www.openstreetmap.org/node/10092472917"
    },
    {
      "name": "BaliRa Airport Hotel",
      "lat": -8.74156,
      "lng": 115.1692,
      "distanceKm": 0.8,
      "kind": "hotel",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/14057156060"
    },
    {
      "name": "TeQuiero Hotel",
      "lat": -8.74076,
      "lng": 115.16839,
      "distanceKm": 0.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/567725191"
    }
  ],
  DXB: [
    {
      "name": "Dubai International Hotel",
      "lat": 25.24777,
      "lng": 55.36236,
      "distanceKm": 0.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5831038917"
    },
    {
      "name": "Premier Inn Dubai International Airport",
      "nameEn": "Hotel Premier Inn Dubai International Airport",
      "lat": 25.24272,
      "lng": 55.35899,
      "distanceKm": 1.3,
      "kind": "hotel",
      "website": "https://global.premierinn.com/gcc/hotels/dubai-international-airport.action",
      "phone": "+971 (0) 4 885 0999",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/1569377659"
    },
    {
      "name": "Holiday Inn Express Dubai Airport",
      "lat": 25.24249,
      "lng": 55.35956,
      "distanceKm": 1.3,
      "kind": "hotel",
      "phone": "+9714 290 0111",
      "stars": 2,
      "osm": "https://www.openstreetmap.org/node/1569380504"
    },
    {
      "name": "ketal chicken",
      "lat": 25.26737,
      "lng": 55.37661,
      "distanceKm": 1.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4919618522"
    },
    {
      "name": "The Domme Hostel",
      "lat": 25.24153,
      "lng": 55.35168,
      "distanceKm": 1.9,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/5169045221"
    },
    {
      "name": "Le Méridien Le Royal Club",
      "lat": 25.24727,
      "lng": 55.34786,
      "distanceKm": 1.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/13914423101"
    },
    {
      "name": "Le Méridien",
      "nameEn": "Le Meridien",
      "lat": 25.24857,
      "lng": 55.34748,
      "distanceKm": 1.9,
      "kind": "hotel",
      "website": "http://www.lemeridien-dubai.com/",
      "osm": "https://www.openstreetmap.org/way/302700248"
    },
    {
      "name": "Al Qusais 2 Building",
      "lat": 25.26922,
      "lng": 55.37685,
      "distanceKm": 2.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4747481930"
    },
    {
      "name": "Kozhikode Restaurant",
      "lat": 25.26743,
      "lng": 55.37984,
      "distanceKm": 2.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5588589727"
    },
    {
      "name": "Mövenpick Grand Al Bustan Dubai",
      "lat": 25.24775,
      "lng": 55.34533,
      "distanceKm": 2.1,
      "kind": "hotel",
      "website": "https://all.accor.com/hotel/B759/index.en.shtml",
      "stars": 5,
      "osm": "https://www.openstreetmap.org/node/8252427147"
    }
  ],
  DYG: [
    {
      "name": "Heaven's Gate Home Stay",
      "lat": 29.10298,
      "lng": 110.46186,
      "distanceKm": 1.8,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/13658614115"
    },
    {
      "name": "张家界根据地青年旅舍",
      "nameEn": "Zhangjiajie Base International Youth Hostel",
      "lat": 29.10963,
      "lng": 110.46845,
      "distanceKm": 2.6,
      "kind": "hostel",
      "phone": "+86 744 216 6868",
      "osm": "https://www.openstreetmap.org/node/3525971400"
    },
    {
      "name": "楚家台叄拾壹号民宿",
      "nameEn": "Zhangjiajie No. 31 Inn",
      "lat": 29.11452,
      "lng": 110.46797,
      "distanceKm": 2.7,
      "kind": "hotel",
      "phone": "+86 185 7440 5571",
      "osm": "https://www.openstreetmap.org/node/7826324957"
    },
    {
      "name": "八戒青年旅舍天门山火车站店",
      "nameEn": "Bajie Youth Hostel (Tianmenshang Train Station)",
      "lat": 29.10857,
      "lng": 110.47594,
      "distanceKm": 3.2,
      "kind": "hostel",
      "phone": "+86 158 7442 5353",
      "osm": "https://www.openstreetmap.org/node/6029003631"
    },
    {
      "name": "万豪商务酒店",
      "lat": 29.1099,
      "lng": 110.4748,
      "distanceKm": 3.2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/7129074585"
    },
    {
      "name": "云尚景豪酒店",
      "nameEn": "Yunshang Jinghao Hotel",
      "lat": 29.12709,
      "lng": 110.46251,
      "distanceKm": 3.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/10604129826"
    },
    {
      "name": "桔酒店(张家界天索道站)",
      "nameEn": "Orange Hotel (Zhangjiajie Tianmen Mountain Ropeway Station)",
      "lat": 29.10976,
      "lng": 110.47643,
      "distanceKm": 3.3,
      "kind": "hotel",
      "phone": "(0744)8885888",
      "osm": "https://www.openstreetmap.org/node/12209385301"
    },
    {
      "name": "海天大酒店",
      "lat": 29.12616,
      "lng": 110.46397,
      "distanceKm": 3.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/572299061"
    },
    {
      "name": "晨天大酒店",
      "lat": 29.11892,
      "lng": 110.47357,
      "distanceKm": 3.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12210084889"
    },
    {
      "name": "张家界天门山温德姆花园酒店",
      "nameEn": "Wyndham Garden Zhangjiajie Tianmen Mountain",
      "lat": 29.11001,
      "lng": 110.47744,
      "distanceKm": 3.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12375970601"
    }
  ],
  EVN: [
    {
      "name": "Lux Plaza Hotel",
      "lat": 40.16179,
      "lng": 44.40346,
      "distanceKm": 1.7,
      "kind": "motel",
      "phone": "099203535",
      "osm": "https://www.openstreetmap.org/node/7273455285"
    },
    {
      "name": "Otyak",
      "lat": 40.16132,
      "lng": 44.40436,
      "distanceKm": 1.7,
      "kind": "guest_house",
      "phone": "+374 41 550607",
      "osm": "https://www.openstreetmap.org/way/616103327"
    },
    {
      "name": "Abrahamyan's Hostel",
      "lat": 40.16328,
      "lng": 44.40378,
      "distanceKm": 1.9,
      "kind": "hostel",
      "phone": "+37455444343",
      "osm": "https://www.openstreetmap.org/node/11226510505"
    },
    {
      "name": "Мотель \"ЕКО\"",
      "nameEn": "\"ЕКО\" Guest House",
      "lat": 40.15841,
      "lng": 44.42854,
      "distanceKm": 3,
      "kind": "guest_house",
      "phone": "+374 91 47 79 22",
      "osm": "https://www.openstreetmap.org/node/5959520790"
    },
    {
      "name": "Woolway Guesthouse",
      "lat": 40.1554,
      "lng": 44.43702,
      "distanceKm": 3.6,
      "kind": "hotel",
      "website": "https://woolway.am/",
      "phone": "+374 33 96 65 26",
      "osm": "https://www.openstreetmap.org/node/10691389297"
    },
    {
      "name": "Тун",
      "nameEn": "Tun",
      "lat": 40.16208,
      "lng": 44.34948,
      "distanceKm": 4.3,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/4416887489"
    },
    {
      "name": "Տուն 1/43",
      "lat": 40.17979,
      "lng": 44.43608,
      "distanceKm": 5,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/5715321354"
    },
    {
      "name": "\"Nors\" Guest House",
      "lat": 40.17908,
      "lng": 44.43964,
      "distanceKm": 5.1,
      "kind": "guest_house",
      "phone": "+374 94 24 25 80",
      "osm": "https://www.openstreetmap.org/node/7217796781"
    },
    {
      "name": "Բնակելի շենք",
      "nameEn": "Building",
      "lat": 40.14648,
      "lng": 44.4657,
      "distanceKm": 5.9,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/5250435322"
    },
    {
      "name": "Апавен",
      "nameEn": "Apaven",
      "lat": 40.13773,
      "lng": 44.46414,
      "distanceKm": 5.9,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/6341100786"
    }
  ],
  EWR: [
    {
      "name": "Marriott Newark Airport",
      "lat": 40.69231,
      "lng": -74.18174,
      "distanceKm": 0.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/51653646"
    },
    {
      "name": "Hampton Inn & Suites",
      "lat": 40.69906,
      "lng": -74.18771,
      "distanceKm": 1.5,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/ewrithx-hampton-newark-airport/",
      "phone": "+1 973-242-0900",
      "osm": "https://www.openstreetmap.org/way/475902822"
    },
    {
      "name": "Holiday Inn Express",
      "lat": 40.68457,
      "lng": -74.19408,
      "distanceKm": 1.7,
      "kind": "hotel",
      "website": "https://www.ihg.com/holidayinnexpress/hotels/us/en/elizabeth/ewrzb/hoteldetail",
      "phone": "+1 908-355-0500",
      "osm": "https://www.openstreetmap.org/way/278404322"
    },
    {
      "name": "Hilton Newark Liberty",
      "lat": 40.6868,
      "lng": -74.19385,
      "distanceKm": 1.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/429531594"
    },
    {
      "name": "Renaissance Newark Airport Hotel",
      "lat": 40.68355,
      "lng": -74.19427,
      "distanceKm": 1.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/278404324"
    },
    {
      "name": "Best Western Plus",
      "lat": 40.70507,
      "lng": -74.18732,
      "distanceKm": 2,
      "kind": "hotel",
      "website": "https://www.bestwestern.com/en_US/book/hotels-in-newark/best-western-plus-newark-airport-west/propertyCode.31049.html",
      "phone": "+1 973-621-6200",
      "osm": "https://www.openstreetmap.org/way/277480665"
    },
    {
      "name": "Crowne Plaza",
      "lat": 40.67888,
      "lng": -74.19386,
      "distanceKm": 2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/278404325"
    },
    {
      "name": "Days Inn",
      "lat": 40.67832,
      "lng": -74.19455,
      "distanceKm": 2.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/320678937"
    },
    {
      "name": "SpringHill Suites Newark Liberty International Airport",
      "lat": 40.70944,
      "lng": -74.17,
      "distanceKm": 2.2,
      "kind": "hotel",
      "website": "https://www.marriott.com/ewrsa",
      "phone": "+1 973-624-5300",
      "osm": "https://www.openstreetmap.org/way/338216419"
    },
    {
      "name": "Courtyard Newark Liberty International Airport",
      "lat": 40.7094,
      "lng": -74.17256,
      "distanceKm": 2.2,
      "kind": "hotel",
      "website": "https://www.marriott.com/ewrca",
      "phone": "+1 973-643-8500",
      "osm": "https://www.openstreetmap.org/way/420672888"
    }
  ],
  FCO: [
    {
      "name": "Airport One Hotel",
      "lat": 41.80304,
      "lng": 12.22582,
      "distanceKm": 1.1,
      "kind": "hotel",
      "phone": "+39 06 6508 3002",
      "osm": "https://www.openstreetmap.org/node/5168720723"
    },
    {
      "name": "Air Rooms",
      "lat": 41.79482,
      "lng": 12.25295,
      "distanceKm": 1.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/632896317"
    },
    {
      "name": "Hilton Roma Airport",
      "nameEn": "Hilton Rome Airport",
      "lat": 41.79141,
      "lng": 12.25553,
      "distanceKm": 1.7,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/romaptw-hilton-rome-airport/",
      "phone": "+39 06 65258",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/node/378978299"
    },
    {
      "name": "Intorno al fico",
      "lat": 41.8033,
      "lng": 12.21702,
      "distanceKm": 1.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/11241855682"
    },
    {
      "name": "Il Focolare",
      "lat": 41.81303,
      "lng": 12.21691,
      "distanceKm": 2.3,
      "kind": "guest_house",
      "website": "https://ilfocolareafiumicino.it",
      "phone": "+39 389 766 7927",
      "osm": "https://www.openstreetmap.org/way/450718728"
    },
    {
      "name": "B&B PURPLE ITALY",
      "lat": 41.7783,
      "lng": 12.22667,
      "distanceKm": 2.6,
      "kind": "guest_house",
      "phone": "+39 342 042 5848",
      "osm": "https://www.openstreetmap.org/node/13718034496"
    },
    {
      "name": "La Spiaggia",
      "lat": 41.81604,
      "lng": 12.21135,
      "distanceKm": 2.9,
      "kind": "hotel",
      "phone": "+39 06 6589975",
      "stars": 1,
      "osm": "https://www.openstreetmap.org/node/4037043411"
    },
    {
      "name": "Hilton Garden Inn Rome Airport",
      "lat": 41.80009,
      "lng": 12.27331,
      "distanceKm": 2.9,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/fcoapgi-hilton-garden-inn-rome-airport/?SEO_id=OTHR-EMEA-GI-FCOAPGI",
      "phone": "+39 06 65259000",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/node/6944971613"
    },
    {
      "name": "Courtyard By Marriot",
      "lat": 41.77298,
      "lng": 12.23913,
      "distanceKm": 3,
      "kind": "hotel",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/node/2489050809"
    },
    {
      "name": "Seccy hotel boutique",
      "lat": 41.77334,
      "lng": 12.23021,
      "distanceKm": 3.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/2377090527"
    }
  ],
  GOI: [
    {
      "name": "Coconut Creek Hotel",
      "lat": 15.37314,
      "lng": 73.83321,
      "distanceKm": 0.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/560733999"
    },
    {
      "name": "Bogmalo Beach Resort",
      "lat": 15.36872,
      "lng": 73.83562,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/560734000"
    },
    {
      "name": "SWINg! Guesthouse",
      "lat": 15.36899,
      "lng": 73.83588,
      "distanceKm": 1.4,
      "kind": "guest_house",
      "website": "https://www.swingbythebay.com/",
      "phone": "+91 9899798510",
      "osm": "https://www.openstreetmap.org/node/6006531388"
    },
    {
      "name": "G.S.L Guest house",
      "lat": 15.39725,
      "lng": 73.8309,
      "distanceKm": 1.8,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/way/430280781"
    },
    {
      "name": "Flora Grand",
      "lat": 15.39822,
      "lng": 73.82873,
      "distanceKm": 2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4894842226"
    },
    {
      "name": "Hotel Vasco",
      "lat": 15.39864,
      "lng": 73.82864,
      "distanceKm": 2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/430280783"
    },
    {
      "name": "Hotel Sanman",
      "lat": 15.39847,
      "lng": 73.82896,
      "distanceKm": 2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/640503648"
    },
    {
      "name": "Sun Shine",
      "lat": 15.38788,
      "lng": 73.84908,
      "distanceKm": 2.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/13887576639"
    },
    {
      "name": "Mohidin's Grandeur",
      "lat": 15.39228,
      "lng": 73.84843,
      "distanceKm": 2.2,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/4442287625"
    },
    {
      "name": "Hotel rebello",
      "lat": 15.39933,
      "lng": 73.82033,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4895112922"
    }
  ],
  GYD: [
    {
      "name": "Sheraton Baku Airport Hotel",
      "nameEn": "Sheraton Airport Baku",
      "lat": 40.46091,
      "lng": 50.05361,
      "distanceKm": 0.9,
      "kind": "hotel",
      "website": "http://www.sheratonbakuairport.com",
      "phone": "+994 12 437 49 49",
      "stars": 5,
      "osm": "https://www.openstreetmap.org/node/1753956133"
    },
    {
      "name": "Şəkili Mübarız",
      "lat": 40.47882,
      "lng": 50.0229,
      "distanceKm": 2.4,
      "kind": "guest_house",
      "phone": "0775150313",
      "osm": "https://www.openstreetmap.org/node/9861449917"
    },
    {
      "name": "Kamran home",
      "lat": 40.46466,
      "lng": 50.08112,
      "distanceKm": 2.9,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/5745778521"
    },
    {
      "name": "Abbas ev 835",
      "lat": 40.47981,
      "lng": 50.01562,
      "distanceKm": 3,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/5902385185"
    },
    {
      "name": "101 Peşə Liseyinin Yataqxanası",
      "lat": 40.4499,
      "lng": 50.08637,
      "distanceKm": 3.9,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/3504876533"
    },
    {
      "name": "Yataqxana",
      "lat": 40.44921,
      "lng": 50.09094,
      "distanceKm": 4.3,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/10778432726"
    },
    {
      "name": "Şam Bağı Turist Bazası",
      "lat": 40.43405,
      "lng": 50.09644,
      "distanceKm": 5.6,
      "kind": "motel",
      "osm": "https://www.openstreetmap.org/node/10763899879"
    },
    {
      "name": "Həsənovlar Qonaq Evi",
      "nameEn": "Hasanovs Villa",
      "lat": 40.49297,
      "lng": 50.1067,
      "distanceKm": 5.8,
      "kind": "guest_house",
      "website": "https://www.booking.com/hotel/az/hasanovs-villa.html",
      "phone": "+994503237230",
      "osm": "https://www.openstreetmap.org/node/4970973221"
    },
    {
      "name": "Suraxani ev 119",
      "lat": 40.43186,
      "lng": 49.99661,
      "distanceKm": 5.8,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/5755201121"
    }
  ],
  HAN: [
    {
      "name": "SN 12G gia đình Giáo viên và Hàng Không",
      "nameEn": "Xã Phú Cường, Sóc Sơn",
      "lat": 21.20839,
      "lng": 105.78958,
      "distanceKm": 2.3,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/5281436823"
    },
    {
      "name": "Khách Sạn Đức Hiếu",
      "lat": 21.2191,
      "lng": 105.78397,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4968881229"
    },
    {
      "name": "Khách Sạn Dragon Hotel Airport",
      "lat": 21.21895,
      "lng": 105.78336,
      "distanceKm": 2.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4924408244"
    },
    {
      "name": "Paragon",
      "lat": 21.21896,
      "lng": 105.7831,
      "distanceKm": 2.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/10246318510"
    },
    {
      "name": "Anh Duong Hotel",
      "lat": 21.21829,
      "lng": 105.78247,
      "distanceKm": 2.6,
      "kind": "hotel",
      "phone": "+84 832 123 098",
      "osm": "https://www.openstreetmap.org/node/12434838560"
    },
    {
      "name": "Van Anh Hotel",
      "lat": 21.21835,
      "lng": 105.78225,
      "distanceKm": 2.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/13686189401"
    },
    {
      "name": "The King Hotel",
      "lat": 21.21398,
      "lng": 105.78212,
      "distanceKm": 2.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12364734891"
    },
    {
      "name": "Khách Sạn Family Transit",
      "lat": 21.21674,
      "lng": 105.78108,
      "distanceKm": 2.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4264124598"
    },
    {
      "name": "Thanh Son Noi Bai Airport Hotel",
      "lat": 21.21522,
      "lng": 105.78106,
      "distanceKm": 2.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5558193886"
    },
    {
      "name": "Khách Sạn New Sky Airport",
      "lat": 21.21488,
      "lng": 105.78136,
      "distanceKm": 2.8,
      "kind": "hotel",
      "website": "https://newskyairporthotel.com/",
      "phone": "+84987987537",
      "osm": "https://www.openstreetmap.org/node/9584549986"
    }
  ],
  HKT: [
    {
      "name": "JJ airport condotel",
      "lat": 8.1084,
      "lng": 98.31125,
      "distanceKm": 0.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/505332084"
    },
    {
      "name": "เอพอร์ตโฮทเทล",
      "nameEn": "Airport hotel",
      "lat": 8.10857,
      "lng": 98.31021,
      "distanceKm": 0.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5051672021"
    },
    {
      "name": "Batikseafood Airport & Room",
      "lat": 8.10529,
      "lng": 98.31452,
      "distanceKm": 0.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/13550910739"
    },
    {
      "name": "D.A Airport hotel",
      "lat": 8.10562,
      "lng": 98.31337,
      "distanceKm": 0.9,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/way/1513062312"
    },
    {
      "name": "Le Fay Airport Residence",
      "lat": 8.1064,
      "lng": 98.30937,
      "distanceKm": 1.1,
      "kind": "hotel",
      "phone": "+66960180089",
      "osm": "https://www.openstreetmap.org/node/4613248587"
    },
    {
      "name": "David Residence",
      "lat": 8.10683,
      "lng": 98.30869,
      "distanceKm": 1.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/505332072"
    },
    {
      "name": "Khao Oat airport",
      "lat": 8.10665,
      "lng": 98.30863,
      "distanceKm": 1.2,
      "kind": "hotel",
      "website": "https://khaooatairport.top/",
      "osm": "https://www.openstreetmap.org/node/13368665416"
    },
    {
      "name": "Splash Beach Resort, Maikhao Phuket",
      "lat": 8.11591,
      "lng": 98.30587,
      "distanceKm": 1.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/1077103274"
    },
    {
      "name": "Room Hostel @ Phuket Airport",
      "lat": 8.10532,
      "lng": 98.30864,
      "distanceKm": 1.3,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/5863649037"
    },
    {
      "name": "Room Hotel @ Phuket Airport",
      "lat": 8.10537,
      "lng": 98.30862,
      "distanceKm": 1.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5869957407"
    }
  ],
  HND: [
    {
      "name": "First Cabin Haneda",
      "lat": 35.54899,
      "lng": 139.78387,
      "distanceKm": 0.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/11328955211"
    },
    {
      "name": "羽田エクセルホテル東急",
      "nameEn": "Haneda Excel Hotel Tokyu",
      "lat": 35.55329,
      "lng": 139.78702,
      "distanceKm": 0.8,
      "kind": "hotel",
      "website": "http://www.haneda-e.tokyuhotels.co.jp/ja/index.html",
      "osm": "https://www.openstreetmap.org/way/322878924"
    },
    {
      "name": "ザ ロイヤルパークホテル 東京羽田",
      "nameEn": "The Royal Park Hotel Tokyo Haneda",
      "lat": 35.54667,
      "lng": 139.76809,
      "distanceKm": 1.1,
      "kind": "hotel",
      "website": "https://www.royalparkhotels.co.jp/the/tokyohaneda/",
      "phone": "+81 3-6830-1111",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/322819164"
    },
    {
      "name": "京急EXイン 羽田イノベーションシティ",
      "nameEn": "Keikyu EX Inn Haneda Innovation City",
      "lat": 35.548,
      "lng": 139.75565,
      "distanceKm": 2.2,
      "kind": "hotel",
      "website": "https://www.keikyu-exinn.co.jp/hotel/innovation-city/",
      "phone": "+81-3-5579-7230",
      "osm": "https://www.openstreetmap.org/node/13461597330"
    },
    {
      "name": "ホテルメトロポリタン 羽田",
      "nameEn": "Hotel Metropolitan Haneda",
      "lat": 35.54944,
      "lng": 139.75491,
      "distanceKm": 2.3,
      "kind": "hotel",
      "website": "https://haneda.metropolitan.jp/",
      "phone": "+81-3-3747-1101",
      "osm": "https://www.openstreetmap.org/node/13461597329"
    },
    {
      "name": "京急EXイン羽田",
      "nameEn": "Keikyu EX Inn Haneda",
      "lat": 35.55044,
      "lng": 139.75233,
      "distanceKm": 2.5,
      "kind": "hotel",
      "website": "https://www.keikyu-exinn.co.jp/hotel/haneda/",
      "phone": "+81 3 3742 3910",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/12518255799"
    },
    {
      "name": "川崎キングスカイフロント東急REIホテル",
      "nameEn": "Kawasaki King Skyfront Tokyu REI Hotel",
      "lat": 35.541,
      "lng": 139.75317,
      "distanceKm": 2.6,
      "kind": "hotel",
      "website": "https://www.tokyuhotelsjapan.com/global/kawasaki-r/facility/index.html",
      "phone": "+81 4 42801090",
      "osm": "https://www.openstreetmap.org/node/5813553164"
    },
    {
      "name": "Minn Haneda Airport",
      "lat": 35.54797,
      "lng": 139.74857,
      "distanceKm": 2.8,
      "kind": "hotel",
      "website": "https://theatel.asia/haneda/",
      "phone": "+81-50-3176-6464",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/6566380154"
    },
    {
      "name": "ホテルマイステイズ羽田",
      "nameEn": "Hotel MyStays Haneda",
      "lat": 35.5508,
      "lng": 139.74911,
      "distanceKm": 2.8,
      "kind": "hotel",
      "website": "https://www.mystays.com/en-us/hotel-mystays-haneda-tokyo/",
      "phone": "+81 3 68635539",
      "osm": "https://www.openstreetmap.org/node/12518282451"
    },
    {
      "name": "plat hostel keikyu haneda home",
      "lat": 35.54792,
      "lng": 139.74877,
      "distanceKm": 2.8,
      "kind": "hostel",
      "website": "https://plat-hostel-keikyu.com/hostel/haneda-home/",
      "phone": "+81-3-6423-6168",
      "osm": "https://www.openstreetmap.org/node/12529586078"
    }
  ],
  HRG: [
    {
      "name": "Desert Inn",
      "lat": 27.17112,
      "lng": 33.82251,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/99756983"
    },
    {
      "name": "The Grand Resort",
      "lat": 27.17466,
      "lng": 33.8231,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/244899662"
    },
    {
      "name": "الحمراء",
      "nameEn": "Alhambra",
      "lat": 27.16753,
      "lng": 33.8221,
      "distanceKm": 2.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/99756976"
    },
    {
      "name": "Friendship Village",
      "lat": 27.17009,
      "lng": 33.82287,
      "distanceKm": 2.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/146214987"
    },
    {
      "name": "Marine Sports Club Red Sea",
      "lat": 27.17698,
      "lng": 33.82586,
      "distanceKm": 2.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/99756097"
    },
    {
      "name": "The Grand Marina",
      "lat": 27.17632,
      "lng": 33.82604,
      "distanceKm": 2.6,
      "kind": "hotel",
      "phone": "+20 65 3463113",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/171494887"
    },
    {
      "name": "Ambassadorf Club",
      "lat": 27.18952,
      "lng": 33.8222,
      "distanceKm": 2.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/171754550"
    },
    {
      "name": "Pickalbatros Blu Spa Resort",
      "lat": 27.18227,
      "lng": 33.82491,
      "distanceKm": 2.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1179956997"
    },
    {
      "name": "Pickalbatros Blu Spa Resort",
      "lat": 27.18235,
      "lng": 33.82498,
      "distanceKm": 2.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1179956998"
    },
    {
      "name": "Pickalbatros Blu Spa Resort",
      "lat": 27.18207,
      "lng": 33.82516,
      "distanceKm": 2.6,
      "kind": "hotel",
      "website": "https://www.pickalbatros.com/",
      "phone": "(+202) 15787",
      "osm": "https://www.openstreetmap.org/way/1179957000"
    }
  ],
  ICN: [
    {
      "name": "Incheon Terminal 2 Transit Hot",
      "lat": 37.46827,
      "lng": 126.43607,
      "distanceKm": 1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12176741230"
    },
    {
      "name": "Darakhyu Capsule Hotel",
      "lat": 37.46916,
      "lng": 126.43434,
      "distanceKm": 1.1,
      "kind": "hotel",
      "website": "https://www.walkerhill.com/capsulehotel/en/t2/",
      "phone": "8232-743-5008",
      "osm": "https://www.openstreetmap.org/node/11879744412"
    },
    {
      "name": "Transit Hotel",
      "lat": 37.45045,
      "lng": 126.45462,
      "distanceKm": 1.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6433308130"
    },
    {
      "name": "Hotel Ora",
      "lat": 37.45411,
      "lng": 126.41789,
      "distanceKm": 2.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1312681673"
    },
    {
      "name": "그랜드 하얏트 인천",
      "nameEn": "Grand Hyatt Incheon",
      "lat": 37.44059,
      "lng": 126.45755,
      "distanceKm": 2.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/447703436"
    },
    {
      "name": "Incheon airport hotel car park",
      "lat": 37.4392,
      "lng": 126.46071,
      "distanceKm": 2.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4221573989"
    },
    {
      "name": "IBC 월드게이트오피스텔",
      "nameEn": "IBC World gate Officetel",
      "lat": 37.43919,
      "lng": 126.46013,
      "distanceKm": 2.9,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/4995227799"
    },
    {
      "name": "파라다이스시티 호텔 & 리조트",
      "nameEn": "Paradise City Hotel & Resort",
      "lat": 37.4373,
      "lng": 126.45567,
      "distanceKm": 2.9,
      "kind": "hotel",
      "website": "https://www.p-city.com/front/hotel/overview",
      "osm": "https://www.openstreetmap.org/node/7848217132"
    },
    {
      "name": "파라다이스시티 아트 파라디소",
      "nameEn": "Paradise City Art Paradiso",
      "lat": 37.43699,
      "lng": 126.45778,
      "distanceKm": 3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/7848397200"
    },
    {
      "name": "베스트 웨스턴  인천에어포트 호텔",
      "nameEn": "Best Western Premier Incheon Airport Hotel",
      "lat": 37.43834,
      "lng": 126.45978,
      "distanceKm": 3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/429005059"
    }
  ],
  IST: [
    {
      "name": "Yotel Istanbul Airport (Landside)",
      "lat": 41.26045,
      "lng": 28.73995,
      "distanceKm": 1.9,
      "kind": "hotel",
      "website": "https://www.yotel.com/en/hotels/yotel-istanbul-airport-landside",
      "osm": "https://www.openstreetmap.org/node/6153093769"
    },
    {
      "name": "Yotelair Istanbul Airport (Airside)",
      "lat": 41.26084,
      "lng": 28.73984,
      "distanceKm": 1.9,
      "kind": "hotel",
      "website": "https://www.yotel.com/en/hotels/yotelair-istanbul-airport-airside",
      "osm": "https://www.openstreetmap.org/node/6313204370"
    }
  ],
  JFK: [
    {
      "name": "TWA Hotel",
      "lat": 40.64577,
      "lng": -73.77767,
      "distanceKm": 0.5,
      "kind": "hotel",
      "website": "https://www.twahotel.com/hotel",
      "osm": "https://www.openstreetmap.org/node/6227799210"
    },
    {
      "name": "Marriott",
      "lat": 40.66637,
      "lng": -73.78019,
      "distanceKm": 2.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5652846284"
    },
    {
      "name": "JFK Inn",
      "lat": 40.66615,
      "lng": -73.78195,
      "distanceKm": 2.8,
      "kind": "motel",
      "osm": "https://www.openstreetmap.org/node/5794757882"
    },
    {
      "name": "Howard Johnson Inn",
      "lat": 40.6686,
      "lng": -73.78129,
      "distanceKm": 3,
      "kind": "hotel",
      "website": "https://howardjohnson-inn-jamaica.h-rsv.com/",
      "phone": "+1 469-610-3608",
      "osm": "https://www.openstreetmap.org/node/5275169326"
    },
    {
      "name": "Super 8 Jamaica North Conduit",
      "lat": 40.66755,
      "lng": -73.78342,
      "distanceKm": 3,
      "kind": "motel",
      "osm": "https://www.openstreetmap.org/node/5489299261"
    },
    {
      "name": "Rodeway Inn",
      "lat": 40.66804,
      "lng": -73.78307,
      "distanceKm": 3,
      "kind": "motel",
      "website": "https://www.choicehotels.com/new-york/white-plains/cambria-hotels",
      "phone": "+1 718-749-5855",
      "osm": "https://www.openstreetmap.org/way/955276617"
    },
    {
      "name": "Sleep Inn",
      "lat": 40.66895,
      "lng": -73.78155,
      "distanceKm": 3.1,
      "kind": "hotel",
      "website": "https://www.choicehotels.com/new-york/white-plains/cambria-hotels",
      "phone": "+1 718-341-4300",
      "osm": "https://www.openstreetmap.org/way/282932413"
    },
    {
      "name": "Courtyard",
      "lat": 40.66723,
      "lng": -73.79416,
      "distanceKm": 3.2,
      "kind": "hotel",
      "website": "https://www.marriott.com/nycjf",
      "phone": "+1 718-848-2121",
      "osm": "https://www.openstreetmap.org/node/7156301612"
    },
    {
      "name": "Hampton Inn",
      "lat": 40.66741,
      "lng": -73.7949,
      "distanceKm": 3.2,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/nycaphx-hampton-ny-jfk/",
      "phone": "+1 718-322-7500",
      "osm": "https://www.openstreetmap.org/node/7156301617"
    },
    {
      "name": "Marriott New York JFK Airport",
      "lat": 40.66731,
      "lng": -73.79666,
      "distanceKm": 3.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/766219012"
    }
  ],
  KIX: [
    {
      "name": "ホテル日航関西空港",
      "nameEn": "Hotel Nikko Kansai Airport",
      "lat": 34.43705,
      "lng": 135.24315,
      "distanceKm": 0.3,
      "kind": "hotel",
      "website": "https://www.nikkokix.com/",
      "osm": "https://www.openstreetmap.org/node/1662746689"
    },
    {
      "name": "ファーストキャビン関西空港",
      "lat": 34.43728,
      "lng": 135.24352,
      "distanceKm": 0.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/13022441230"
    },
    {
      "name": "変なホテル 関西空港・Hen na hotel",
      "nameEn": "Hen na hotel",
      "lat": 34.41512,
      "lng": 135.299,
      "distanceKm": 5.5,
      "kind": "hotel",
      "website": "https://www.hennnahotel.com/kansai-airport/",
      "phone": "＋81 50-5210-5300",
      "osm": "https://www.openstreetmap.org/way/1249000524"
    },
    {
      "name": "EZ HOTEL 関西空港 Seaside",
      "nameEn": "EZ HOTELKansaikuko Seaside",
      "lat": 34.40217,
      "lng": 135.29092,
      "distanceKm": 5.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1275336686"
    },
    {
      "name": "Odysis Suites Osaka Airport Hotel",
      "lat": 34.41148,
      "lng": 135.29986,
      "distanceKm": 5.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12463126602"
    },
    {
      "name": "スターゲイトホテル関西エアポート",
      "nameEn": "Star Gate Hotel Kansai Airport",
      "lat": 34.4111,
      "lng": 135.2999,
      "distanceKm": 5.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6157741007"
    },
    {
      "name": "関西エアポートワシントンホテル",
      "nameEn": "Kansai Airport Washington Hotel",
      "lat": 34.41115,
      "lng": 135.30154,
      "distanceKm": 5.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/657451910"
    }
  ],
  KUT: [
    {
      "name": "ცისკარი",
      "nameEn": "Tsiskari",
      "lat": 42.17736,
      "lng": 42.42646,
      "distanceKm": 4.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1311980423"
    },
    {
      "name": "Beautiful Georgia",
      "lat": 42.21724,
      "lng": 42.44045,
      "distanceKm": 5.7,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/5893427463"
    },
    {
      "name": "Guesthouse Beautiful Georgia",
      "lat": 42.21724,
      "lng": 42.44045,
      "distanceKm": 5.7,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/6391378642"
    }
  ],
  KZN: [
    {
      "name": "Полёт",
      "lat": 55.61061,
      "lng": 49.29192,
      "distanceKm": 1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/367325573"
    },
    {
      "name": "Капсульный отель",
      "nameEn": "Capsule Hotel",
      "lat": 55.60785,
      "lng": 49.29909,
      "distanceKm": 1.3,
      "kind": "hostel",
      "phone": "+7 977 493-28-35",
      "osm": "https://www.openstreetmap.org/node/10286521058"
    },
    {
      "name": "Kravt Hotel Kazan Airport",
      "lat": 55.6097,
      "lng": 49.30269,
      "distanceKm": 1.6,
      "kind": "hotel",
      "website": "https://kravt-kazan.ru/",
      "phone": "+7 800 5007376",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/node/9659277732"
    },
    {
      "name": "Muse of city",
      "lat": 55.60976,
      "lng": 49.30256,
      "distanceKm": 1.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/13484473191"
    },
    {
      "name": "Зенит",
      "lat": 55.63561,
      "lng": 49.21663,
      "distanceKm": 5.1,
      "kind": "hostel",
      "phone": "+7 843 5983909;+7 960 0444909",
      "osm": "https://www.openstreetmap.org/node/10844133474"
    }
  ],
  LED: [
    {
      "name": "Aerosleep",
      "lat": 59.80002,
      "lng": 30.27272,
      "distanceKm": 0.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6708607971"
    },
    {
      "name": "Park Inn by Radisson Pulkovo Airport",
      "lat": 59.79986,
      "lng": 30.27511,
      "distanceKm": 0.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6819012185"
    },
    {
      "name": "Cosmos",
      "lat": 59.79999,
      "lng": 30.27574,
      "distanceKm": 0.7,
      "kind": "hotel",
      "website": "https://pulkovo.cosmosgroup.ru/ru",
      "phone": "+7 812 3292404;+7 812 3351174;+7 812 6405500;+7 812 6405504;+7 812 7403995",
      "osm": "https://www.openstreetmap.org/way/230056682"
    },
    {
      "name": "Пулково",
      "lat": 59.81387,
      "lng": 30.29971,
      "distanceKm": 2.6,
      "kind": "hotel",
      "website": "https://hotelpulkovo.ru/",
      "phone": "+7 (812) 612-07-77",
      "stars": 2,
      "osm": "https://www.openstreetmap.org/node/621452070"
    },
    {
      "name": "Crowne Plaza",
      "lat": 59.8061,
      "lng": 30.31624,
      "distanceKm": 3.1,
      "kind": "hotel",
      "website": "https://www.airportcityplaza.ru/",
      "phone": "+7 (812) 240-42-00",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/node/1572967785"
    },
    {
      "name": "Ринго",
      "lat": 59.83457,
      "lng": 30.26153,
      "distanceKm": 3.8,
      "kind": "hotel",
      "website": "http://www.motelspb.ru/motel.php?mid=4#description",
      "osm": "https://www.openstreetmap.org/node/1989374326"
    },
    {
      "name": "Какаду",
      "nameEn": "Kakadu",
      "lat": 59.82498,
      "lng": 30.32631,
      "distanceKm": 4.5,
      "kind": "hotel",
      "website": "https://kakadu.spb.ru/",
      "phone": "+7 981 9819792",
      "osm": "https://www.openstreetmap.org/node/5829658287"
    },
    {
      "name": "Техномост",
      "lat": 59.82158,
      "lng": 30.19145,
      "distanceKm": 4.6,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/12407867451"
    },
    {
      "name": "Дом паломника",
      "lat": 59.8149,
      "lng": 30.18457,
      "distanceKm": 4.7,
      "kind": "hotel",
      "website": "https://a-n.cerkov.ru/gostinica-dlya-palomnikov/",
      "phone": "+7 921 9972836;+7 981 8732836",
      "osm": "https://www.openstreetmap.org/node/12239476777"
    },
    {
      "name": "Salut V",
      "lat": 59.83209,
      "lng": 30.32553,
      "distanceKm": 5,
      "kind": "hotel",
      "website": "https://salut-rent.ru/bookingv",
      "phone": "+7 800 5511246;+7 812 2427647;+7 981 2491019;+7 981 2491023",
      "osm": "https://www.openstreetmap.org/node/7988412241"
    }
  ],
  LGW: [
    {
      "name": "Radisson RED London Gatwick Airport",
      "lat": 51.14632,
      "lng": -0.18172,
      "distanceKm": 0.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/88734442"
    },
    {
      "name": "Sofitel Gatwick",
      "lat": 51.16095,
      "lng": -0.17402,
      "distanceKm": 1,
      "kind": "hotel",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/58886673"
    },
    {
      "name": "Hampton by Hilton London Gatwick Airport",
      "lat": 51.16185,
      "lng": -0.17762,
      "distanceKm": 1,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/longnhx-hampton-london-gatwick-airport/",
      "phone": "+44 1293 579999",
      "osm": "https://www.openstreetmap.org/way/293853285"
    },
    {
      "name": "Premier Inn London Gatwick Airport (A23)",
      "lat": 51.16393,
      "lng": -0.1738,
      "distanceKm": 1.3,
      "kind": "hotel",
      "website": "https://www.premierinn.com/gb/en/hotels/england/west-sussex/crawley/london-gatwick-airport-a23-airport-way.html",
      "osm": "https://www.openstreetmap.org/way/58886889"
    },
    {
      "name": "Bloc Hotel",
      "lat": 51.15647,
      "lng": -0.16298,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4253297115"
    },
    {
      "name": "Yotel",
      "lat": 51.15722,
      "lng": -0.163,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6122256030"
    },
    {
      "name": "Travelodge Gatwick Airport Central Hotel",
      "lat": 51.16581,
      "lng": -0.17825,
      "distanceKm": 1.4,
      "kind": "hotel",
      "website": "https://www.travelodge.co.uk/hotels/517/Gatwick-Airport-Central-hotel",
      "osm": "https://www.openstreetmap.org/way/58886996"
    },
    {
      "name": "Gatwick Moat House",
      "lat": 51.1667,
      "lng": -0.17819,
      "distanceKm": 1.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/58886166"
    },
    {
      "name": "Holiday Inn",
      "lat": 51.1682,
      "lng": -0.18055,
      "distanceKm": 1.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/59948799"
    },
    {
      "name": "Premier Inn Gatwick Airport South",
      "lat": 51.1396,
      "lng": -0.18356,
      "distanceKm": 1.6,
      "kind": "hotel",
      "website": "https://www.premierinn.com/gb/en/hotels/england/west-sussex/crawley/london-gatwick-airport-south-london-road.html",
      "osm": "https://www.openstreetmap.org/way/212275060"
    }
  ],
  LHR: [
    {
      "name": "Hilton Garden Inn London Heathrow Terminals 2 and 3",
      "lat": 51.46983,
      "lng": -0.45355,
      "distanceKm": 0.1,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/lhrhegi-hilton-garden-inn-london-heathrow-terminals-2-and-3/",
      "phone": "+44 20 3972 9700",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/976570913"
    },
    {
      "name": "Leonardo Hotel London Heathrow Airport",
      "lat": 51.48143,
      "lng": -0.45766,
      "distanceKm": 1.3,
      "kind": "hotel",
      "website": "https://www.jurysinns.com/hotels/london/leonardo-heathrow-airport",
      "phone": "+44 20 8990 0000",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/23352394"
    },
    {
      "name": "Ibis Styles London Heathrow Airport Hotel",
      "lat": 51.48164,
      "lng": -0.44892,
      "distanceKm": 1.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1336794933"
    },
    {
      "name": "Holiday Inn London - Heathrow Bath Road, an IHG Hotel",
      "lat": 51.48153,
      "lng": -0.46134,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6060652284"
    },
    {
      "name": "Holiday Inn Express London Heathrow T4",
      "lat": 51.45912,
      "lng": -0.44357,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6060841771"
    },
    {
      "name": "Crowne Plaza London Heathrow T4",
      "lat": 51.45911,
      "lng": -0.44327,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6060843713"
    },
    {
      "name": "Staybridge Suites London - Heathrow Bath Road, an IHG Hotel",
      "lat": 51.48154,
      "lng": -0.46172,
      "distanceKm": 1.4,
      "kind": "hotel",
      "website": "https://www.ihg.com/staybridge/hotels/gb/en/west-drayton/lonbr/hoteldetail",
      "phone": "+44 20 3962 5999",
      "osm": "https://www.openstreetmap.org/node/6063457067"
    },
    {
      "name": "Radisson Red London Heathrow",
      "lat": 51.48287,
      "lng": -0.45104,
      "distanceKm": 1.4,
      "kind": "hotel",
      "website": "https://www.radissonhotels.com/en-us/hotels/radisson-conference-london-heathrow",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/23352391"
    },
    {
      "name": "Ibis Styles London Heathrow Airport Hotel",
      "lat": 51.48159,
      "lng": -0.44841,
      "distanceKm": 1.4,
      "kind": "hotel",
      "phone": "+44 20 3862 7689",
      "osm": "https://www.openstreetmap.org/way/737416278"
    },
    {
      "name": "Hilton London Heathrow Airport",
      "lat": 51.45868,
      "lng": -0.4416,
      "distanceKm": 1.5,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/lhraptw-hilton-london-heathrow-airport/",
      "phone": "+44 20 8759 7755",
      "osm": "https://www.openstreetmap.org/way/22889929"
    }
  ],
  MAD: [
    {
      "name": "GettSleep Madrid",
      "lat": 40.49502,
      "lng": -3.56707,
      "distanceKm": 0.2,
      "kind": "hotel",
      "website": "https://gettsleep.es/",
      "phone": "+34628466830",
      "osm": "https://www.openstreetmap.org/node/13680244801"
    },
    {
      "name": "Hostelfly",
      "lat": 40.47495,
      "lng": -3.57548,
      "distanceKm": 2.2,
      "kind": "hostel",
      "website": "https://hostelfly.com/",
      "osm": "https://www.openstreetmap.org/node/12699227201"
    },
    {
      "name": "Aerotel Madrid Airport - Terminal 4",
      "lat": 40.49199,
      "lng": -3.59216,
      "distanceKm": 2.2,
      "kind": "hotel",
      "website": "http://myaerotel.com",
      "phone": "+34913276015",
      "osm": "https://www.openstreetmap.org/node/13680211002"
    },
    {
      "name": "Hostal Viky",
      "lat": 40.4737,
      "lng": -3.5759,
      "distanceKm": 2.3,
      "kind": "hotel",
      "stars": 2,
      "osm": "https://www.openstreetmap.org/node/2078657580"
    },
    {
      "name": "Hostal Viky",
      "lat": 40.4737,
      "lng": -3.5757,
      "distanceKm": 2.3,
      "kind": "hotel",
      "website": "https://hostal-viky.com/",
      "phone": "+34 913 054 812",
      "stars": 2,
      "osm": "https://www.openstreetmap.org/node/9307436328"
    },
    {
      "name": "El Príncipe Horno de Leña",
      "lat": 40.47391,
      "lng": -3.57811,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5139118051"
    },
    {
      "name": "Apartamentos Barajas",
      "lat": 40.47271,
      "lng": -3.57565,
      "distanceKm": 2.4,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/way/442806338"
    },
    {
      "name": "Hotel Barajas Plaza",
      "lat": 40.47288,
      "lng": -3.57692,
      "distanceKm": 2.5,
      "kind": "hotel",
      "website": "https://hotelbarajasplaza.es/",
      "osm": "https://www.openstreetmap.org/node/603606242"
    },
    {
      "name": "Hotel Don Luis",
      "lat": 40.47271,
      "lng": -3.57864,
      "distanceKm": 2.5,
      "kind": "hotel",
      "website": "http://hoteldonluismadrid.com/",
      "phone": "+34 913120430",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/2289226446"
    },
    {
      "name": "Hostal Avenida Barajas",
      "lat": 40.47295,
      "lng": -3.58216,
      "distanceKm": 2.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/3357255004"
    }
  ],
  MLE: [
    {
      "name": "Hulhule Island Hotel",
      "lat": 4.19444,
      "lng": 73.52616,
      "distanceKm": 0.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/133845532"
    },
    {
      "name": "POLCO Tower C",
      "lat": 4.20819,
      "lng": 73.53869,
      "distanceKm": 2.1,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/way/477469173"
    },
    {
      "name": "White House",
      "lat": 4.17538,
      "lng": 73.51625,
      "distanceKm": 2.3,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/4337135912"
    },
    {
      "name": "Kaani Lodge",
      "lat": 4.17662,
      "lng": 73.5154,
      "distanceKm": 2.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5355241555"
    },
    {
      "name": "JEN",
      "lat": 4.17802,
      "lng": 73.51359,
      "distanceKm": 2.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/11182077737"
    },
    {
      "name": "Terminal 27 Hotel",
      "lat": 4.20756,
      "lng": 73.54207,
      "distanceKm": 2.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/13651846501"
    },
    {
      "name": "Meerumaa",
      "lat": 4.1755,
      "lng": 73.51633,
      "distanceKm": 2.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1317932596"
    },
    {
      "name": "UI Hotel",
      "lat": 4.20868,
      "lng": 73.54234,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/3848614960"
    },
    {
      "name": "Sala Boutique Hotel",
      "lat": 4.17661,
      "lng": 73.51353,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/3909276657"
    },
    {
      "name": "The Melrose",
      "lat": 4.17482,
      "lng": 73.51644,
      "distanceKm": 2.4,
      "kind": "hotel",
      "phone": "+960 330 0484",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/6292959096"
    }
  ],
  MSQ: [
    {
      "name": "Чайна Мерчантс",
      "lat": 53.9019,
      "lng": 27.97949,
      "distanceKm": 4,
      "kind": "hotel",
      "phone": "+375296228188",
      "osm": "https://www.openstreetmap.org/node/5285424422"
    }
  ],
  MUC: [
    {
      "name": "VIP Wing",
      "lat": 48.34895,
      "lng": 11.78484,
      "distanceKm": 0.9,
      "kind": "hotel",
      "website": "https://www.munich-airport.de/vip",
      "phone": "+49 89 9751333",
      "osm": "https://www.openstreetmap.org/node/4810055846"
    },
    {
      "name": "Hilton Munich Airport",
      "lat": 48.35563,
      "lng": 11.78872,
      "distanceKm": 1,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/muctmhi-hilton-munich-airport/",
      "phone": "+49 89 97820",
      "stars": 5,
      "osm": "https://www.openstreetmap.org/way/4447196"
    },
    {
      "name": "Ibis Styles München Airport",
      "lat": 48.35406,
      "lng": 11.75911,
      "distanceKm": 1.2,
      "kind": "hotel",
      "website": "https://all.accor.com/hotel/B1M9/index.de.shtml",
      "osm": "https://www.openstreetmap.org/way/1300934949"
    },
    {
      "name": "Mühle Attaching",
      "lat": 48.37127,
      "lng": 11.77359,
      "distanceKm": 2,
      "kind": "hotel",
      "website": "https://monteurzimmer-freising.de/",
      "phone": "+49 170 2943620",
      "osm": "https://www.openstreetmap.org/node/7083550817"
    },
    {
      "name": "Hotel Garni »Haus zum Gutenberg«",
      "lat": 48.32658,
      "lng": 11.75463,
      "distanceKm": 3.4,
      "kind": "hotel",
      "website": "http://www.haus-zum-gutenberg.de/",
      "phone": "+49 811 555 37-0",
      "osm": "https://www.openstreetmap.org/node/2288391429"
    },
    {
      "name": "ibis München Airport Süd",
      "lat": 48.33283,
      "lng": 11.74117,
      "distanceKm": 3.4,
      "kind": "hotel",
      "phone": "+49 811 550570",
      "osm": "https://www.openstreetmap.org/way/1157597099"
    },
    {
      "name": "Gästehaus am Flughafen",
      "lat": 48.34139,
      "lng": 11.73198,
      "distanceKm": 3.5,
      "kind": "hotel",
      "website": "http://gaestehaus-flughafen.de/",
      "phone": "+49 172 9861221",
      "osm": "https://www.openstreetmap.org/node/5240854990"
    },
    {
      "name": "Hampton by Hilton Munich Airport South",
      "lat": 48.33159,
      "lng": 11.74035,
      "distanceKm": 3.5,
      "kind": "hotel",
      "website": "https://www.hilton.com/en/hotels/muchohx-hampton-munich-airport-south/",
      "phone": "+49 811 5554460",
      "osm": "https://www.openstreetmap.org/node/12688729862"
    },
    {
      "name": "Mövenpick Hotel München Airport",
      "lat": 48.33145,
      "lng": 11.74238,
      "distanceKm": 3.5,
      "kind": "hotel",
      "website": "https://www.movenpick.com/en/europe/germany/munich/hotel-munich-airport/overview/",
      "phone": "+49 811 888 0",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/26805386"
    },
    {
      "name": "Regent Park Appartements",
      "lat": 48.32708,
      "lng": 11.74658,
      "distanceKm": 3.6,
      "kind": "hotel",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/8350077031"
    }
  ],
  MXP: [
    {
      "name": "Sheraton Milan Malpensa Airport Hotel & Conference Centre",
      "lat": 45.62763,
      "lng": 8.71104,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/1453586837"
    },
    {
      "name": "Idea Hotel Milano Malpensa Airport",
      "lat": 45.637,
      "lng": 8.70921,
      "distanceKm": 1.6,
      "kind": "hotel",
      "website": "https://www.ideahotel.it/",
      "phone": "+39 0331 233300",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/139188966"
    },
    {
      "name": "Holiday Inn Express Milan - Malpensa Airport",
      "lat": 45.63975,
      "lng": 8.71228,
      "distanceKm": 1.6,
      "kind": "hotel",
      "website": "https://www.ihg.com/holidayinnexpress/hotels/gb/en/somma-lombardo/milap/hoteldetail",
      "phone": "+39 0331 18330",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/way/193834733"
    },
    {
      "name": "Hotel Cervo",
      "lat": 45.64017,
      "lng": 8.70933,
      "distanceKm": 1.8,
      "kind": "hotel",
      "website": "http://www.hotelcervo.it/",
      "phone": "+39 0331 230821",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/way/227036900"
    },
    {
      "name": "First Hotel",
      "lat": 45.63811,
      "lng": 8.70574,
      "distanceKm": 1.9,
      "kind": "hotel",
      "website": "https://www.firsthotel.it/",
      "phone": "+39 0331 717045",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/node/3897857199"
    },
    {
      "name": "Crown Plaza Malpensa",
      "lat": 45.6421,
      "lng": 8.70847,
      "distanceKm": 2,
      "kind": "hotel",
      "website": "https://www.crowneplazamalpensa.com/",
      "phone": "+39 0331 21161",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/227038517"
    },
    {
      "name": "Moxy Milan Malpensa",
      "lat": 45.64967,
      "lng": 8.72324,
      "distanceKm": 2.2,
      "kind": "hotel",
      "website": "https://www.marriott.com/hotels/travel/milox-moxy-milan-malpensa-airport/",
      "phone": "+39 02 94757100",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/3404944777"
    },
    {
      "name": "Hotel Villa Malpensa",
      "lat": 45.62552,
      "lng": 8.69749,
      "distanceKm": 2.4,
      "kind": "hotel",
      "website": "https://hotelvillamalpensa.it/",
      "phone": "+39 0331 230944",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/node/9554153319"
    },
    {
      "name": "I Fiori di Malpensa",
      "lat": 45.61892,
      "lng": 8.75668,
      "distanceKm": 2.6,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/4604483452"
    },
    {
      "name": "B&B Il Gelsomino",
      "lat": 45.61591,
      "lng": 8.75518,
      "distanceKm": 2.7,
      "kind": "guest_house",
      "phone": "+30 0331 240949",
      "osm": "https://www.openstreetmap.org/node/4604119587"
    }
  ],
  NRT: [
    {
      "name": "ナインアワーズ",
      "nameEn": "9h nine hours",
      "lat": 35.77312,
      "lng": 140.38644,
      "distanceKm": 0.6,
      "kind": "hostel",
      "website": "https://ninehours.co.jp/narita",
      "phone": "+81 476-33-5109",
      "osm": "https://www.openstreetmap.org/node/6697588429"
    },
    {
      "name": "成田エアポートレストハウス",
      "nameEn": "Narita Airport Resthouse",
      "lat": 35.76798,
      "lng": 140.38604,
      "distanceKm": 0.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/1760540522"
    },
    {
      "name": "木の根ペンション",
      "nameEn": "Kinone pension",
      "lat": 35.76095,
      "lng": 140.39234,
      "distanceKm": 1.2,
      "kind": "hostel",
      "website": "https://www.facebook.com/profile.php?id=100054387255929",
      "osm": "https://www.openstreetmap.org/way/236511696"
    },
    {
      "name": "Toyoko Inn Narita Airport",
      "nameEn": "Toyoko Inn",
      "lat": 35.7815,
      "lng": 140.38396,
      "distanceKm": 1.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/9421753409"
    },
    {
      "name": "東横イン",
      "nameEn": "Toyoko Inn",
      "lat": 35.78156,
      "lng": 140.38394,
      "distanceKm": 1.3,
      "kind": "hotel",
      "website": "https://www.toyoko-inn.com/index.php/search/detail/00288.html",
      "phone": "0476-33-1045",
      "osm": "https://www.openstreetmap.org/way/321577096"
    },
    {
      "name": "東横INN成田空港本館",
      "nameEn": "Toyoko Inn Narita Airport Honkan",
      "lat": 35.78212,
      "lng": 140.38423,
      "distanceKm": 1.4,
      "kind": "hotel",
      "website": "https://www.toyoko-inn.com/search/detail/00037",
      "phone": "0476-33-0451",
      "osm": "https://www.openstreetmap.org/way/163386831"
    },
    {
      "name": "成田東武ホテルエアポート",
      "nameEn": "Narita Tobu Hotel Airport",
      "lat": 35.78012,
      "lng": 140.3805,
      "distanceKm": 1.4,
      "kind": "hotel",
      "website": "https://www.tobuhotel.co.jp/narita/",
      "phone": "+81 47 632 1234",
      "osm": "https://www.openstreetmap.org/way/321579468"
    },
    {
      "name": "東横イン",
      "nameEn": "Toyoko Inn",
      "lat": 35.78229,
      "lng": 140.38456,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1021555403"
    },
    {
      "name": "ホテル日航成田",
      "nameEn": "Hotel Nikko Narita",
      "lat": 35.7842,
      "lng": 140.37962,
      "distanceKm": 1.8,
      "kind": "hotel",
      "website": "https://www.nikko-narita.com/",
      "phone": "+81 476-32-0032",
      "osm": "https://www.openstreetmap.org/way/321575118"
    },
    {
      "name": "マロウドインターナショナルホテル成田",
      "nameEn": "Marroad International Hotel Narita",
      "lat": 35.77878,
      "lng": 140.37304,
      "distanceKm": 1.9,
      "kind": "hotel",
      "website": "https://www.marroad.jp/narita/",
      "phone": "+81476302222",
      "osm": "https://www.openstreetmap.org/way/321579466"
    }
  ],
  ORY: [
    {
      "name": "Orly Surperior",
      "lat": 48.71572,
      "lng": 2.36911,
      "distanceKm": 1.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/1170488911"
    },
    {
      "name": "ibis budget Paris Coeur d'Orly Airport",
      "lat": 48.7316,
      "lng": 2.37192,
      "distanceKm": 1.1,
      "kind": "hotel",
      "website": "https://all.accor.com",
      "osm": "https://www.openstreetmap.org/node/5368815921"
    },
    {
      "name": "ibis Paris Cœur d'Orly Airport",
      "lat": 48.73143,
      "lng": 2.37011,
      "distanceKm": 1.1,
      "kind": "hotel",
      "website": "https://all.accor.com",
      "osm": "https://www.openstreetmap.org/node/11256413823"
    },
    {
      "name": "Kyriad Hôtel Orly Aéroport - Athis Mons",
      "lat": 48.71545,
      "lng": 2.36947,
      "distanceKm": 1.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/70235039"
    },
    {
      "name": "Novotel Paris Coeur d'Orly Airport",
      "lat": 48.7318,
      "lng": 2.37042,
      "distanceKm": 1.2,
      "kind": "hotel",
      "website": "https://all.accor.com/hotel/7327/index.en.shtml",
      "phone": "+33 1 83 30 00 30",
      "stars": 2,
      "osm": "https://www.openstreetmap.org/way/143316928"
    },
    {
      "name": "Howard",
      "lat": 48.7134,
      "lng": 2.37077,
      "distanceKm": 1.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/3316967645"
    },
    {
      "name": "Hôtel de la Gare - Meublés",
      "lat": 48.71241,
      "lng": 2.40252,
      "distanceKm": 2.1,
      "kind": "hotel",
      "phone": "+33 1 69 38 43 50",
      "osm": "https://www.openstreetmap.org/node/845949155"
    },
    {
      "name": "Hôtel la Rotonde",
      "lat": 48.70422,
      "lng": 2.37435,
      "distanceKm": 2.2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/632216045"
    },
    {
      "name": "Hôtel Rotonde",
      "lat": 48.70636,
      "lng": 2.36308,
      "distanceKm": 2.2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5435540685"
    },
    {
      "name": "Hôtel Mercure Paris Orly Airport",
      "nameEn": "Mercure Hotel",
      "lat": 48.74054,
      "lng": 2.36208,
      "distanceKm": 2.3,
      "kind": "hotel",
      "website": "https://all.accor.com/hotel/1246/index.fr.shtml",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/248571383"
    }
  ],
  OVB: [
    {
      "name": "GettSleep",
      "lat": 55.00992,
      "lng": 82.66804,
      "distanceKm": 1.1,
      "kind": "hotel",
      "website": "https://gettsleep.com",
      "phone": "+7 983 1340220",
      "osm": "https://www.openstreetmap.org/node/11958269378"
    },
    {
      "name": "SkyPort",
      "lat": 55.00581,
      "lng": 82.66726,
      "distanceKm": 1.3,
      "kind": "hotel",
      "website": "https://www.skyport.su/",
      "phone": "+7 383 2169065",
      "osm": "https://www.openstreetmap.org/way/133963162"
    },
    {
      "name": "6-12-24",
      "lat": 55.00801,
      "lng": 82.67304,
      "distanceKm": 1.5,
      "kind": "hotel",
      "website": "https://6-12-24.ru/",
      "phone": "+7 383 3832205",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/4767291721"
    }
  ],
  PEK: [
    {
      "name": "ELONG R.YUN (Beijing Capital Airport Branch)",
      "lat": 40.07527,
      "lng": 116.58093,
      "distanceKm": 2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/652350984"
    },
    {
      "name": "空港世纪商务酒店",
      "nameEn": "Sky House Business Hotel",
      "lat": 40.06568,
      "lng": 116.58749,
      "distanceKm": 2.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4845202621"
    },
    {
      "name": "宜必思 尚品酒店",
      "lat": 40.06953,
      "lng": 116.58279,
      "distanceKm": 2.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/8785238392"
    },
    {
      "name": "北京空港远航国际酒店",
      "nameEn": "Yuanhang International Hotel",
      "lat": 40.06141,
      "lng": 116.58044,
      "distanceKm": 2.8,
      "kind": "hotel",
      "phone": "+86 10 8416 6060",
      "osm": "https://www.openstreetmap.org/way/784384698"
    },
    {
      "name": "豪雅商务酒店",
      "nameEn": "Haoya Hotel",
      "lat": 40.06212,
      "lng": 116.57963,
      "distanceKm": 2.8,
      "kind": "hotel",
      "phone": "+86 10 6453 3388",
      "osm": "https://www.openstreetmap.org/way/784384699"
    },
    {
      "name": "宜必思酒店",
      "nameEn": "Ibis Hotel",
      "lat": 40.06116,
      "lng": 116.57942,
      "distanceKm": 2.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4193755605"
    },
    {
      "name": "如家快捷酒店 北京首都机场府前街店",
      "nameEn": "Homeinns Inn Beijing Capital Airport",
      "lat": 40.06008,
      "lng": 116.57913,
      "distanceKm": 3,
      "kind": "hotel",
      "website": "http://homeinns.com",
      "phone": "+86 10 5213 6699",
      "osm": "https://www.openstreetmap.org/node/5583479223"
    },
    {
      "name": "北京明豪戴斯酒店",
      "lat": 40.06163,
      "lng": 116.5749,
      "distanceKm": 3.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/297681955"
    },
    {
      "name": "速8酒店",
      "nameEn": "Super 8",
      "lat": 40.06172,
      "lng": 116.57009,
      "distanceKm": 3.5,
      "kind": "motel",
      "website": "http://www.super8.com.cn",
      "osm": "https://www.openstreetmap.org/node/4769094807"
    },
    {
      "name": "北京首都机场东海康得思酒店",
      "nameEn": "Langham Hotel",
      "lat": 40.04743,
      "lng": 116.60722,
      "distanceKm": 3.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/243912563"
    }
  ],
  PKX: [
    {
      "name": "北京遨途机场酒店",
      "nameEn": "Aerotel Beijing",
      "lat": 39.51228,
      "lng": 116.4142,
      "distanceKm": 0.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/7035172196"
    },
    {
      "name": "北京大兴国际机场木棉花酒店",
      "nameEn": "Mumian Beijing Daxing International Airport",
      "lat": 39.51327,
      "lng": 116.40885,
      "distanceKm": 0.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/11028953405"
    },
    {
      "name": "北京明珠酒店（北京大兴机场店)",
      "nameEn": "Beijing CSN Pearl Hotel",
      "lat": 39.51974,
      "lng": 116.40463,
      "distanceKm": 1.2,
      "kind": "hotel",
      "phone": "+861057045888",
      "osm": "https://www.openstreetmap.org/node/12321838501"
    },
    {
      "name": "万豪酒店",
      "nameEn": "Marriott",
      "lat": 39.52449,
      "lng": 116.40413,
      "distanceKm": 1.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12095910101"
    }
  ],
  PRG: [
    {
      "name": "Courtyard Prague Airport",
      "lat": 50.10655,
      "lng": 14.26963,
      "distanceKm": 0.9,
      "kind": "hotel",
      "website": "https://www.marriott.com/hotels/travel/prgpa-courtyard-prague-airport/",
      "phone": "+420 236 077 077",
      "osm": "https://www.openstreetmap.org/way/27043732"
    },
    {
      "name": "Holiday Inn Prague Airport",
      "lat": 50.10854,
      "lng": 14.27697,
      "distanceKm": 1.5,
      "kind": "hotel",
      "website": "https://www.hipragueairport.com/",
      "phone": "+420 236 161 111",
      "osm": "https://www.openstreetmap.org/node/809702717"
    },
    {
      "name": "Ramada Airport Hotel Praha",
      "lat": 50.09975,
      "lng": 14.28667,
      "distanceKm": 1.9,
      "kind": "hotel",
      "website": "http://www.hotel-ramada-airport.info/",
      "osm": "https://www.openstreetmap.org/node/860259139"
    },
    {
      "name": "Domov důchodců",
      "lat": 50.08059,
      "lng": 14.25902,
      "distanceKm": 2.2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/599496053"
    },
    {
      "name": "Hostel Modra",
      "lat": 50.09781,
      "lng": 14.29147,
      "distanceKm": 2.3,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/3166565075"
    },
    {
      "name": "Penzion Oto Plus",
      "nameEn": "Hostel Oto Plus",
      "lat": 50.11643,
      "lng": 14.29846,
      "distanceKm": 3.2,
      "kind": "hostel",
      "website": "http://otoplus.cz",
      "phone": "+420737823135",
      "osm": "https://www.openstreetmap.org/node/296640045"
    },
    {
      "name": "Sporthotel Hostivice Břve",
      "lat": 50.06877,
      "lng": 14.24907,
      "distanceKm": 3.6,
      "kind": "hotel",
      "website": "https://www.sporthotelhostivice.cz/",
      "phone": "+420 777 813 241",
      "osm": "https://www.openstreetmap.org/node/2816963325"
    },
    {
      "name": "Sporthostel Scandinavia",
      "lat": 50.08204,
      "lng": 14.3081,
      "distanceKm": 4,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/296688449"
    },
    {
      "name": "Skyhotel Prague",
      "lat": 50.08146,
      "lng": 14.30877,
      "distanceKm": 4.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/28568596"
    },
    {
      "name": "Meritum",
      "lat": 50.08093,
      "lng": 14.31111,
      "distanceKm": 4.3,
      "kind": "hotel",
      "website": "https://www.hotelmeritum.com/",
      "phone": "+420 235 007 711",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/346200182"
    }
  ],
  PVG: [
    {
      "name": "InterContinental （建设中）",
      "nameEn": "InterContinental (U/C)",
      "lat": 31.14943,
      "lng": 121.80195,
      "distanceKm": 0.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1088983813"
    },
    {
      "name": "假日酒店",
      "nameEn": "Holiday Inn",
      "lat": 31.14993,
      "lng": 121.80365,
      "distanceKm": 0.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1088983814"
    },
    {
      "name": "大众空港宾馆",
      "nameEn": "Dazhong Airport Hotel",
      "lat": 31.15244,
      "lng": 121.80175,
      "distanceKm": 1.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/469352263"
    },
    {
      "name": "华美达广场酒店",
      "nameEn": "Ramada Plaza Shanghai Pudong Airport",
      "lat": 31.16276,
      "lng": 121.79476,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4250069748"
    },
    {
      "name": "锦江之星酒店",
      "nameEn": "Holiday Inn Express Shanghai Pudong Airport",
      "lat": 31.17515,
      "lng": 121.79075,
      "distanceKm": 3.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4345824489"
    },
    {
      "name": "锦江之星酒店",
      "lat": 31.17933,
      "lng": 121.78462,
      "distanceKm": 4.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/457036357"
    },
    {
      "name": "上海航空酒店",
      "lat": 31.18067,
      "lng": 121.78225,
      "distanceKm": 4.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5594951709"
    },
    {
      "name": "景悦99客栈 施湾店",
      "nameEn": "Jingyue 99 Inn",
      "lat": 31.15836,
      "lng": 121.75617,
      "distanceKm": 5.2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/170173140"
    },
    {
      "name": "如家精选",
      "lat": 31.14625,
      "lng": 121.75094,
      "distanceKm": 5.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12124021521"
    },
    {
      "name": "易陌良品酒店",
      "lat": 31.14269,
      "lng": 121.74811,
      "distanceKm": 5.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1218481045"
    }
  ],
  SAW: [
    {
      "name": "Cevvo",
      "lat": 40.91137,
      "lng": 29.30603,
      "distanceKm": 1.4,
      "kind": "hotel",
      "website": "https://www.cevvohotel.com/",
      "phone": "+90 532 493 79 70",
      "osm": "https://www.openstreetmap.org/node/12666249668"
    },
    {
      "name": "Best Hotel Pendik",
      "lat": 40.90787,
      "lng": 29.29202,
      "distanceKm": 1.8,
      "kind": "hotel",
      "website": "https://besthotelpendik.com/",
      "phone": "+905365753613",
      "osm": "https://www.openstreetmap.org/node/13815605869"
    },
    {
      "name": "Zoom Hotel",
      "lat": 40.91299,
      "lng": 29.29782,
      "distanceKm": 1.9,
      "kind": "hotel",
      "website": "https://zoomhotelistanbul.com",
      "osm": "https://www.openstreetmap.org/node/10124740626"
    },
    {
      "name": "Skyport İstanbul Hotel",
      "lat": 40.91509,
      "lng": 29.30296,
      "distanceKm": 1.9,
      "kind": "hotel",
      "website": "https://www.skyportistanbulhotel.com/",
      "phone": "+90 216 504 0 555",
      "osm": "https://www.openstreetmap.org/way/1125903678"
    },
    {
      "name": "Tevetoğlu Hotel",
      "lat": 40.91653,
      "lng": 29.30393,
      "distanceKm": 2,
      "kind": "hotel",
      "website": "https://tevetogluhotel.com/",
      "osm": "https://www.openstreetmap.org/node/12492125755"
    },
    {
      "name": "Arma Residence",
      "lat": 40.91831,
      "lng": 29.30327,
      "distanceKm": 2.2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/6246079855"
    },
    {
      "name": "216 Hill Suites",
      "lat": 40.90605,
      "lng": 29.28353,
      "distanceKm": 2.3,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1414411408"
    },
    {
      "name": "ibis Styles Kurtkoy",
      "lat": 40.91843,
      "lng": 29.30178,
      "distanceKm": 2.3,
      "kind": "hotel",
      "website": "https://all.accor.com/ssr/app/accor/rates/C196/index.en.shtml",
      "osm": "https://www.openstreetmap.org/way/1421202970"
    },
    {
      "name": "Teknosports Otel",
      "lat": 40.92026,
      "lng": 29.31596,
      "distanceKm": 2.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/9160957247"
    },
    {
      "name": "Radisson Blu Hotel & Spa",
      "lat": 40.87612,
      "lng": 29.3158,
      "distanceKm": 2.6,
      "kind": "hotel",
      "stars": 5,
      "osm": "https://www.openstreetmap.org/node/5899212638"
    }
  ],
  SGN: [
    {
      "name": "K&T hotel Sân Bay TSN-150m Từ Nhà Ga T3",
      "lat": 10.80699,
      "lng": 106.64802,
      "distanceKm": 1.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/13532747401"
    },
    {
      "name": "iBis Sai Gon Airport Hotel",
      "lat": 10.81317,
      "lng": 106.66593,
      "distanceKm": 1.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/9587309945"
    },
    {
      "name": "Thinh Gia Phat Hotel",
      "lat": 10.80483,
      "lng": 106.6475,
      "distanceKm": 1.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1273609118"
    },
    {
      "name": "Khách Sạn Ngọc Thanh Vân",
      "nameEn": "Ngoc Thanh Van Hotel",
      "lat": 10.82996,
      "lng": 106.64161,
      "distanceKm": 1.7,
      "kind": "hotel",
      "website": "http://xxx-perfume.vn",
      "phone": "0917824099",
      "osm": "https://www.openstreetmap.org/node/4682386491"
    },
    {
      "name": "Khách Sạn Green Ruby",
      "lat": 10.81101,
      "lng": 106.66651,
      "distanceKm": 1.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4259725089"
    },
    {
      "name": "The Airport Hotel",
      "lat": 10.80991,
      "lng": 106.66563,
      "distanceKm": 1.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12654268684"
    },
    {
      "name": "Ciao Saigon 2",
      "lat": 10.80973,
      "lng": 106.66567,
      "distanceKm": 1.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12654306229"
    },
    {
      "name": "Le Saigon Hotel",
      "lat": 10.80939,
      "lng": 106.66547,
      "distanceKm": 1.8,
      "kind": "hotel",
      "website": "https://www.lesaigonhotel.com/",
      "phone": "+842838485873",
      "osm": "https://www.openstreetmap.org/way/1362893365"
    },
    {
      "name": "Khách Sạn Minh Tâm",
      "lat": 10.80215,
      "lng": 106.64714,
      "distanceKm": 1.9,
      "kind": "hotel",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/5021248568"
    },
    {
      "name": "Khách Sạn Uyên Anh",
      "lat": 10.81282,
      "lng": 106.66838,
      "distanceKm": 1.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5070470422"
    }
  ],
  SSH: [
    {
      "name": "Concorde el salam Sport",
      "lat": 27.96983,
      "lng": 34.39648,
      "distanceKm": 0.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1013037588"
    },
    {
      "name": "Concorde Sport",
      "lat": 27.96862,
      "lng": 34.39714,
      "distanceKm": 1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/92930730"
    },
    {
      "name": "SunRise Garden",
      "lat": 27.96622,
      "lng": 34.3948,
      "distanceKm": 1.2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/99360777"
    },
    {
      "name": "Concorde",
      "lat": 27.96528,
      "lng": 34.39767,
      "distanceKm": 1.4,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/5820520957"
    },
    {
      "name": "Sierra",
      "lat": 27.964,
      "lng": 34.39203,
      "distanceKm": 1.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/99360782"
    },
    {
      "name": "Concorde el Salam. Front area",
      "lat": 27.96418,
      "lng": 34.39921,
      "distanceKm": 1.5,
      "kind": "hotel",
      "stars": 5,
      "osm": "https://www.openstreetmap.org/way/1000785857"
    },
    {
      "name": "Royal Savoy",
      "lat": 27.96199,
      "lng": 34.39657,
      "distanceKm": 1.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/3025095554"
    },
    {
      "name": "Royal Savoy",
      "lat": 27.96155,
      "lng": 34.39715,
      "distanceKm": 1.8,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/298620429"
    },
    {
      "name": "Sunrise Remal Resort Main gate",
      "lat": 27.96931,
      "lng": 34.4139,
      "distanceKm": 2.1,
      "kind": "hotel",
      "website": "https://www.sunrise-resorts.com/",
      "osm": "https://www.openstreetmap.org/node/550261843"
    },
    {
      "name": "Sunrise Remal Resort",
      "lat": 27.96886,
      "lng": 34.41404,
      "distanceKm": 2.1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/196757060"
    }
  ],
  SVO: [
    {
      "name": "GettSleep",
      "lat": 55.97882,
      "lng": 37.41788,
      "distanceKm": 0.7,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/9965632644"
    },
    {
      "name": "Air Express Sheremetyevo",
      "lat": 55.96521,
      "lng": 37.41381,
      "distanceKm": 0.8,
      "kind": "hotel",
      "website": "https://v-exp.ru/",
      "osm": "https://www.openstreetmap.org/node/6388936743"
    },
    {
      "name": "GoSleep SVO Terminal E",
      "lat": 55.96415,
      "lng": 37.41291,
      "distanceKm": 0.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/7210747700"
    },
    {
      "name": "GettSleep",
      "lat": 55.96352,
      "lng": 37.4153,
      "distanceKm": 1,
      "kind": "hotel",
      "phone": "+7 926 4955554",
      "osm": "https://www.openstreetmap.org/node/6800063200"
    },
    {
      "name": "Vozdushnyy Ekspress",
      "lat": 55.96404,
      "lng": 37.41381,
      "distanceKm": 1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/7210747699"
    },
    {
      "name": "Aerosleep",
      "lat": 55.96353,
      "lng": 37.40996,
      "distanceKm": 1,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/7234528017"
    },
    {
      "name": "GettSleep",
      "lat": 55.96323,
      "lng": 37.40862,
      "distanceKm": 1.1,
      "kind": "hotel",
      "phone": "+7 926 4955554",
      "osm": "https://www.openstreetmap.org/node/6746266648"
    },
    {
      "name": "Cosmos",
      "lat": 55.96306,
      "lng": 37.41335,
      "distanceKm": 1.1,
      "kind": "hotel",
      "website": "https://cosmosgroup.ru",
      "phone": "+7 495 2803410;+7 495 2803420;+7 800 7077764",
      "osm": "https://www.openstreetmap.org/way/265560885"
    },
    {
      "name": "Russian Sky",
      "lat": 55.96169,
      "lng": 37.41077,
      "distanceKm": 1.2,
      "kind": "hotel",
      "website": "http://hotel-russky.ru",
      "phone": "+7 495 2263655",
      "osm": "https://www.openstreetmap.org/node/5624028382"
    },
    {
      "name": "Novotel",
      "lat": 55.96228,
      "lng": 37.41613,
      "distanceKm": 1.2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/48715707"
    }
  ],
  SVX: [
    {
      "name": "Azimut",
      "lat": 56.7509,
      "lng": 60.7989,
      "distanceKm": 0.9,
      "kind": "hotel",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/node/538132088"
    },
    {
      "name": "Лайнер",
      "lat": 56.751,
      "lng": 60.80846,
      "distanceKm": 0.9,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/561044847"
    },
    {
      "name": "Черника",
      "lat": 56.71504,
      "lng": 60.82925,
      "distanceKm": 3.5,
      "kind": "hotel",
      "website": "https://hotel-chernika.ru/",
      "phone": "+7(343)3895505",
      "osm": "https://www.openstreetmap.org/node/5363528551"
    },
    {
      "name": "Максим",
      "lat": 56.71543,
      "lng": 60.82954,
      "distanceKm": 3.5,
      "kind": "motel",
      "website": "https://maksimhotels.com/",
      "phone": "+7 343 3899277;+7 922 0264005",
      "osm": "https://www.openstreetmap.org/node/8065696555"
    },
    {
      "name": "Кемпинг",
      "lat": 56.70542,
      "lng": 60.74419,
      "distanceKm": 5.5,
      "kind": "hotel",
      "website": "https://kemping-na-trakte.2gis.biz/",
      "phone": "+7 343 3709548;+7 953 6064449",
      "osm": "https://www.openstreetmap.org/node/1172587932"
    },
    {
      "name": "Гостиница на Тракте",
      "lat": 56.7057,
      "lng": 60.74377,
      "distanceKm": 5.5,
      "kind": "hotel",
      "phone": "+7 343 3709548;+7 953 6064449",
      "osm": "https://www.openstreetmap.org/node/5364530334"
    }
  ],
  TBS: [
    {
      "name": "იბის თბილისი აეროპორტში",
      "nameEn": "Ibis Tbilisi Airport",
      "lat": 41.67308,
      "lng": 44.96209,
      "distanceKm": 0.8,
      "kind": "hotel",
      "website": "https://all.accor.com/",
      "phone": "+995 32 210 24 24",
      "osm": "https://www.openstreetmap.org/node/13686588801"
    },
    {
      "name": "Murman (AZAL apartment)",
      "lat": 41.68239,
      "lng": 44.95217,
      "distanceKm": 1.5,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/4864740922"
    },
    {
      "name": "Hotel Lux",
      "lat": 41.69212,
      "lng": 44.96192,
      "distanceKm": 2.6,
      "kind": "hotel",
      "website": "https://hotel-lux.tbilisi-hotels.com/",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/6849223012"
    },
    {
      "name": "home",
      "lat": 41.67557,
      "lng": 44.90981,
      "distanceKm": 3.8,
      "kind": "apartment",
      "osm": "https://www.openstreetmap.org/node/5839736985"
    },
    {
      "name": "Kura",
      "lat": 41.65382,
      "lng": 44.90528,
      "distanceKm": 4.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/5025170260"
    },
    {
      "name": "გრანდი",
      "nameEn": "Grand",
      "lat": 41.68938,
      "lng": 44.90779,
      "distanceKm": 4.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/723358273"
    },
    {
      "name": "ევროლუქსი",
      "nameEn": "Eurolux",
      "lat": 41.67026,
      "lng": 44.89175,
      "distanceKm": 5.2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/12891723421"
    },
    {
      "name": "Eniseli",
      "lat": 41.68825,
      "lng": 44.89519,
      "distanceKm": 5.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/4128369453"
    },
    {
      "name": "Great Wall Hotel",
      "lat": 41.6885,
      "lng": 44.8943,
      "distanceKm": 5.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/13174342022"
    },
    {
      "name": "Golden House",
      "lat": 41.68682,
      "lng": 44.89076,
      "distanceKm": 5.7,
      "kind": "apartment",
      "website": "https://www.booking.com/hotel/ge/golden-house-tbilisi1.en-gb.html",
      "osm": "https://www.openstreetmap.org/node/6635731091"
    }
  ],
  TGD: [
    {
      "name": "Vila Radinović",
      "lat": 42.3597,
      "lng": 19.23072,
      "distanceKm": 1.7,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/6042725011"
    },
    {
      "name": "Ekonomic Apartmani",
      "lat": 42.37204,
      "lng": 19.22668,
      "distanceKm": 2.5,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/11052188599"
    }
  ],
  TIV: [
    {
      "name": "Apartments Bozinovic",
      "lat": 42.41657,
      "lng": 18.71884,
      "distanceKm": 1.4,
      "kind": "apartment",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/way/369157143"
    },
    {
      "name": "Montenegro Hostel",
      "lat": 42.41842,
      "lng": 18.72305,
      "distanceKm": 1.5,
      "kind": "hostel",
      "osm": "https://www.openstreetmap.org/node/1255280515"
    },
    {
      "name": "Apartments Bordo",
      "lat": 42.41806,
      "lng": 18.72261,
      "distanceKm": 1.5,
      "kind": "apartment",
      "stars": 1,
      "osm": "https://www.openstreetmap.org/node/3761640073"
    },
    {
      "name": "Apartments Mihalicek",
      "lat": 42.41944,
      "lng": 18.71664,
      "distanceKm": 1.7,
      "kind": "apartment",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/node/3761597223"
    },
    {
      "name": "Apartments Pelle",
      "lat": 42.41933,
      "lng": 18.72898,
      "distanceKm": 1.7,
      "kind": "apartment",
      "website": "http://www.booking.com/hotel/me/apartmani-pelle.sr.html?aid=304142;label=gen173nr-15CAEoggJCAlhYSDNiBW5vcmVmaMEBiAEBmAEkuAEEyAEE2AED6AEB;sid=9775c9d69e6e7b5882366773d658025e;dcid=4;no_rooms=1;req_adults=2;req_children=0&;atlas_src=hp_iw_title#map_closed",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/3761648708"
    },
    {
      "name": "Tivat Garden Apartments",
      "lat": 42.41884,
      "lng": 18.73019,
      "distanceKm": 1.7,
      "kind": "apartment",
      "website": "https://rentmyplace.me",
      "phone": "+38263288788",
      "osm": "https://www.openstreetmap.org/way/1392829527"
    },
    {
      "name": "Apartment Tivat Bonici",
      "lat": 42.41804,
      "lng": 18.71042,
      "distanceKm": 1.8,
      "kind": "apartment",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/3761463311"
    },
    {
      "name": "Apartment Marijana",
      "lat": 42.42004,
      "lng": 18.71596,
      "distanceKm": 1.8,
      "kind": "apartment",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/node/3761578941"
    },
    {
      "name": "Studio Apartments Petkovic",
      "lat": 42.42069,
      "lng": 18.72941,
      "distanceKm": 1.8,
      "kind": "apartment",
      "website": "https://www.booking.com/hotel/me/studio-apartments-petkovic.sr.html?aid=304142;label=gen173nr-15CAEoggJCAlhYSDNiBW5vcmVmaMEBiAEBmAEkuAEEyAEE2AED6AEB;sid=9775c9d69e6e7b5882366773d658025e;dcid=4;no_rooms=1;req_adults=2;req_children=0&;atlas_src=hp_iw_title",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/3761645947"
    },
    {
      "name": "Guesthouse Ivana",
      "lat": 42.42204,
      "lng": 18.72206,
      "distanceKm": 1.9,
      "kind": "guest_house",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/3761652046"
    }
  ],
  VCE: [
    {
      "name": "Parkhotel Annia",
      "lat": 45.50737,
      "lng": 12.33252,
      "distanceKm": 1.5,
      "kind": "hotel",
      "website": "https://www.anniaparkhotel.it/",
      "phone": "+39 041 5415200",
      "osm": "https://www.openstreetmap.org/node/4384948168"
    },
    {
      "name": "Dolce Laguna B&B",
      "lat": 45.5025,
      "lng": 12.3302,
      "distanceKm": 1.7,
      "kind": "guest_house",
      "website": "https://www.dolcelaguna.com/",
      "osm": "https://www.openstreetmap.org/node/6468709304"
    },
    {
      "name": "Venice Lagoon House B&B",
      "lat": 45.50139,
      "lng": 12.32629,
      "distanceKm": 2,
      "kind": "guest_house",
      "website": "http://www.venicelagoonhouse.com/",
      "phone": "+39 328 4774554",
      "osm": "https://www.openstreetmap.org/node/3674488671"
    },
    {
      "name": "Il Casolare",
      "lat": 45.52687,
      "lng": 12.35337,
      "distanceKm": 2.4,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/10961568634"
    },
    {
      "name": "Agriturismo Il Melograno",
      "lat": 45.50188,
      "lng": 12.30647,
      "distanceKm": 3.6,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/4239906090"
    },
    {
      "name": "Agriturismo Ca' Beatrice",
      "lat": 45.50417,
      "lng": 12.29869,
      "distanceKm": 4.1,
      "kind": "guest_house",
      "website": "https://www.agriturismocabeatrice.it/",
      "osm": "https://www.openstreetmap.org/node/12673541964"
    },
    {
      "name": "Lucy",
      "lat": 45.48806,
      "lng": 12.30173,
      "distanceKm": 4.4,
      "kind": "hotel",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/11123620467"
    },
    {
      "name": "B&B Rododendri Garden",
      "lat": 45.49383,
      "lng": 12.29627,
      "distanceKm": 4.5,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/node/4258395148"
    },
    {
      "name": "Antony Hotel",
      "lat": 45.48719,
      "lng": 12.29916,
      "distanceKm": 4.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/11818353161"
    },
    {
      "name": "B&B Dream",
      "lat": 45.53232,
      "lng": 12.30524,
      "distanceKm": 4.7,
      "kind": "guest_house",
      "osm": "https://www.openstreetmap.org/way/437132186"
    }
  ],
  VKO: [
    {
      "name": "Авион Внуково",
      "lat": 55.59249,
      "lng": 37.23076,
      "distanceKm": 1.9,
      "kind": "hotel",
      "website": "https://avion-vnk.ru",
      "phone": "+7(495) 409-77-88",
      "osm": "https://www.openstreetmap.org/node/5758822085"
    },
    {
      "name": "Aerosleep Capsule Hotel",
      "lat": 55.60604,
      "lng": 37.28588,
      "distanceKm": 2.2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1441876079"
    },
    {
      "name": "Relax Point",
      "lat": 55.60507,
      "lng": 37.2869,
      "distanceKm": 2.2,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/1441876081"
    },
    {
      "name": "DoubleTree by Hilton Moscow - Vnukovo Airport",
      "lat": 55.60609,
      "lng": 37.29115,
      "distanceKm": 2.5,
      "kind": "hotel",
      "website": "https://www.hilton.ru/hotels/doubletree-by-hilton-moscow-vnukovo-airport/?WT.mc_id=zvsEC0RU1DT2NaturalSearch3GoogleMyBusiness4luau-vnukovo_May5luau6VKOAPDI7EN8i1",
      "phone": "+7 495 4363737",
      "stars": 4,
      "osm": "https://www.openstreetmap.org/way/185229896"
    },
    {
      "name": "Filin House",
      "lat": 55.59532,
      "lng": 37.2184,
      "distanceKm": 2.7,
      "kind": "guest_house",
      "website": "https://apart-otel-filin-house.wintega.com",
      "phone": "+7 903 0099550",
      "osm": "https://www.openstreetmap.org/node/6890092981"
    },
    {
      "name": "РУС-Внуково",
      "lat": 55.60696,
      "lng": 37.29659,
      "distanceKm": 2.8,
      "kind": "hostel",
      "website": "http://hostelvnukovo.ru",
      "phone": "+7 499 3901812",
      "osm": "https://www.openstreetmap.org/node/4736152023"
    },
    {
      "name": "Астрохостел Рейс",
      "nameEn": "Astrohostel Reys",
      "lat": 55.60908,
      "lng": 37.29898,
      "distanceKm": 3.1,
      "kind": "hostel",
      "website": "https://astrohostel.com/",
      "phone": "89261001436",
      "osm": "https://www.openstreetmap.org/node/10254875809"
    },
    {
      "name": "Экипаж",
      "lat": 55.61279,
      "lng": 37.30086,
      "distanceKm": 3.4,
      "kind": "hotel",
      "website": "https://www.vnukovo.ru/vnukovo-hotels/ekipazh-hotel/",
      "phone": "+7 495 4367201",
      "stars": 3,
      "osm": "https://www.openstreetmap.org/node/2567311556"
    },
    {
      "name": "Барз-400",
      "lat": 55.61366,
      "lng": 37.30102,
      "distanceKm": 3.5,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/way/101061211"
    },
    {
      "name": "Уют",
      "lat": 55.60994,
      "lng": 37.32778,
      "distanceKm": 4.6,
      "kind": "hotel",
      "osm": "https://www.openstreetmap.org/node/665898478"
    }
  ],
};
