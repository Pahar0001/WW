import { Controller, Get, Module, Param, Query, Req } from '@nestjs/common';
import { TravelService } from './travel.service';
import { PrismaModule } from '../prisma/prisma.module';
import { Public } from '../auth/auth.decorators';
import { verifyToken } from '../../common/jwt';

// Опциональная авторизация (как в trips.module) — нужна, чтобы планировщик
// работал и на приватных поездках у их участников.
function optionalAccessor(req: any): { id: string; role: string } | null {
  const h: string = req.headers?.authorization ?? '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return null;
  const p = verifyToken(t);
  return p ? { id: p.sub, role: p.role } : null;
}

@Controller('travel')
class TravelController {
  constructor(private readonly travel: TravelService) {}

  @Public()
  @Get('status')
  status() {
    return this.travel.status();
  }

  // Реальные цены перелёта + отельные ссылки под даты для конкретной поездки.
  @Public()
  @Get('plan/:slug')
  plan(
    @Param('slug') slug: string,
    @Query('origin') origin = 'MOW',
    @Query('depart') depart = '',
    @Query('return') ret = '',
    @Req() req: any,
  ) {
    return this.travel.plan(slug, origin, depart, ret, optionalAccessor(req));
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [TravelController],
  providers: [TravelService],
})
export class TravelModule {}
