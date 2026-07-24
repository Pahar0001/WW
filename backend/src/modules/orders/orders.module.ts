import { Body, Controller, Get, Module, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { CurrentUser, Roles, type AuthUser } from '../auth/auth.decorators';

@Controller('orders')
@UseGuards(JwtAuthGuard)
class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // ИИ-конкретизация пожелания (предпросмотр брифа, ничего не сохраняет).
  @Post('refine')
  refine(@Body() body: { wish?: string }) {
    return this.orders.refine(String(body?.wish ?? ''));
  }

  // Отправить заявку админу.
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: { wish?: string; brief?: string }) {
    return this.orders.create(user.id, String(body?.wish ?? ''), body?.brief ?? null);
  }

  @Get('mine')
  mine(@CurrentUser() user: AuthUser) {
    return this.orders.listMine(user.id);
  }

  // ── Админка ──
  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listAll() {
    return this.orders.listAll();
  }

  @Get('new-count')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  newCount() {
    return this.orders.countNew();
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() body: { status?: string; adminNote?: string }) {
    return this.orders.update(id, body ?? {});
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
