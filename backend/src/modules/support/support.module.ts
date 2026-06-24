import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import { UserRole } from '@prisma/client';
import { SupportService } from './support.service';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { Roles, CurrentUser, AuthUser } from '../auth/auth.decorators';

const TextIn = z.object({ text: z.string().min(1).max(2000) });
function parseText(body: unknown): string {
  try {
    return TextIn.parse(body).text;
  } catch (e) {
    if (e instanceof ZodError) throw new BadRequestException(e.flatten());
    throw e;
  }
}

@Controller('support')
@UseGuards(JwtAuthGuard)
class SupportController {
  constructor(private readonly svc: SupportService) {}

  // ── User's own thread (any authenticated user) ──
  @Get('thread')
  myThread(@CurrentUser() u: AuthUser, @Query('since') since?: string) {
    return this.svc.myThread(u.id, since);
  }

  @Post('thread')
  postMine(@CurrentUser() u: AuthUser, @Body() body: unknown) {
    return this.svc.postFromUser(u.id, parseText(body));
  }

  // ── Admin side (SUPER_ADMIN) ──
  @Get('threads')
  @UseGuards(RolesGuard) @Roles(UserRole.SUPER_ADMIN)
  threads() {
    return this.svc.listThreads();
  }

  @Get('threads/:userId')
  @UseGuards(RolesGuard) @Roles(UserRole.SUPER_ADMIN)
  thread(@Param('userId') userId: string, @Query('since') since?: string) {
    return this.svc.threadMessages(userId, since);
  }

  @Post('threads/:userId')
  @UseGuards(RolesGuard) @Roles(UserRole.SUPER_ADMIN)
  reply(@Param('userId') userId: string, @Body() body: unknown, @CurrentUser() u: AuthUser) {
    return this.svc.postFromSupport(userId, u.id, parseText(body));
  }
}

@Module({
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
