import { Controller, Get, Module, Param, Query, Req } from '@nestjs/common';
import { TravelService } from './travel.service';
import { PrismaModule } from '../prisma/prisma.module';
import { Public } from '../auth/auth.decorators';
import { optionalAccessor } from '../../common/optional-auth';

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
  // Логистика переиспользует реальные цены билетов вместо второго запроса к
  // Aviasales: у сервиса свой кэш на 10 минут, дублировать его нечем.
  exports: [TravelService],
})
export class TravelModule {}
