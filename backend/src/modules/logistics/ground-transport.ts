/**
 * Транспорт внутри страны: чем реально перемещаются между городами.
 *
 * ⚠️ REAL DATA POLICY — ЧИТАТЬ ДО ПРАВКИ.
 *
 * Техзадание просило показывать для каждого варианта «стоимость, время,
 * удобство, ссылку». Стоимость и время НЕ ЗАПОЛНЕНЫ и заполняться выдуманными
 * значениями не должны: они зависят от даты, класса, направления и меняются в
 * разы, а §1 хендоффа прямо запрещает придумывать цены и время в пути.
 *
 * Поэтому здесь лежит то, что действительно устойчиво и проверяемо:
 *   — какой перевозчик возит (`operator`) и его ОФИЦИАЛЬНЫЙ адрес (`url`);
 *   — чего ждать по удобству (`comfort`) и что важно знать (`notes`).
 * Цену и время человек видит по ссылке, у самого перевозчика, на свою дату —
 * это честнее любой нашей таблицы и никогда не устаревает.
 *
 * Если появится источник с ценами (официальный API перевозчика), заполняйте
 * `priceNote` / `durationNote` ВМЕСТЕ с `source` и `sourceUrl` и меняйте
 * `dataStatus` на VERIFIED.
 */

export type TransportKind =
  | 'HIGH_SPEED_RAIL'
  | 'TRAIN'
  | 'BUS'
  | 'FLIGHT'
  | 'CAR'
  | 'TAXI'
  | 'TRANSFER'
  | 'FERRY';

export type Comfort = 'HIGH' | 'MEDIUM' | 'BASIC';

export interface TransportOption {
  kind: TransportKind;
  /** Короткое название варианта на языке пассажира. */
  title: string;
  /** Кто возит. */
  operator?: string;
  /** Официальный сайт или бронирование. */
  url?: string;
  comfort: Comfort;
  /** Что важно знать: где брать билет, какие есть подвохи. */
  notes: string;
  /** Заполнять ТОЛЬКО вместе с source/sourceUrl. */
  priceNote?: string;
  durationNote?: string;
  /** PENDING = цены и времени у нас нет, и это честно показано в интерфейсе. */
  dataStatus: 'VERIFIED' | 'ESTIMATED' | 'PENDING';
  source?: string;
  sourceUrl?: string;
}

const pending = (o: Omit<TransportOption, 'dataStatus'>): TransportOption => ({
  ...o,
  dataStatus: 'PENDING',
});

/** Транспорт внутри страны по слагу страны. */
export const GROUND_TRANSPORT: Record<string, TransportOption[]> = {
  tr: [
    pending({ kind: 'HIGH_SPEED_RAIL', title: 'Скоростные поезда YHT', operator: 'TCDD Taşımacılık', url: 'https://ebilet.tcddtasimacilik.gov.tr', comfort: 'HIGH', notes: 'Стамбул — Анкара — Конья. Билеты появляются примерно за месяц и на популярные даты разбираются.' }),
    pending({ kind: 'BUS', title: 'Междугородние автобусы', operator: 'Obilet (агрегатор перевозчиков)', url: 'https://www.obilet.com', comfort: 'MEDIUM', notes: 'Основной способ перемещения по стране: сеть плотнее железной дороги, автобусы ночные и с местами по выбору.' }),
    pending({ kind: 'FLIGHT', title: 'Внутренние рейсы', operator: 'Turkish Airlines, Pegasus, AJet', url: 'https://www.turkishairlines.com', comfort: 'HIGH', notes: 'Выручают на дальних плечах вроде Стамбул — Анталья или Стамбул — Каппадокия (Кайсери, Невшехир).' }),
    pending({ kind: 'CAR', title: 'Аренда автомобиля', comfort: 'HIGH', notes: 'Нужна для Каппадокии и побережья. Платные трассы работают по метке HGS — уточняйте её наличие у прокатчика.' }),
    pending({ kind: 'TAXI', title: 'Такси', operator: 'BiTaksi, Uber (в Стамбуле вызывает жёлтое такси)', url: 'https://bitaksi.com', comfort: 'MEDIUM', notes: 'Требуйте включённый счётчик (taksimetre). Договорная цена почти всегда выше.' }),
  ],
  ge: [
    pending({ kind: 'TRAIN', title: 'Поезда', operator: 'Грузинская железная дорога', url: 'https://railway.ge', comfort: 'MEDIUM', notes: 'Тбилиси — Батуми ходит дневной скоростной состав; удобнее и предсказуемее маршрутки.' }),
    pending({ kind: 'BUS', title: 'Маршрутки и автобусы', comfort: 'BASIC', notes: 'Отправляются по наполнению, а не по расписанию. Основной способ добраться в горные районы — Казбеги, Сванетию.' }),
    pending({ kind: 'CAR', title: 'Аренда автомобиля', comfort: 'HIGH', notes: 'Военно-Грузинская дорога и Сванетия — ради них и берут машину. Зимой на перевалах нужна зимняя резина.' }),
    pending({ kind: 'TAXI', title: 'Такси', operator: 'Bolt, Yandex Go', url: 'https://bolt.eu', comfort: 'MEDIUM', notes: 'В городах дешевле и понятнее уличного такси: цена известна заранее.' }),
    pending({ kind: 'TRANSFER', title: 'Трансфер из аэропорта', comfort: 'HIGH', notes: 'Имеет смысл для ночных прилётов в Кутаиси: общественный транспорт оттуда ходит редко.' }),
  ],
  am: [
    pending({ kind: 'BUS', title: 'Маршрутки и автобусы', comfort: 'BASIC', notes: 'Основной междугородний транспорт. Отправление с автовокзала Киликия в Ереване.' }),
    pending({ kind: 'CAR', title: 'Аренда автомобиля', comfort: 'HIGH', notes: 'Разумно для монастырей и Севана: они разбросаны, общественный транспорт туда неудобен.' }),
    pending({ kind: 'TAXI', title: 'Такси', operator: 'Yandex Go, GG', comfort: 'MEDIUM', notes: 'Дёшево по городу; на дальние поездки таксисты охотно берут договорной тариф на день.' }),
  ],
  az: [
    pending({ kind: 'TRAIN', title: 'Поезда', operator: 'Азербайджанские железные дороги', url: 'https://ady.az', comfort: 'MEDIUM', notes: 'Баку — Гянджа и ночной до Шеки.' }),
    pending({ kind: 'BUS', title: 'Автобусы', operator: 'BakuBus и междугородние перевозчики', comfort: 'MEDIUM', notes: 'Отправление с Бакинского международного автовокзала.' }),
    pending({ kind: 'TAXI', title: 'Такси', operator: 'Bolt, Uber', comfort: 'MEDIUM', notes: 'Фиолетовые «лондонские» такси в Баку — по счётчику.' }),
  ],
  kz: [
    pending({ kind: 'TRAIN', title: 'Поезда', operator: 'Казахстан темир жолы', url: 'https://bilet.railways.kz', comfort: 'MEDIUM', notes: 'Расстояния огромные: Алматы — Астана это ночь в пути. Есть скоростные «Тальго».' }),
    pending({ kind: 'FLIGHT', title: 'Внутренние рейсы', operator: 'Air Astana, FlyArystan, SCAT', url: 'https://airastana.com', comfort: 'HIGH', notes: 'На плечах больше тысячи километров практически безальтернативны по времени.' }),
    pending({ kind: 'CAR', title: 'Аренда автомобиля', comfort: 'HIGH', notes: 'Нужна для Чарына и Кольсая. Между городами — большие безлюдные перегоны, заправляйтесь заранее.' }),
    pending({ kind: 'TAXI', title: 'Такси', operator: 'Yandex Go, inDrive', comfort: 'MEDIUM', notes: 'inDrive с торгом за цену распространён именно здесь.' }),
  ],
  by: [
    pending({ kind: 'TRAIN', title: 'Поезда', operator: 'Белорусская железная дорога', url: 'https://pass.rw.by', comfort: 'MEDIUM', notes: 'Региональные линии бизнес-класса связывают Минск с Брестом, Гродно и Витебском.' }),
    pending({ kind: 'BUS', title: 'Автобусы', comfort: 'MEDIUM', notes: 'Удобны до Мира и Несвижа, куда поезд не идёт.' }),
    pending({ kind: 'TAXI', title: 'Такси', operator: 'Yandex Go', comfort: 'MEDIUM', notes: 'Работает в крупных городах.' }),
  ],
  th: [
    pending({ kind: 'FLIGHT', title: 'Внутренние рейсы', operator: 'Thai AirAsia, Nok Air, Bangkok Airways', url: 'https://www.airasia.com', comfort: 'MEDIUM', notes: 'Бангкок — Пхукет или Чиангмай: час вместо ночи в поезде. Лоукостеры летают из Дон Мыанга, не из Суварнабхуми.' }),
    pending({ kind: 'TRAIN', title: 'Поезда', operator: 'State Railway of Thailand', url: 'https://www.dticket.railway.co.th', comfort: 'MEDIUM', notes: 'Ночной поезд до Чиангмая — отдельное впечатление; спальные вагоны берут заранее.' }),
    pending({ kind: 'BUS', title: 'Автобусы и минивэны', comfort: 'BASIC', notes: 'Покрывают всё, включая переправы на острова единым билетом.' }),
    pending({ kind: 'FERRY', title: 'Паромы на острова', comfort: 'MEDIUM', notes: 'Самуи, Пханган, Пхи-Пхи. В сезон дождей рейсы отменяют по погоде.' }),
    pending({ kind: 'TAXI', title: 'Такси и мототакси', operator: 'Grab, Bolt', url: 'https://www.grab.com', comfort: 'MEDIUM', notes: 'В такси просите счётчик (meter). Grab показывает цену заранее.' }),
  ],
  ae: [
    pending({ kind: 'TRAIN', title: 'Метро Дубая', operator: 'RTA', url: 'https://www.rta.ae', comfort: 'HIGH', notes: 'Две линии вдоль главной оси города. Оплата картой Nol.' }),
    pending({ kind: 'BUS', title: 'Междугородние автобусы', operator: 'RTA', url: 'https://www.rta.ae', comfort: 'MEDIUM', notes: 'Дубай — Абу-Даби и Дубай — Шарджа ходят часто.' }),
    pending({ kind: 'CAR', title: 'Аренда автомобиля', comfort: 'HIGH', notes: 'Дороги отличные, но платные шлагбаумы Salik списываются с прокатчика — уточните тариф. Штрафы приходят долго.' }),
    pending({ kind: 'TAXI', title: 'Такси', operator: 'Careem, Uber, городское такси', url: 'https://www.careem.com', comfort: 'HIGH', notes: 'Городское такси по счётчику дешевле приложений.' }),
  ],
  eg: [
    pending({ kind: 'TRAIN', title: 'Поезда', operator: 'Egyptian National Railways', url: 'https://enr.gov.eg', comfort: 'MEDIUM', notes: 'Каир — Александрия и ночной спальный до Луксора и Асуана (отдельный оператор Watania).' }),
    pending({ kind: 'FLIGHT', title: 'Внутренние рейсы', operator: 'EgyptAir', url: 'https://www.egyptair.com', comfort: 'HIGH', notes: 'Каир — Хургада, Шарм, Луксор. Быстрая альтернатива долгой дороге.' }),
    pending({ kind: 'TRANSFER', title: 'Трансфер и экскурсионные автобусы', comfort: 'MEDIUM', notes: 'Между курортами и к достопримечательностям практикуются организованные группы.' }),
    pending({ kind: 'TAXI', title: 'Такси', operator: 'Uber, Careem', comfort: 'MEDIUM', notes: 'В Каире приложения избавляют от торга; уличное такси — только по договорённости заранее.' }),
  ],
  rs: [
    pending({ kind: 'TRAIN', title: 'Скоростной поезд Соко', operator: 'Srbija Voz', url: 'https://www.srbijavoz.rs', comfort: 'HIGH', notes: 'Белград — Нови-Сад — Суботица. Остальная сеть медленная.' }),
    pending({ kind: 'BUS', title: 'Автобусы', operator: 'BAS Beograd', url: 'https://www.bas.rs', comfort: 'MEDIUM', notes: 'Основной междугородний транспорт страны.' }),
    pending({ kind: 'TAXI', title: 'Такси', operator: 'CarGo', comfort: 'MEDIUM', notes: 'Пользуйтесь приложением или такси с логотипом — на вокзалах встречаются завышенные тарифы.' }),
  ],
  me: [
    pending({ kind: 'BUS', title: 'Автобусы', operator: 'Busticket4.me', url: 'https://busticket4.me', comfort: 'MEDIUM', notes: 'Вдоль побережья ходят часто: Будва, Котор, Херцег-Нови, Бар.' }),
    pending({ kind: 'TRAIN', title: 'Поезд Бар — Белград', operator: 'Željeznički prevoz Crne Gore', url: 'https://zpcg.me', comfort: 'BASIC', notes: 'Одна из самых зрелищных линий Европы — мост Мала-Риека.' }),
    pending({ kind: 'CAR', title: 'Аренда автомобиля', comfort: 'HIGH', notes: 'Дорога вокруг Которского залива и Дурмитор — ради них и берут. Летом в Которе тяжело с парковкой.' }),
    pending({ kind: 'FERRY', title: 'Паром Каменари — Лепетане', comfort: 'BASIC', notes: 'Срезает объезд Которского залива примерно на час.' }),
  ],
  jp: [
    pending({ kind: 'HIGH_SPEED_RAIL', title: 'Синкансэн', operator: 'JR Group', url: 'https://www.japan-guide.com/e/e2018.html', comfort: 'HIGH', notes: 'Токио — Киото — Осака. Japan Rail Pass окупается на нескольких дальних переездах — считайте заранее.' }),
    pending({ kind: 'TRAIN', title: 'Городские и пригородные поезда', operator: 'JR и частные линии', comfort: 'HIGH', notes: 'Карты Suica и Pasmo работают почти везде, включая автоматы и магазины.' }),
    pending({ kind: 'BUS', title: 'Ночные автобусы', operator: 'Willer Express', url: 'https://willerexpress.com', comfort: 'MEDIUM', notes: 'Заметно дешевле синкансэна, экономят ночь в отеле.' }),
    pending({ kind: 'TAXI', title: 'Такси', comfort: 'HIGH', notes: 'Очень дорогое по сравнению с поездом. Двери открываются автоматически — не трогайте их руками.' }),
  ],
  kr: [
    pending({ kind: 'HIGH_SPEED_RAIL', title: 'KTX', operator: 'Korail', url: 'https://www.letskorail.com', comfort: 'HIGH', notes: 'Сеул — Пусан примерно за два с половиной часа.' }),
    pending({ kind: 'TRAIN', title: 'Метро Сеула', comfort: 'HIGH', notes: 'Карта T-money оплачивает метро, автобусы и такси.' }),
    pending({ kind: 'BUS', title: 'Экспресс-автобусы', comfort: 'MEDIUM', notes: 'Есть «премиум» с креслами-кроватями.' }),
  ],
  id: [
    pending({ kind: 'CAR', title: 'Аренда авто с водителем', comfort: 'HIGH', notes: 'На Бали обычная практика на весь день — дешевле и спокойнее самостоятельного вождения.' }),
    pending({ kind: 'TAXI', title: 'Такси и мототакси', operator: 'Grab, Gojek', url: 'https://www.gojek.com', comfort: 'MEDIUM', notes: 'В части районов Бали приложения ограничены местными таксистскими объединениями.' }),
    pending({ kind: 'FERRY', title: 'Катера на острова', comfort: 'BASIC', notes: 'Нуса-Пенида, Гили, Ломбок. Море бывает неспокойным — берите утренние рейсы.' }),
    pending({ kind: 'FLIGHT', title: 'Внутренние рейсы', operator: 'Garuda, Lion Air, Citilink', comfort: 'MEDIUM', notes: 'Страна из тысяч островов: между крупными — только самолёт.' }),
  ],
  vn: [
    pending({ kind: 'TRAIN', title: 'Поезда', operator: 'Vietnam Railways', url: 'https://dsvn.vn', comfort: 'MEDIUM', notes: 'Линия вдоль побережья Ханой — Хошимин; участок Хюэ — Дананг считается одним из красивейших.' }),
    pending({ kind: 'FLIGHT', title: 'Внутренние рейсы', operator: 'Vietnam Airlines, VietJet', comfort: 'MEDIUM', notes: 'Страна вытянута на 1700 км — самолёт экономит сутки.' }),
    pending({ kind: 'BUS', title: 'Спальные автобусы', comfort: 'BASIC', notes: 'Дёшево, лежачие места; ночные переезды выматывают.' }),
    pending({ kind: 'TAXI', title: 'Такси', operator: 'Grab, Be', comfort: 'MEDIUM', notes: 'Уличное такси — только Mai Linh и Vinasun, остальные часто накручивают счётчик.' }),
  ],
  in: [
    pending({ kind: 'TRAIN', title: 'Поезда', operator: 'Indian Railways (IRCTC)', url: 'https://www.irctc.co.in', comfort: 'MEDIUM', notes: 'Классы от 1A до общего вагона; билеты разбирают за недели. Регистрация в IRCTC занимает время — делайте заранее.' }),
    pending({ kind: 'FLIGHT', title: 'Внутренние рейсы', operator: 'IndiGo, Air India', comfort: 'MEDIUM', notes: 'Дели — Гоа или Дели — Керала поездом это больше суток.' }),
    pending({ kind: 'CAR', title: 'Авто с водителем', comfort: 'HIGH', notes: 'Стандартный способ для «золотого треугольника». Самостоятельное вождение не рекомендуется.' }),
    pending({ kind: 'TAXI', title: 'Такси и рикши', operator: 'Ola, Uber', comfort: 'BASIC', notes: 'В приложении цена известна заранее — с рикшей придётся торговаться.' }),
  ],
  lk: [
    pending({ kind: 'TRAIN', title: 'Поезда', operator: 'Sri Lanka Railways', comfort: 'BASIC', notes: 'Участок Канди — Элла в горах — главный железнодорожный аттракцион страны. Места во втором классе бронируют заранее.' }),
    pending({ kind: 'CAR', title: 'Авто с водителем', comfort: 'HIGH', notes: 'Самый распространённый способ объехать остров.' }),
    pending({ kind: 'TAXI', title: 'Тук-туки', operator: 'PickMe', comfort: 'BASIC', notes: 'Приложение PickMe показывает цену и избавляет от торга.' }),
  ],
  mv: [
    pending({ kind: 'FERRY', title: 'Катера и общественные паромы', comfort: 'MEDIUM', notes: 'Трансфер до курорта организует сам отель — согласуйте его до покупки билетов: расписание катеров привязано к рейсам.' }),
    pending({ kind: 'FLIGHT', title: 'Гидросамолёты и внутренние рейсы', operator: 'Trans Maldivian Airways, Maldivian', comfort: 'HIGH', notes: 'До дальних атоллов только так. Гидросамолёты летают ТОЛЬКО засветло — ночной прилёт означает ночь в Мале.' }),
  ],
  it: [
    pending({ kind: 'HIGH_SPEED_RAIL', title: 'Скоростные поезда', operator: 'Trenitalia, Italo', url: 'https://www.trenitalia.com', comfort: 'HIGH', notes: 'Рим — Флоренция — Милан. Чем раньше берёте, тем дешевле; региональные поезда нужно компостировать.' }),
    pending({ kind: 'TRAIN', title: 'Региональные поезда', operator: 'Trenitalia', comfort: 'MEDIUM', notes: 'Единственный разумный способ объехать Чинкве-Терре.' }),
    pending({ kind: 'CAR', title: 'Аренда автомобиля', comfort: 'HIGH', notes: 'Нужна для Тосканы. ⚠️ В центрах городов действуют зоны ZTL — въезд туда означает штраф, приходящий через месяцы.' }),
    pending({ kind: 'FERRY', title: 'Паромы', comfort: 'MEDIUM', notes: 'Сицилия, Сардиния, острова Неаполитанского залива.' }),
  ],
  fr: [
    pending({ kind: 'HIGH_SPEED_RAIL', title: 'TGV', operator: 'SNCF', url: 'https://www.sncf-connect.com', comfort: 'HIGH', notes: 'Париж — Лион — Марсель. Тарифы растут по мере приближения даты.' }),
    pending({ kind: 'BUS', title: 'Автобусы', operator: 'BlaBlaCar Bus, FlixBus', url: 'https://www.flixbus.fr', comfort: 'MEDIUM', notes: 'Дешевле поезда, дольше в пути.' }),
    pending({ kind: 'CAR', title: 'Аренда автомобиля', comfort: 'HIGH', notes: 'Ради замков Луары и Прованса. Автомагистрали платные.' }),
  ],
  es: [
    pending({ kind: 'HIGH_SPEED_RAIL', title: 'AVE', operator: 'Renfe', url: 'https://www.renfe.com', comfort: 'HIGH', notes: 'Мадрид — Барселона — Севилья. Конкуренты Ouigo и Iryo бывают заметно дешевле.' }),
    pending({ kind: 'BUS', title: 'Автобусы', operator: 'ALSA', url: 'https://www.alsa.es', comfort: 'MEDIUM', notes: 'Покрывают то, куда не идёт скоростная железная дорога.' }),
    pending({ kind: 'CAR', title: 'Аренда автомобиля', comfort: 'HIGH', notes: 'Андалусия и белые деревни удобнее на машине.' }),
  ],
  de: [
    pending({ kind: 'HIGH_SPEED_RAIL', title: 'ICE', operator: 'Deutsche Bahn', url: 'https://www.bahn.de', comfort: 'HIGH', notes: 'Тариф Sparpreis при раннем бронировании кратно дешевле цены в день поездки.' }),
    pending({ kind: 'TRAIN', title: 'Региональные поезда', operator: 'Deutsche Bahn', comfort: 'MEDIUM', notes: 'Единый месячный билет Deutschlandticket действует на региональном транспорте по всей стране.' }),
    pending({ kind: 'BUS', title: 'Автобусы', operator: 'FlixBus', url: 'https://www.flixbus.de', comfort: 'MEDIUM', notes: 'Самый дешёвый междугородний вариант.' }),
  ],
  gr: [
    pending({ kind: 'FERRY', title: 'Паромы на острова', operator: 'Blue Star, Hellenic Seaways', comfort: 'MEDIUM', notes: 'Главный транспорт страны. В штормовую погоду рейсы отменяют — не ставьте перелёт домой сразу после парома.' }),
    pending({ kind: 'BUS', title: 'Автобусы KTEL', comfort: 'MEDIUM', notes: 'Материковая сеть: Дельфы, Метеора, Пелопоннес.' }),
    pending({ kind: 'FLIGHT', title: 'Внутренние рейсы', operator: 'Aegean, Sky Express', comfort: 'HIGH', notes: 'До дальних островов быстрее парома в разы.' }),
  ],
  cz: [
    pending({ kind: 'TRAIN', title: 'Поезда', operator: 'České dráhy, RegioJet', url: 'https://www.cd.cz', comfort: 'MEDIUM', notes: 'Прага — Брно — Острава. RegioJet удобен и дёшев.' }),
    pending({ kind: 'BUS', title: 'Автобусы', operator: 'RegioJet, FlixBus', url: 'https://regiojet.com', comfort: 'MEDIUM', notes: 'До Чешского Крумлова и Карловых Вар быстрее поезда.' }),
  ],
  hu: [
    pending({ kind: 'TRAIN', title: 'Поезда', operator: 'MÁV', url: 'https://www.mavcsoport.hu', comfort: 'MEDIUM', notes: 'Будапешт — Дебрецен, Печ, Балатон.' }),
    pending({ kind: 'BUS', title: 'Автобусы', operator: 'Volánbusz', comfort: 'MEDIUM', notes: 'Дополняют железную дорогу на коротких плечах.' }),
  ],
  us: [
    pending({ kind: 'FLIGHT', title: 'Внутренние рейсы', operator: 'Delta, United, American, Southwest', comfort: 'MEDIUM', notes: 'Основной междугородний транспорт: расстояния делают поезд неконкурентным.' }),
    pending({ kind: 'CAR', title: 'Аренда автомобиля', comfort: 'HIGH', notes: 'За пределами крупных городов без машины почти невозможно. Права РФ обычно требуют международного водительского удостоверения.' }),
    pending({ kind: 'TRAIN', title: 'Amtrak', operator: 'Amtrak', url: 'https://www.amtrak.com', comfort: 'MEDIUM', notes: 'Разумен на Северо-Востоке: Бостон — Нью-Йорк — Вашингтон.' }),
  ],
  gb: [
    pending({ kind: 'TRAIN', title: 'Поезда', operator: 'National Rail', url: 'https://www.nationalrail.co.uk', comfort: 'HIGH', notes: 'Билет заранее (advance) в разы дешевле билета в день поездки. Railcard окупается за две поездки.' }),
    pending({ kind: 'BUS', title: 'Автобусы', operator: 'National Express, Megabus', comfort: 'MEDIUM', notes: 'Самый дешёвый способ, вдвое дольше поезда.' }),
    pending({ kind: 'CAR', title: 'Аренда автомобиля', comfort: 'HIGH', notes: 'Ради Шотландского высокогорья и Корнуолла. ⚠️ Левостороннее движение.' }),
  ],
  cn: [
    pending({ kind: 'HIGH_SPEED_RAIL', title: 'Скоростные поезда', operator: 'China Railway', url: 'https://www.12306.cn', comfort: 'HIGH', notes: 'Крупнейшая сеть в мире: Пекин — Шанхай примерно за четыре с половиной часа. Билет по загранпаспорту, посадка по нему же.' }),
    pending({ kind: 'FLIGHT', title: 'Внутренние рейсы', operator: 'Air China, China Eastern, China Southern', comfort: 'MEDIUM', notes: 'Нужны на плечах, где нет скоростной ветки.' }),
    pending({ kind: 'TAXI', title: 'Такси', operator: 'DiDi', comfort: 'MEDIUM', notes: 'Оплата почти везде через Alipay или WeChat Pay — привяжите карту до поездки, наличные принимают неохотно.' }),
    pending({ kind: 'TRAIN', title: 'Метро', comfort: 'HIGH', notes: 'Есть во всех крупных городах, указатели дублируются латиницей.' }),
  ],
  ru: [
    pending({ kind: 'HIGH_SPEED_RAIL', title: '«Сапсан» и скоростные поезда', operator: 'РЖД', url: 'https://www.rzd.ru', comfort: 'HIGH', notes: 'Москва — Санкт-Петербург примерно за четыре часа.' }),
    pending({ kind: 'TRAIN', title: 'Поезда дальнего следования', operator: 'РЖД', url: 'https://www.rzd.ru', comfort: 'MEDIUM', notes: 'Ночной переезд экономит день и стоимость ночи в гостинице.' }),
    pending({ kind: 'FLIGHT', title: 'Внутренние рейсы', operator: 'Аэрофлот, «Победа», S7', comfort: 'MEDIUM', notes: 'За Уралом альтернатив по времени нет.' }),
    pending({ kind: 'TAXI', title: 'Такси', operator: 'Яндекс Go', comfort: 'MEDIUM', notes: 'Работает практически во всех городах.' }),
  ],
};

// Флагманский маршрут по Китаю живёт под собственным слагом — справочник тот же.
GROUND_TRANSPORT.china = GROUND_TRANSPORT.cn;
GROUND_TRANSPORT.rossiya = GROUND_TRANSPORT.ru;

export const groundTransport = (countrySlug: string): TransportOption[] =>
  GROUND_TRANSPORT[countrySlug] ?? [];
