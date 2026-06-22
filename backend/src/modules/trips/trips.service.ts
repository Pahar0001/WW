import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

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
