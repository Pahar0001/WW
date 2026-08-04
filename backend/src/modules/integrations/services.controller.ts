import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../auth/auth.decorators';
import { ALL_ADAPTERS } from './adapters';
import type { OfferKind, SearchResult, TravelAdapter } from './types';

/**
 * Слой внешних сервисов под адресами из техзадания:
 *
 *   /api/services/flights   /api/services/hotels
 *   /api/services/transfers /api/services/maps
 *
 * Каждый эндпоинт делает одно и то же: разворачивает запрос по всем адаптерам
 * своего вида и возвращает результаты ВМЕСТЕ со статусом каждого поставщика,
 * включая `NOT_CONFIGURED`. Интерфейс из-за этого может сказать честное «этот
 * сервис пока не подключён» вместо того, чтобы молча показать пустой список,
 * как будто предложений не нашлось.
 *
 * Ни один адаптер сейчас не подключён к живому API — ключей и договоров нет.
 * Это ОЖИДАЕМОЕ состояние, а не недоделка: архитектура готова, подключение
 * каждого сервиса — одна реализация метода в `adapters.ts`. Реальные цены на
 * билеты сегодня приходят другим путём — через `travel`/`logistics`
 * (Aviasales), и они помечены VERIFIED.
 */
@Controller('services')
export class ServicesController {
  private of(kind: OfferKind): TravelAdapter[] {
    return ALL_ADAPTERS.filter((a) => a.kinds.includes(kind));
  }

  private status(kind: OfferKind) {
    const adapters = this.of(kind);
    return {
      kind,
      providers: adapters.map((a) => ({
        provider: a.id,
        configured: a.isConfigured(),
      })),
      anyConfigured: adapters.some((a) => a.isConfigured()),
      note: 'Показываются только предложения подключённых поставщиков. Ничего не выдумывается.',
    };
  }

  @Public()
  @Get('flights')
  async flights(
    @Query('from') from = '',
    @Query('to') to = '',
    @Query('date') date = '',
  ) {
    const base = this.status('FLIGHT');
    if (!from || !to || !date) return base;
    const results: SearchResult[] = await Promise.all(
      this.of('FLIGHT')
        .filter((a) => a.searchFlights)
        .map((a) => a.searchFlights!({ from, to, date })),
    );
    return { ...base, results, offers: results.flatMap((r) => r.offers) };
  }

  @Public()
  @Get('hotels')
  async hotels(
    @Query('city') city = '',
    @Query('checkIn') checkIn = '',
    @Query('checkOut') checkOut = '',
  ) {
    const base = this.status('HOTEL');
    if (!city || !checkIn || !checkOut) return base;
    const results: SearchResult[] = await Promise.all(
      this.of('HOTEL')
        .filter((a) => a.searchHotels)
        .map((a) => a.searchHotels!({ cityOrLat: city, checkIn, checkOut })),
    );
    return { ...base, results, offers: results.flatMap((r) => r.offers) };
  }

  @Public()
  @Get('transfers')
  async transfers(
    @Query('from') from = '',
    @Query('to') to = '',
    @Query('at') at = '',
  ) {
    const base = this.status('TRANSFER');
    if (!from || !to || !at) return base;
    const results: SearchResult[] = await Promise.all(
      this.of('TRANSFER')
        .filter((a) => a.searchTransfers)
        .map((a) => a.searchTransfers!({ from, to, at })),
    );
    return { ...base, results, offers: results.flatMap((r) => r.offers) };
  }

  /**
   * Карты. Поиска здесь нет: тайлы рисует Leaflet прямо в браузере поверх
   * бесплатного CARTO, серверу в этом участвовать незачем. Эндпоинт отвечает на
   * единственный осмысленный вопрос — чем именно мы рисуем карты и нужен ли ключ.
   */
  @Public()
  @Get('maps')
  maps() {
    return {
      ...this.status('MAP'),
      tiles: 'CARTO basemaps (без ключа)',
      renderer: 'Leaflet, на стороне браузера',
    };
  }
}
