import { BaseAdapter } from './base.adapter';
import { OfferKind, ProviderId } from './types';

// One small class per provider. The TODO marks exactly where the official API
// call goes once a key + commercial agreement exist. No body fabricates offers.

class BookingAdapter extends BaseAdapter {
  readonly id: ProviderId = 'booking';
  readonly kinds: OfferKind[] = ['HOTEL'];
  protected readonly envKey = 'BOOKING_API_KEY';
  async searchHotels() {
    if (!this.isConfigured()) return this.notConfigured();
    // TODO: call Booking.com Demand API with this.envKey; map -> Offer[].
    return this.notConfigured();
  }
}

class AgodaAdapter extends BaseAdapter {
  readonly id: ProviderId = 'agoda';
  readonly kinds: OfferKind[] = ['HOTEL'];
  protected readonly envKey = 'AGODA_API_KEY';
  async searchHotels() {
    if (!this.isConfigured()) return this.notConfigured();
    return this.notConfigured();
  }
}

class TripComAdapter extends BaseAdapter {
  readonly id: ProviderId = 'tripcom';
  readonly kinds: OfferKind[] = ['HOTEL', 'FLIGHT'];
  protected readonly envKey = 'TRIPCOM_API_KEY';
  async searchHotels() {
    return this.isConfigured() ? this.notConfigured() : this.notConfigured();
  }
  async searchFlights() {
    return this.notConfigured();
  }
}

class SkyscannerAdapter extends BaseAdapter {
  readonly id: ProviderId = 'skyscanner';
  readonly kinds: OfferKind[] = ['FLIGHT'];
  protected readonly envKey = 'SKYSCANNER_API_KEY';
  async searchFlights() {
    return this.notConfigured();
  }
}

class TwelveGoAdapter extends BaseAdapter {
  readonly id: ProviderId = 'twelvego';
  readonly kinds: OfferKind[] = ['TRANSPORT'];
  protected readonly envKey = 'TWELVEGO_API_KEY';
}

class YandexTravelAdapter extends BaseAdapter {
  readonly id: ProviderId = 'yandex-travel';
  readonly kinds: OfferKind[] = ['HOTEL', 'FLIGHT'];
  protected readonly envKey = 'YANDEX_TRAVEL_API_KEY';
}

class ExpediaAdapter extends BaseAdapter {
  readonly id: ProviderId = 'expedia';
  readonly kinds: OfferKind[] = ['HOTEL', 'FLIGHT'];
  protected readonly envKey = 'EXPEDIA_API_KEY';
}

export const ALL_ADAPTERS = [
  new BookingAdapter(),
  new AgodaAdapter(),
  new TripComAdapter(),
  new SkyscannerAdapter(),
  new TwelveGoAdapter(),
  new YandexTravelAdapter(),
  new ExpediaAdapter(),
];
