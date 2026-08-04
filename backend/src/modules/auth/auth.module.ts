import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  OnModuleInit,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConsentKind } from '@prisma/client';
import { z, ZodError } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { EmailModule } from '../email/email.service';
import { AuditModule } from '../audit/audit.service';
import { LegalModule } from '../legal/legal.module';
import { BCRYPT_ROUNDS } from '../../common/password';
import { RateLimit } from '../../common/rate-limit.guard';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guards';
import { CurrentUser, AuthUser } from './auth.decorators';

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

// Согласия приходят той же формой, что и на /legal/consent: один формат записи
// на весь сервис — и в регистрации, и в настройках, и в гейте.
const Register = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  consents: z
    .array(
      z.object({
        kind: z.nativeEnum(ConsentKind),
        granted: z.boolean(),
        version: z.string().min(1).max(64),
      }),
    )
    .max(10)
    .default([]),
});
const Login = z.object({ email: z.string().email(), password: z.string() });
const Forgot = z.object({ email: z.string().email() });
const Reset = z.object({ token: z.string(), password: z.string().min(8) });
const VerifyEmail = z.object({ email: z.string().email(), code: z.string().min(4).max(8) });

@Controller('auth')
class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @RateLimit({ limit: 5,  windowMs: 60 * 60_000 })   // 5 регистраций в час с адреса
  register(@Body() body: unknown, @Req() req: any) {
    const d = parse(Register, body);
    return this.auth.register({
      email: d.email,
      password: d.password,
      name: d.name,
      consents: d.consents ?? [],
      ip: ipOf(req),
      userAgent: uaOf(req),
    });
  }

  @Post('login')
  @RateLimit({ limit: 10, windowMs: 5 * 60_000 })    // подбор пароля
  login(@Body() body: unknown, @Req() req: any) {
    const d = parse(Login, body);
    return this.auth.login(d.email, d.password, ipOf(req));
  }

  @Post('verify-email')
  @RateLimit({ limit: 20, windowMs: 60 * 60_000 })   // перебор 6-значного кода
  verify(@Body() body: unknown) {
    const d = parse(VerifyEmail, body);
    return this.auth.verifyEmailCode(d.email, d.code);
  }

  @Post('resend-verification')
  @RateLimit({ limit: 3,  windowMs: 60 * 60_000 })   // рассылка писем чужому адресу
  @UseGuards(JwtAuthGuard)
  resend(@CurrentUser() user: AuthUser) {
    return this.auth.resendVerification(user.id);
  }

  @Post('accept-terms')
  @RateLimit({ limit: 30, windowMs: 60 * 60_000 })
  @UseGuards(JwtAuthGuard)
  acceptTerms(@CurrentUser() user: AuthUser, @Req() req: any) {
    return this.auth.acceptTerms(user.id, { ip: ipOf(req), userAgent: uaOf(req) });
  }

  @Post('forgot-password')
  @RateLimit({ limit: 5,  windowMs: 60 * 60_000 })   // то же, но без входа
  forgot(@Body() body: unknown) {
    return this.auth.requestPasswordReset(parse(Forgot, body).email);
  }

  @Post('reset-password')
  @RateLimit({ limit: 10, windowMs: 60 * 60_000 })   // перебор токена сброса
  reset(@Body() body: unknown) {
    const d = parse(Reset, body);
    return this.auth.resetPassword(d.token, d.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }
}

@Module({
  imports: [EmailModule, AuditModule, LegalModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  // Bootstrap the first Super Admin from env (idempotent).
  async onModuleInit() {
    const email = process.env.SUPERADMIN_EMAIL?.toLowerCase().trim();
    const password = process.env.SUPERADMIN_PASSWORD;
    if (!email || !password) return;
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await this.prisma.user.upsert({
      where: { email },
      update: { role: 'SUPER_ADMIN', status: 'ACTIVE', emailVerified: true, passwordHash },
      create: {
        email,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
        passwordHash,
      },
    });
    // eslint-disable-next-line no-console
    console.log(`[bootstrap] Super Admin ensured for ${email}`);
  }
}
