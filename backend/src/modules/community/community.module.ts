import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import { CommunityService } from './community.service';
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

const MessageIn = z.object({
  text: z.string().min(1).max(4000),
  parentId: z.string().optional(),
});

// Reads are public (anyone can browse country experience); posting/deleting
// requires login.
@Controller('community')
class CommunityController {
  constructor(private readonly svc: CommunityService) {}

  @Get('rooms')
  rooms() {
    return this.svc.rooms();
  }

  @Get(':country')
  room(@Param('country') country: string) {
    return this.svc.messages(country);
  }

  @Post(':country')
  @UseGuards(JwtAuthGuard)
  post(@Param('country') country: string, @Body() body: unknown, @CurrentUser() u: AuthUser) {
    const d = parse(MessageIn, body);
    return this.svc.post(u.id, country, d.text, d.parentId);
  }

  @Delete('messages/:id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.svc.remove(id, { id: u.id, role: u.role });
  }
}

@Module({
  controllers: [CommunityController],
  providers: [CommunityService],
})
export class CommunityModule {}
