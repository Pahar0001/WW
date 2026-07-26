import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators';

// Мессенджер. Все маршруты — только для вошедших.
@Controller('chats')
@UseGuards(JwtAuthGuard)
class ChatsController {
  constructor(private readonly chats: ChatsService) {}

  @Get()
  list(@CurrentUser() me: AuthUser) {
    return this.chats.list(me.id);
  }

  @Get('unread-count')
  unread(@CurrentUser() me: AuthUser) {
    return this.chats.unreadTotal(me.id);
  }

  // Найти или создать личный чат.
  @Post('direct')
  direct(@CurrentUser() me: AuthUser, @Body() body: { userId?: string }) {
    return this.chats.direct(me.id, String(body?.userId ?? ''));
  }

  // Создать групповой чат.
  @Post('group')
  group(@CurrentUser() me: AuthUser, @Body() body: { title?: string; memberIds?: string[] }) {
    return this.chats.createGroup(me.id, String(body?.title ?? ''), body?.memberIds ?? []);
  }

  @Get(':id')
  get(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.chats.get(me.id, id);
  }

  // История (?before=ISO) и поллинг новых (?after=ISO).
  @Get(':id/messages')
  messages(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Query('before') before?: string,
    @Query('after') after?: string,
  ) {
    return this.chats.messages(me.id, id, { before, after });
  }

  @Post(':id/messages')
  send(
    @CurrentUser() me: AuthUser,
    @Param('id') id: string,
    @Body() body: { text?: string; kind?: string; uploadId?: string },
  ) {
    const media =
      (body?.kind === 'VOICE' || body?.kind === 'VIDEO_NOTE') && body?.uploadId
        ? { kind: body.kind as 'VOICE' | 'VIDEO_NOTE', uploadId: String(body.uploadId) }
        : null;
    return this.chats.send(me.id, id, String(body?.text ?? ''), media);
  }

  @Patch(':id/read')
  read(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.chats.markRead(me.id, id);
  }

  @Patch(':id')
  rename(@CurrentUser() me: AuthUser, @Param('id') id: string, @Body() body: { title?: string }) {
    return this.chats.rename(me.id, id, String(body?.title ?? ''));
  }

  @Post(':id/members')
  addMember(@CurrentUser() me: AuthUser, @Param('id') id: string, @Body() body: { userId?: string }) {
    return this.chats.addMember(me.id, id, String(body?.userId ?? ''));
  }

  @Delete(':id/members/me')
  leave(@CurrentUser() me: AuthUser, @Param('id') id: string) {
    return this.chats.leave(me.id, id);
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
