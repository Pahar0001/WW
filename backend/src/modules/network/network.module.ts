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
  Query,
  UseGuards,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import { NetworkService } from './network.service';
import { JwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser, AuthUser } from '../auth/auth.decorators';

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) throw new BadRequestException(e.flatten());
    throw e;
  }
}

const ProfileIn = z.object({
  name: z.string().max(80).optional(),
  bio: z.string().max(500).optional(),
  image: z.string().optional(),
});

@Controller()
@UseGuards(JwtAuthGuard)
class NetworkController {
  constructor(private readonly svc: NetworkService) {}

  @Get('users')
  users(@CurrentUser() u: AuthUser, @Query('search') search?: string) {
    return this.svc.users(u.id, search);
  }

  @Get('users/:id')
  profile(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.svc.profile(u.id, id);
  }

  // ── Friends ──
  @Get('friends')
  friends(@CurrentUser() u: AuthUser) {
    return this.svc.friends(u.id);
  }
  @Post('friends/:userId')
  request(@Param('userId') userId: string, @CurrentUser() u: AuthUser) {
    return this.svc.request(u.id, userId);
  }
  @Post('friends/:userId/accept')
  accept(@Param('userId') userId: string, @CurrentUser() u: AuthUser) {
    return this.svc.accept(u.id, userId);
  }
  @Delete('friends/:userId')
  remove(@Param('userId') userId: string, @CurrentUser() u: AuthUser) {
    return this.svc.remove(u.id, userId);
  }

  // ── Notifications ──
  @Get('notifications')
  notifications(@CurrentUser() u: AuthUser) {
    return this.svc.notifications(u.id);
  }
  @Post('notifications/read')
  markRead(@CurrentUser() u: AuthUser) {
    return this.svc.markRead(u.id);
  }

  // ── Own profile ──
  @Get('profile')
  myProfile(@CurrentUser() u: AuthUser) {
    return this.svc.myProfile(u.id);
  }
  @Patch('profile')
  updateProfile(@Body() body: unknown, @CurrentUser() u: AuthUser) {
    return this.svc.updateProfile(u.id, parse(ProfileIn, body));
  }
}

@Module({
  controllers: [NetworkController],
  providers: [NetworkService],
})
export class NetworkModule {}
