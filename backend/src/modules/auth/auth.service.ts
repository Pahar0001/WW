import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomInt } from 'crypto';
import { ConsentKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { AuditService } from '../audit/audit.service';
import { LegalService, type ConsentInput } from '../legal/legal.service';
import { REQUIRED_CONSENTS, currentVersionFor } from '../legal/versions';
import { signToken } from '../../common/jwt';
import { BCRYPT_ROUNDS } from '../../common/password';

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
    termsAcceptedAt: u.termsAcceptedAt,
    createdAt: u.createdAt,
  };
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  /** Согласия, отмеченные в форме регистрации. */
  consents: ConsentInput[];
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
    private readonly legal: LegalService,
  ) {}

  /**
   * Регистрация. Согласия фиксируются здесь же, в момент передачи данных, —
   * это единственный момент, когда согласие на обработку ПДн вообще имеет смысл:
   * раньше данных ещё нет, а позже они уже обработаны без основания.
   */
  async register(input: RegisterInput) {
    const email = input.email.toLowerCase().trim();
    if (input.password.length < 8) throw new BadRequestException('Пароль минимум 8 символов');

    const granted = new Set(input.consents.filter((c) => c.granted).map((c) => c.kind));
    const missing = REQUIRED_CONSENTS.filter((k) => !granted.has(k));
    if (missing.length > 0) {
      throw new BadRequestException(
        'Без принятия пользовательского соглашения и согласия на обработку ' +
          'персональных данных регистрация невозможна',
      );
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Пользователь с таким email уже есть');

    // Рекламные каналы включаются РОВНО по галочке рассылок. Дефолт схемы
    // (`notifyRoutes: true`) рассчитан на уже существующих подписчиков дайджеста
    // и для новых регистраций не годится — здесь значение всегда явное.
    const marketing = granted.has(ConsentKind.MARKETING);

    const code = verifyCode();
    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name,
        passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
        role: 'MEMBER',
        emailVerifyToken: code,
        emailVerifyExpiry: new Date(Date.now() + CODE_TTL_MS),
        notifyNews: marketing,
        notifyRoutes: marketing,
        notifyOffers: marketing,
        digestOptOut: !marketing,
      },
    });
    // Только после создания пользователя — у согласия внешний ключ на него.
    await this.legal.record(user.id, input.consents, {
      source: 'register',
      ip: input.ip,
      userAgent: input.userAgent,
    });
    await this.sendVerifyEmail(email, code);
    await this.audit.log({ userId: user.id, action: 'register', objectType: 'user', objectId: user.id, ip: input.ip });
    const fresh = await this.prisma.user.findUnique({ where: { id: user.id } });
    return { token: signToken({ sub: user.id, email: user.email, role: user.role }), user: publicUser(fresh) };
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

  /**
   * Текущая сессия. Отдаём вместе со списком согласий, которых не хватает:
   * окно-гейт спрашивает про них на каждой странице, и отдельный запрос за
   * этим списком означал бы второй поход к API при каждой загрузке.
   */
  async me(userId: string) {
    const [user, pendingConsents] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.legal.missingRequired(userId),
    ]);
    if (!user) throw new UnauthorizedException();
    return { ...publicUser(user), pendingConsents };
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

  /**
   * Принятие соглашения и согласия на обработку ПДн окном-гейтом — для тех, кто
   * зарегистрировался ДО появления галочек в форме, и при выходе новой редакции
   * документов.
   *
   * Идемпотентности больше нет намеренно: если редакция сменилась, согласие надо
   * получить заново, и запись о нём — новая строка. Прежняя версия молча
   * возвращала «уже принято» и новую редакцию никто бы не подписал.
   */
  async acceptTerms(userId: string, ctx: { ip?: string; userAgent?: string } = {}) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const missing = await this.legal.missingRequired(userId);
    if (missing.length === 0) {
      return { ok: true, termsAcceptedAt: user.termsAcceptedAt };
    }
    await this.legal.record(
      userId,
      missing.map((kind) => ({ kind, granted: true, version: currentVersionFor(kind) })),
      { source: 'gate', ip: ctx.ip, userAgent: ctx.userAgent },
    );
    const updated = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.audit.log({ userId, action: 'terms.accept', objectType: 'user', objectId: userId });
    return { ok: true, termsAcceptedAt: updated?.termsAcceptedAt ?? null };
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
        passwordHash: await bcrypt.hash(newPassword, BCRYPT_ROUNDS),
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
