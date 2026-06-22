import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { estimateBudget } from '../../common/budget';
import { CreateTripInput } from './trips.dto';

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `trip-${Date.now().toString(36)}`;
}

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a trip from CMS form data (no code/files needed). Builds the full
   * graph: country → region → city → places, trip → BALANCED variant → days →
   * dayPlaces, plus an ESTIMATED budget. Published immediately so it appears on
   * the site and the map. Honors the Real Data Policy: user-entered coordinates
   * are stored as ESTIMATED; budget is an estimate from the stated envelope.
   */
  async create(input: CreateTripInput) {
    const countrySlug = slugify(input.countryName);
    const country = await this.prisma.country.upsert({
      where: { slug: countrySlug },
      update: {},
      create: { slug: countrySlug, name: input.countryName },
    });

    const region = await this.prisma.region.upsert({
      where: { countryId_slug: { countryId: country.id, slug: 'main' } },
      update: {},
      create: { countryId: country.id, slug: 'main', name: `${input.countryName} — routes` },
    });

    // Ensure a unique trip slug.
    let tripSlug = slugify(input.title);
    for (let n = 2; await this.prisma.trip.findUnique({ where: { slug: tripSlug } }); n++) {
      tripSlug = `${slugify(input.title)}-${n}`;
    }

    const trip = await this.prisma.trip.create({
      data: {
        slug: tripSlug,
        title: input.title,
        subtitle: input.subtitle,
        summary: input.summary,
        longDescription: input.longDescription,
        highlights: input.highlights ?? [],
        bestTime: input.bestTime,
        visaNote: input.visaNote,
        seasonLabel: input.seasonLabel,
        durationDays: input.durationDays,
        budgetMinRub: input.budgetMinRub,
        budgetMaxRub: input.budgetMaxRub,
        status: 'PUBLISHED',
        countryId: country.id,
      },
    });

    const variant = await this.prisma.routeVariant.create({
      data: { tripId: trip.id, pace: 'BALANCED', title: 'Сбалансированная' },
    });

    // Cities are created per distinct baseCity (fallback to the trip title).
    const cityCache = new Map<string, string>();
    const cityIdFor = async (label: string) => {
      const slug = slugify(label);
      if (cityCache.has(slug)) return cityCache.get(slug)!;
      const city = await this.prisma.city.upsert({
        where: { regionId_slug: { regionId: region.id, slug } },
        update: {},
        create: { regionId: region.id, slug, name: label },
      });
      cityCache.set(slug, city.id);
      return city.id;
    };

    for (let i = 0; i < input.days.length; i++) {
      const d = input.days[i];
      const baseCity = d.baseCity?.trim() || input.title;
      const cityId = await cityIdFor(baseCity);
      const day = await this.prisma.day.create({
        data: {
          variantId: variant.id,
          dayNumber: i + 1,
          title: d.title,
          baseCity,
          notes: d.notes,
        },
      });
      for (let j = 0; j < d.places.length; j++) {
        const p = d.places[j];
        const placeSlug = `${slugify(p.name)}-${i}-${j}`;
        const place = await this.prisma.place.create({
          data: {
            cityId,
            slug: placeSlug,
            name: p.name,
            nameLocal: p.nameLocal,
            lat: p.lat ?? null,
            lng: p.lng ?? null,
            description: p.description,
            // User-entered geodata: ESTIMATED if coords given, else PENDING.
            dataStatus: p.lat != null && p.lng != null ? 'ESTIMATED' : 'PENDING',
            source: 'cms-user-input',
            trustLevel: 3,
            fetchedAt: new Date(),
          },
        });
        await this.prisma.dayPlace.create({
          data: { dayId: day.id, placeId: place.id, order: j },
        });
      }
    }

    // ESTIMATED budget from the stated envelope.
    const breakdown = await this.prisma.budgetBreakdown.create({
      data: { variantId: variant.id, currency: 'RUB' },
    });
    const estimated = estimateBudget(input.budgetMinRub, input.budgetMaxRub, 'BALANCED');
    if (estimated) {
      await this.prisma.budgetLine.createMany({
        data: estimated.map((e) => ({
          breakdownId: breakdown.id,
          category: e.category,
          amount: e.amount,
          dataStatus: e.dataStatus,
          source: e.source,
          trustLevel: 3,
        })),
      });
    }

    return { slug: trip.slug, id: trip.id };
  }

  /** List published trips (CMS "HIDDEN"/"DRAFT" excluded). */
  async list() {
    return this.prisma.trip.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        country: true,
        scores: true,
        variants: { select: { id: true, pace: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Full trip detail with all variants, days, places, legs, budgets, opinions. */
  async getBySlug(slug: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { slug },
      include: {
        country: true,
        scores: true,
        opinions: true,
        variants: {
          include: {
            budget: { include: { lines: true } },
            days: {
              orderBy: { dayNumber: 'asc' },
              include: {
                places: {
                  orderBy: { order: 'asc' },
                  include: { place: true },
                },
                legs: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
    });
    if (!trip) throw new NotFoundException(`Trip "${slug}" not found`);
    return trip;
  }
}
