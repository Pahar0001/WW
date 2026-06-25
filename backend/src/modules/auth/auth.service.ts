import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { signToken } from '../../common/jwt';

const token = () => randomBytes(24).toString('hex');
// 6-digit numeric email-verification code (100000–999999).
const verifyCode = () => String(randomInt(100000, 1000000));
// How long a verification code stays valid.
const CODE_TTL_MS = 15 * 60 * 1000;

function publicUser(u: any) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    image: u.image,
    bio: u.bio,
    role: u.role,
    status: u.status,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  async register(email: string, password: string, name: string | undefined, ip?: string) {
    email = email.toLowerCase().trim();
    if (password.length < 8) throw new BadRequestException('Пароль минимум 8 символов');
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Пользователь с таким email уже есть');

    const code = verifyCode();
    const user = await this.prisma.user.create({
      data: {
        email,
        name,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'MEMBER',
        emailVerifyToken: code,
        emailVerifyExpiry: new Date(Date.now() + CODE_TTL_MS),
      },
    });
    await this.sendVerifyEmail(email, code);
    await this.audit.log({ userId: user.id, action: 'register', objectType: 'user', objectId: user.id, ip });
    return { token: signToken({ sub: user.id, email: user.email, role: user.role }), user: publicUser(user) };
  }

  async login(email: string, password: string, ip?: string) {
    email = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Неверный email или пароль');
    if (user.status === 'BLOCKED') throw new UnauthorizedException('Аккаунт заблокирован');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный email или пароль');
    await this.audit.log({ userId: user.id, action: 'login', objectType: 'user', objectId: user.id, ip });
    return { token: signToken({ sub: user.id, email: user.email, role: user.role }), user: publicUser(user) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return publicUser(user);
  }

  /** Re-send a fresh verification code to the current user (if not yet verified). */
  async resendVerification(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (user.emailVerified) return { ok: true, alreadyVerified: true };
    const code = verifyCode();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: code, emailVerifyExpiry: new Date(Date.now() + CODE_TTL_MS) },
    });
    await this.sendVerifyEmail(user.email, code);
    return { ok: true };
  }

  /** Confirm an email with the 6-digit code that was emailed to it. */
  async verifyEmailCode(emailRaw: string, codeRaw: string) {
    const email = emailRaw.toLowerCase().trim();
    const code = codeRaw.trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Don't reveal whether the email exists; treat both as a bad code.
    if (!user) throw new BadRequestException('Неверный код подтверждения');
    if (user.emailVerified) return { ok: true, alreadyVerified: true };
    if (!user.emailVerifyToken || user.emailVerifyToken !== code) {
      throw new BadRequestException('Неверный код подтверждения');
    }
    if (!user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
      throw new BadRequestException('Код истёк — запросите новый');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null },
    });
    await this.audit.log({ userId: user.id, action: 'email.verify', objectType: 'user', objectId: user.id });
    return { ok: true };
  }

  async requestPasswordReset(email: string) {
    email = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Always return ok (don't leak whether the email exists).
    if (user) {
      const t = token();
      await this.prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: t, passwordResetExpiry: new Date(Date.now() + 3600_000) },
      });
      await this.email.send(
        email,
        'Сброс пароля Vela',
        `<p>Чтобы сбросить пароль, перейдите по ссылке (действует 1 час):</p>
         <p><a href="${this.email.link(`/reset-password?token=${t}`)}">Сбросить пароль</a></p>`,
      );
    }
    return { ok: true };
  }

  async resetPassword(t: string, newPassword: string) {
    if (newPassword.length < 8) throw new BadRequestException('Пароль минимум 8 символов');
    const user = await this.prisma.user.findFirst({ where: { passwordResetToken: t } });
    if (!user || !user.passwordResetExpiry || user.passwordResetExpiry < new Date()) {
      throw new BadRequestException('Ссылка недействительна или истекла');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });
    await this.audit.log({ userId: user.id, action: 'password.reset', objectType: 'user', objectId: user.id });
    return { ok: true };
  }

  private async sendVerifyEmail(email: string, code: string) {
    await this.email.send(
      email,
      `Код подтверждения Vela: ${code}`,
      `<p>Добро пожаловать в Vela! Ваш код подтверждения email:</p>
       <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${code}</p>
       <p>Введите его на странице подтверждения. Код действует 15 минут.</p>`,
    );
  }
}
