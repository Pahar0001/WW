import {
  Controller,
  Get,
  Module,
  NotFoundException,
  Param,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  dayLoadIndex,
  variantLoad,
  relaxationVerdict,
} from '../../common/scoring';

class RoutesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Compute live load analysis + relaxation verdict for a variant. */
  async analyze(variantId: string) {
    const variant = await this.prisma.routeVariant.findUnique({
      where: { id: variantId },
      include: {
        days: {
          orderBy: { dayNumber: 'asc' },
          include: { places: true, legs: true },
        },
      },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    const perDay = variant.days.map((d) =>
      dayLoadIndex({
        placeCount: d.places.length,
        totalDwellMin: d.places.reduce((a, p) => a + (p.dwellMin ?? 0), 0),
        totalTransitMin: d.legs.reduce((a, l) => a + (l.durationMin ?? 0), 0),
      }),
    );
    const load = variantLoad(perDay);
    return {
      variantId,
      pace: variant.pace,
      load,
      verdict: relaxationVerdict(load),
      note: 'loadIndex is an ESTIMATED heuristic, not a sourced figure.',
    };
  }
}

@Controller('routes')
class RoutesController {
  constructor(private readonly routes: RoutesService) {}

  @Get('variant/:id/analysis')
  analyze(@Param('id') id: string) {
    return this.routes.analyze(id);
  }
}

@Module({
  controllers: [RoutesController],
  providers: [
    { provide: RoutesService, useFactory: (p: PrismaService) => new RoutesService(p), inject: [PrismaService] },
  ],
})
export class RoutesModule {}
