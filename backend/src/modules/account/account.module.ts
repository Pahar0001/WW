import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import { AuditModule } from '../audit/audit.service';
import { LegalModule } from '../legal/legal.module';
import { JwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser, AuthUser } from '../auth/auth.decorators';
import { AccountService } from './account.service';

const ipOf = (req: any): string | undefined =>
  (req.headers['x-forwarded-for']?.split(',')[0] ?? req.ip ?? '').trim() || undefined;

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) throw new BadRequestException(e.flatten());
    throw e;
  }
}

const Notifications = z
  .object({
    notifyNews: z.boolean().optional(),
    notifyRoutes: z.boolean().optional(),
    notifyOffers: z.boolean().optional(),
    notifyReminders: z.boolean().optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Нечего менять' });

const DeleteAccount = z.object({ password: z.string().min(1) });

@Controller('account')
@UseGuards(JwtAuthGuard)
class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('notifications')
  notifications(@CurrentUser() me: AuthUser) {
    return this.account.notifications(me.id);
  }

  @Patch('notifications')
  setNotifications(@CurrentUser() me: AuthUser, @Body() body: unknown) {
    return this.account.setNotifications(me.id, parse(Notifications, body));
  }

  /**
   * Выгрузка данных. Отдаём обычным JSON — файл собирает клиент: так выгрузка
   * идёт тем же авторизованным путём, что и остальные запросы, и не требует
   * одноразовых ссылок, которые пришлось бы где-то хранить и протухать.
   */
  @Get('export')
  exportData(@CurrentUser() me: AuthUser) {
    return this.account.exportData(me.id);
  }

  @Delete()
  remove(@CurrentUser() me: AuthUser, @Body() body: unknown, @Req() req: any) {
    const d = parse(DeleteAccount, body);
    return this.account.deleteAccount(me.id, d.password, ipOf(req));
  }
}

@Module({
  imports: [AuditModule, LegalModule],
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule {}
