import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import { AssistantService } from './assistant.service';
import { PrismaModule } from '../prisma/prisma.module';
import { JwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser, type AuthUser } from '../auth/auth.decorators';

const ChatIn = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

const MessageIn = z.object({ content: z.string().min(1).max(4000) });

// Login required to use the AI consultant (bounds cost / abuse).
@Controller('assistant')
@UseGuards(JwtAuthGuard)
class AssistantController {
  constructor(private readonly svc: AssistantService) {}

  @Get('status')
  status() {
    return { configured: this.svc.configured() };
  }

  @Post('chat')
  chat(@Body() body: unknown) {
    let d;
    try {
      d = ChatIn.parse(body);
    } catch (e) {
      if (e instanceof ZodError) throw new BadRequestException(e.flatten());
      throw e;
    }
    return this.svc.chat(d.messages);
  }

  // ── Диалоги с историей (раздел /assistant) ──

  @Get('threads')
  threads(@CurrentUser() user: AuthUser) {
    return this.svc.listThreads(user.id);
  }

  @Post('threads')
  createThread(@CurrentUser() user: AuthUser, @Body() body: { title?: string }) {
    return this.svc.createThread(user.id, body?.title ?? null);
  }

  @Get('threads/:id')
  thread(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.getThread(user.id, id);
  }

  @Patch('threads/:id')
  rename(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: { title?: string }) {
    return this.svc.renameThread(user.id, id, String(body?.title ?? ''));
  }

  @Delete('threads/:id')
  removeThread(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.deleteThread(user.id, id);
  }

  @Post('threads/:id/messages')
  send(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: unknown) {
    let d;
    try {
      d = MessageIn.parse(body);
    } catch (e) {
      if (e instanceof ZodError) throw new BadRequestException(e.flatten());
      throw e;
    }
    return this.svc.sendToThread(user.id, id, d.content);
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [AssistantController],
  providers: [AssistantService],
})
export class AssistantModule {}
