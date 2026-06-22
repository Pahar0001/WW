import {
  AdapterStatus,
  OfferKind,
  ProviderId,
  SearchResult,
  TravelAdapter,
} from './types';

/**
 * Base for all provider adapters. Until a real API key is present and the live
 * call is implemented, every adapter reports NOT_CONFIGURED and returns zero
 * offers. This guarantees the platform never shows invented prices.
 */
export abstract class BaseAdapter implements TravelAdapter {
  abstract readonly id: ProviderId;
  abstract readonly kinds: OfferKind[];
  protected abstract readonly envKey: string;

  isConfigured(): boolean {
    return Boolean(process.env[this.envKey]);
  }

  protected notConfigured(): SearchResult {
    return {
      provider: this.id,
      status: 'NOT_CONFIGURED' as AdapterStatus,
      offers: [],
      message: `${this.id}: API key (${this.envKey}) not set — no data shown rather than fake data.`,
    };
  }
}
