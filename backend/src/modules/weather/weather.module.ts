import { Controller, Get, Module, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaModule } from '../prisma/prisma.module';
import { Public } from '../auth/auth.decorators';

/**
 * Погода по городам маршрута — Open-Meteo (бесплатно, без ключа, CC-BY).
 *
 * GET /api/weather/trip/:slug → прогноз на 7 дней для базовых городов
 * сбалансированного варианта (координаты — центроид мест дня). Кэш 30 минут.
 * Real Data Policy: это реальный прогноз реального источника → VERIFIED
 * с указанием source; при недоступности отдаём пустой список, не выдумываем.
 */

const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL = 30 * 60 * 1000;

export interface CityForecast {
  city: string;
  lat: number;
  lng: number;
  days: {
    date: string;
    tMax: number;
    tMin: number;
    precipProbMax: number | null;
    weatherCode: number;
  }[];
}

interface TripWeather {
  configured: true;
  source: 'open-meteo.com';
  dataStatus: 'VERIFIED';
  fetchedAt: string;
  cities: CityForecast[];
}

@Controller('weather')
class WeatherController {
  private cache = new Map<string, { at: number; data: TripWeather }>();

  constructor(private readonly prisma: PrismaService) {}

  @Get('trip/:slug')
  @Public()
  async trip(@Param('slug') slug: string): Promise<TripWeather> {
    const hit = this.cache.get(slug);
    if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

    const trip = await this.prisma.trip.findUnique({
      where: { slug },
      select: {
        visibility: true,
        variants: {
          select: {
            pace: true,
            days: {
              select: {
                baseCity: true,
                places: { select: { place: { select: { lat: true, lng: true } } } },
              },
            },
          },
        },
      },
    });
    // Приватные маршруты не раскрываем через погоду (география — тоже данные).
    if (!trip || trip.visibility === 'PRIVATE') throw new NotFoundException('Маршрут не найден');

    const variant =
      trip.variants.find((v) => v.pace === 'BALANCED') ?? trip.variants[0];
    const cities = new Map<string, { lat: number; lng: number; n: number }>();
    for (const d of variant?.days ?? []) {
      const name = (d.baseCity ?? '').trim();
      if (!name) continue;
      for (const p of d.places) {
        if (p.place.lat == null || p.place.lng == null) continue;
        const c = cities.get(name) ?? { lat: 0, lng: 0, n: 0 };
        c.lat += p.place.lat;
        c.lng += p.place.lng;
        c.n += 1;
        cities.set(name, c);
      }
    }

    const list = [...cities.entries()]
      .filter(([, c]) => c.n > 0)
      .slice(0, 6) // не бомбим API: максимум 6 городов
      .map(([city, c]) => ({ city, lat: c.lat / c.n, lng: c.lng / c.n }));

    const forecasts = await Promise.all(
      list.map(async ({ city, lat, lng }): Promise<CityForecast | null> => {
        try {
          const qs = new URLSearchParams({
            latitude: lat.toFixed(3),
            longitude: lng.toFixed(3),
            daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
            timezone: 'auto',
            forecast_days: '7',
          });
          const res = await fetch(`${OPEN_METEO}?${qs}`, { signal: AbortSignal.timeout(8000) });
          if (!res.ok) return null;
          const d = (await res.json()) as {
            daily?: {
              time: string[];
              temperature_2m_max: number[];
              temperature_2m_min: number[];
              precipitation_probability_max: (number | null)[];
              weather_code: number[];
            };
          };
          if (!d.daily) return null;
          return {
            city,
            lat,
            lng,
            days: d.daily.time.map((date, i) => ({
              date,
              tMax: Math.round(d.daily!.temperature_2m_max[i]),
              tMin: Math.round(d.daily!.temperature_2m_min[i]),
              precipProbMax: d.daily!.precipitation_probability_max[i] ?? null,
              weatherCode: d.daily!.weather_code[i],
            })),
          };
        } catch {
          return null;
        }
      }),
    );

    const data: TripWeather = {
      configured: true,
      source: 'open-meteo.com',
      dataStatus: 'VERIFIED',
      fetchedAt: new Date().toISOString(),
      cities: forecasts.filter(Boolean) as CityForecast[],
    };
    this.cache.set(slug, { at: Date.now(), data });
    return data;
  }
}

@Module({ imports: [PrismaModule], controllers: [WeatherController] })
export class WeatherModule {}
