import {
  Body,
  Controller,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaModule } from '../prisma/prisma.module';
import { TravelModule } from '../travel/travel.module';
import { CurrentUser, Public, Roles, type AuthUser } from '../auth/auth.decorators';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { optionalAccessor } from '../../common/optional-auth';
import { RateLimit } from '../../common/rate-limit.guard';
import { LogisticsService } from './logistics.service';
import {
  ServiceRequestsService,
  type CreateServiceRequestInput,
} from './service-requests.service';

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

/**
 * Заявки на трансфер и парковку.
 *
 * Отдельный контроллер под гвардом: логистику смотрят все, а заявку оставляет
 * только вошедший — так у обращения есть подтверждённая почта для ответа и не
 * появляется анонимный поток персональных данных.
 */
@Controller('service-requests')
@UseGuards(JwtAuthGuard)
class ServiceRequestsController {
  constructor(private readonly requests: ServiceRequestsService) {}

  @Post()
  @RateLimit({ limit: 10, windowMs: 60 * 60_000 }) // защита админа от спама заявками
  create(@CurrentUser() user: AuthUser, @Body() body: CreateServiceRequestInput) {
    return this.requests.create(user.id, body ?? {});
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.requests.listMine(user.id);
  }

  // ── Админка ──
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listAll() {
    return this.requests.listAll();
  }

  @Get('new-count')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  newCount() {
    return this.requests.countNew();
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() body: { status?: string; adminNote?: string; priceRub?: number | null },
  ) {
    return this.requests.update(id, body ?? {});
  }
}

@Module({
  imports: [PrismaModule, TravelModule],
  controllers: [LogisticsController, ServiceRequestsController],
  providers: [LogisticsService, ServiceRequestsService],
})
export class LogisticsModule {}
