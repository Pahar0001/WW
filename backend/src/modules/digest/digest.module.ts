import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Module,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DigestService } from './digest.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.service';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { CurrentUser, Public, Roles, type AuthUser } from '../auth/auth.decorators';

@Controller('digest')
class DigestController {
  constructor(private readonly digest: DigestService) {}

  // Отписка по ссылке из письма (без логина, подпись HMAC).
  @Get('unsubscribe')
  @Public()
  @Header('Content-Type', 'text/html; charset=utf-8')
  async unsubscribe(@Query('u') userId?: string, @Query('t') token?: string) {
    if (!userId || !token || !this.digest.verify(userId, token)) {
      throw new BadRequestException('Некорректная ссылка отписки');
    }
    await this.digest.setOptOut(userId, true);
    return `<!doctype html><html lang="ru"><body style="font-family:Arial;background:#f5efe3;color:#2b241c;display:grid;place-items:center;min-height:100vh;margin:0;">
      <div style="text-align:center;padding:24px;">
        <div style="font-size:26px;font-family:Georgia,serif;">Vela</div>
        <p style="margin-top:14px;">Готово — воскресный дайджест больше не будет приходить.</p>
        <p style="color:#8d8272;font-size:13px;">Вернуть его можно в настройках профиля.</p>
      </div></body></html>`;
  }

  // Настройка из профиля.
  @Get('settings')
  @UseGuards(JwtAuthGuard)
  settings(@CurrentUser() me: AuthUser) {
    return this.digest.getOptOut(me.id);
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard)
  set(@CurrentUser() me: AuthUser, @Body() body: { optOut?: boolean }) {
    return this.digest.setOptOut(me.id, Boolean(body?.optOut));
  }

  // Тестовая отправка (админ): собрать дайджест и прислать только себе —
  // проверить вёрстку письма, не трогая всю базу.
  @Post('test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async test(@CurrentUser() me: AuthUser) {
    return this.digest.sendTestTo(me.id);
  }
}

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [DigestController],
  providers: [DigestService],
})
export class DigestModule {}
