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
import { z, ZodError } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { EmailModule } from '../email/email.service';
import { AuditModule } from '../audit/audit.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guards';
import { CurrentUser, AuthUser } from './auth.decorators';

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

const Register = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().optional() });
const Login = z.object({ email: z.string().email(), password: z.string() });
const Forgot = z.object({ email: z.string().email() });
const Reset = z.object({ token: z.string(), password: z.string().min(8) });

@Controller('auth')
class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: unknown, @Req() req: any) {
    const d = parse(Register, body);
    return this.auth.register(d.email, d.password, d.name, ipOf(req));
  }

  @Post('login')
  login(@Body() body: unknown, @Req() req: any) {
    const d = parse(Login, body);
    return this.auth.login(d.email, d.password, ipOf(req));
  }

  @Post('verify-email')
  verify(@Body() body: unknown) {
    const t = (body as any)?.token;
    if (!t) throw new BadRequestException('token required');
    return this.auth.verifyEmail(t);
  }

  @Post('forgot-password')
  forgot(@Body() body: unknown) {
    return this.auth.requestPasswordReset(parse(Forgot, body).email);
  }

  @Post('reset-password')
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
  imports: [EmailModule, AuditModule],
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
    const passwordHash = await bcrypt.hash(password, 10);
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
