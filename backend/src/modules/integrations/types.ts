// Shared contracts for every external provider (hotels, flights, transport).
// An adapter that has no configured API key returns NOT_CONFIGURED — it must
// NEVER fabricate offers. Absent data is explicit, never guessed.

export type ProviderId =
  | 'booking'
  | 'agoda'
  | 'tripcom'
  | 'skyscanner'
  | 'twelvego'
  | 'yandex-travel'
  | 'expedia'
  // Трансферы: заказ машины к рейсу и обратно.
  | 'kiwitaxi'
  | 'gettransfer'
  // Аренда транспорта на месте.
  | 'localrent'
  // Карты и маршрутизация — не «предложения», но тот же слой интеграций:
  // без ключа фича молча прячется, а не показывает пустую карту.
  | 'maps';

export type OfferKind = 'HOTEL' | 'FLIGHT' | 'TRANSPORT' | 'TRANSFER' | 'RENTAL' | 'MAP';

export interface Money {
  amount: number;
  currency: string;
}

export interface Offer {
  provider: ProviderId;
  kind: OfferKind;
  title: string;
  price: Money;
  deepLink?: string;
  rating?: number;
  // provenance is mandatory on every real offer
  source: ProviderId;
  fetchedAt: string; // ISO
}

export type AdapterStatus = 'OK' | 'NOT_CONFIGURED' | 'ERROR';

export interface SearchResult {
  provider: ProviderId;
  status: AdapterStatus;
  offers: Offer[];
  message?: string; // e.g. "API key missing" — surfaced to the user as such
}

export interface HotelQuery {
  cityOrLat: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
}

export interface FlightQuery {
  from: string;
  to: string;
  date: string;
  passengers?: number;
}

export interface TransferQuery {
  /** Откуда: код аэропорта или название точки. */
  from: string;
  to: string;
  /** Дата и время подачи, ISO. */
  at: string;
  passengers?: number;
}

/**
 * Every provider implements this. Legal rule: official APIs with valid keys
 * only — no scraping, no ToS circumvention, robots.txt respected.
 */
export interface TravelAdapter {
  readonly id: ProviderId;
  readonly kinds: OfferKind[];
  isConfigured(): boolean;
  searchHotels?(q: HotelQuery): Promise<SearchResult>;
  searchFlights?(q: FlightQuery): Promise<SearchResult>;
  searchTransfers?(q: TransferQuery): Promise<SearchResult>;
}
