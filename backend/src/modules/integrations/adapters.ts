import { BaseAdapter } from './base.adapter';
import { OfferKind, ProviderId, TravelAdapter } from './types';

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

// ── Трансферы, аренда и карты ──────────────────────────────────────────────
// Появились вместе с разделом «Логистика путешествия»: там нужны заказ машины
// к рейсу, аренда на месте и построение маршрута. Реализации нет ни у одного —
// без ключа и коммерческого договора адаптер обязан говорить NOT_CONFIGURED,
// а не показывать выдуманные цены.

class KiwitaxiAdapter extends BaseAdapter {
  readonly id: ProviderId = 'kiwitaxi';
  readonly kinds: OfferKind[] = ['TRANSFER'];
  protected readonly envKey = 'KIWITAXI_API_KEY';
  async searchTransfers() {
    if (!this.isConfigured()) return this.notConfigured();
    // TODO: партнёрский API Kiwitaxi → Offer[] с kind TRANSFER.
    return this.notConfigured();
  }
}

class GetTransferAdapter extends BaseAdapter {
  readonly id: ProviderId = 'gettransfer';
  readonly kinds: OfferKind[] = ['TRANSFER'];
  protected readonly envKey = 'GETTRANSFER_API_KEY';
  async searchTransfers() {
    return this.notConfigured();
  }
}

class LocalrentAdapter extends BaseAdapter {
  readonly id: ProviderId = 'localrent';
  readonly kinds: OfferKind[] = ['RENTAL'];
  protected readonly envKey = 'LOCALRENT_API_KEY';
}

/**
 * Карты. Сейчас карты рисует Leaflet поверх бесплатных тайлов CARTO, ключ не
 * нужен; адаптер объявлен, чтобы у маршрутизации и геокодирования (а им ключ
 * понадобится) было готовое место, а страница статуса показывала честное «не
 * настроено» вместо молчания.
 */
class MapsAdapter extends BaseAdapter {
  readonly id: ProviderId = 'maps';
  readonly kinds: OfferKind[] = ['MAP'];
  protected readonly envKey = 'MAPS_API_KEY';
}

// Typed as the interface so callers see searchHotels/searchFlights as optional
// (some providers implement only one). This is what keeps the build strict-safe.
export const ALL_ADAPTERS: TravelAdapter[] = [
  new BookingAdapter(),
  new AgodaAdapter(),
  new TripComAdapter(),
  new SkyscannerAdapter(),
  new TwelveGoAdapter(),
  new YandexTravelAdapter(),
  new ExpediaAdapter(),
  new KiwitaxiAdapter(),
  new GetTransferAdapter(),
  new LocalrentAdapter(),
  new MapsAdapter(),
];
