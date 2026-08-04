import { Controller, Get, Module, Param, Query, Req } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TravelModule } from '../travel/travel.module';
import { Public } from '../auth/auth.decorators';
import { optionalAccessor } from '../../common/optional-auth';
import { LogisticsService } from './logistics.service';

@Controller('logistics')
class LogisticsController {
  constructor(private readonly logistics: LogisticsService) {}

  /**
   * Логистика конкретной поездки.
   *
   * Даты необязательны: без них показываем аэропорты, транспорт и таймлайн, а
   * блок цен честно говорит «выберите даты». Спрашивать Aviasales без дат
   * бессмысленно, а показывать «типичную цену» — запрещено (§1).
   */
  @Public()
  @Get('trips/:slug')
  plan(
    @Param('slug') slug: string,
    @Query('origin') origin = 'MOW',
    @Query('depart') depart = '',
    @Query('return') ret = '',
    @Req() req: any,
  ) {
    return this.logistics.plan(
      slug,
      origin,
      depart || undefined,
      ret || undefined,
      optionalAccessor(req),
    );
  }
}

@Module({
  imports: [PrismaModule, TravelModule],
  controllers: [LogisticsController],
  providers: [LogisticsService],
})
export class LogisticsModule {}
