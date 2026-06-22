import { Controller, Get, Module, Query } from '@nestjs/common';
import { ALL_ADAPTERS } from './adapters';
import { Offer, SearchResult } from './types';

class IntegrationsService {
  /** Provider readiness — shown in CMS / status page. */
  status() {
    return ALL_ADAPTERS.map((a) => ({
      provider: a.id,
      kinds: a.kinds,
      configured: a.isConfigured(),
    }));
  }

  /** Fan-out hotel search across configured providers, then rank real offers. */
  async hotels(city: string, checkIn: string, checkOut: string) {
    const results: SearchResult[] = await Promise.all(
      ALL_ADAPTERS.filter((a) => a.searchHotels).map((a) =>
        a.searchHotels!({ cityOrLat: city, checkIn, checkOut }),
      ),
    );
    const offers = results.flatMap((r) => r.offers);
    return {
      results, // includes NOT_CONFIGURED entries so the UI can be honest
      best: this.rank(offers),
      note: 'Only offers from configured providers appear. Nothing is invented.',
    };
  }

  /** Best-value ranking: lowest real price first; ties broken by rating. */
  private rank(offers: Offer[]): Offer[] {
    return [...offers].sort(
      (a, b) =>
        a.price.amount - b.price.amount || (b.rating ?? 0) - (a.rating ?? 0),
    );
  }
}

@Controller('integrations')
class IntegrationsController {
  private readonly svc = new IntegrationsService();

  @Get('status')
  status() {
    return this.svc.status();
  }

  @Get('hotels')
  hotels(
    @Query('city') city: string,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    return this.svc.hotels(city, checkIn, checkOut);
  }
}

@Module({ controllers: [IntegrationsController] })
export class IntegrationsModule {}
