import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import { SocialService } from './social.service';
import { JwtAuthGuard } from '../auth/auth.guards';
import { CurrentUser, AuthUser } from '../auth/auth.decorators';
import { verifyToken } from '../../common/jwt';

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) throw new BadRequestException(e.flatten());
    throw e;
  }
}
// Decode a Bearer token if present (optional auth, no error if absent).
function optionalUserId(req: any): string | undefined {
  const h: string = req.headers?.authorization ?? '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return undefined;
  const p = verifyToken(t);
  return p ? p.sub : undefined;
}

const TargetEnum = z.enum(['TRIP', 'POST']);
const PostIn = z.object({ text: z.string().min(1).max(2000), imageUrl: z.string().optional() });
const LikeIn = z.object({ targetType: TargetEnum, targetId: z.string().min(1) });
const CommentIn = z.object({ targetType: TargetEnum, targetId: z.string().min(1), text: z.string().min(1).max(2000) });

@Controller()
class SocialController {
  constructor(private readonly svc: SocialService) {}

  @Get('feed')
  feed(@Req() req: any) {
    return this.svc.feed(optionalUserId(req));
  }

  @Get('news')
  news(@Req() req: any) {
    return this.svc.news(optionalUserId(req));
  }

  @Post('news')
  @UseGuards(JwtAuthGuard)
  createPost(@Body() body: unknown, @CurrentUser() u: AuthUser) {
    const d = parse(PostIn, body);
    return this.svc.createPost(u.id, d.text, d.imageUrl);
  }

  @Delete('posts/:id')
  @UseGuards(JwtAuthGuard)
  deletePost(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.svc.deletePost(id, { id: u.id, role: u.role });
  }

  @Post('like')
  @UseGuards(JwtAuthGuard)
  like(@Body() body: unknown, @CurrentUser() u: AuthUser) {
    const d = parse(LikeIn, body);
    return this.svc.toggleLike(u.id, d.targetType, d.targetId);
  }

  @Get('comments')
  comments(@Query('targetType') targetType: string, @Query('targetId') targetId: string) {
    return this.svc.listComments(parse(TargetEnum, targetType), targetId);
  }

  @Post('comments')
  @UseGuards(JwtAuthGuard)
  addComment(@Body() body: unknown, @CurrentUser() u: AuthUser) {
    const d = parse(CommentIn, body);
    return this.svc.addComment(u.id, d.targetType, d.targetId, d.text);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  deleteComment(@Param('id') id: string, @CurrentUser() u: AuthUser) {
    return this.svc.deleteComment(id, { id: u.id, role: u.role });
  }

  @Post('reposts/:tripId')
  @UseGuards(JwtAuthGuard)
  repost(@Param('tripId') tripId: string, @CurrentUser() u: AuthUser) {
    return this.svc.toggleRepost(u.id, tripId);
  }
}

@Module({
  controllers: [SocialController],
  providers: [SocialService],
})
export class SocialModule {}
