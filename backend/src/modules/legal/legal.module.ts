import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConsentKind } from '@prisma/client';
import { z, ZodError } from 'zod';
import { AuditModule } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/auth.guards';
import { Public, CurrentUser, AuthUser } from '../auth/auth.decorators';
import { LegalService } from './legal.service';

const ipOf = (req: any): string | undefined =>
  (req.headers['x-forwarded-for']?.split(',')[0] ?? req.ip ?? '').trim() || undefined;
const uaOf = (req: any): string | undefined => req.headers['user-agent'] || undefined;

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) throw new BadRequestException(e.flatten());
    throw e;
  }
}

const ConsentBody = z.object({
  entries: z
    .array(
      z.object({
        kind: z.nativeEnum(ConsentKind),
        granted: z.boolean(),
        version: z.string().min(1).max(64),
      }),
    )
    .min(1)
    .max(10),
  source: z.string().max(32).optional(),
});

@Controller('legal')
class LegalController {
  constructor(private readonly legal: LegalService) {}

  /**
   * Редакции документов. Публично: фронт сверяет, не устарело ли принятое
   * согласие, ещё до того как пользователь вошёл.
   */
  @Get('versions')
  @Public()
  versions() {
    return this.legal.versions();
  }

  /** Мои согласия: текущее состояние, чего не хватает и история подписания. */
  @Get('consents')
  @UseGuards(JwtAuthGuard)
  async consents(@CurrentUser() me: AuthUser) {
    const [current, missing, history] = await Promise.all([
      this.legal.current(me.id),
      this.legal.missingRequired(me.id),
      this.legal.history(me.id),
    ]);
    return { current, missing, history };
  }

  /** Дать или отозвать согласия. Один вызов может нести несколько записей. */
  @Post('consent')
  @UseGuards(JwtAuthGuard)
  record(@CurrentUser() me: AuthUser, @Body() body: unknown, @Req() req: any) {
    const d = parse(ConsentBody, body);
    return this.legal.record(me.id, d.entries, {
      source: d.source,
      ip: ipOf(req),
      userAgent: uaOf(req),
    });
  }
}

@Module({
  imports: [AuditModule],
  controllers: [LegalController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}
