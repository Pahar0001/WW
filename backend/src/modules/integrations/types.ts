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
  | 'expedia';

export type OfferKind = 'HOTEL' | 'FLIGHT' | 'TRANSPORT';

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
}
