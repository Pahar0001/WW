import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { verifyToken } from '../../common/jwt';
import { PUBLIC_KEY, ROLES_KEY } from './auth.decorators';

/** Имя cookie с токеном — то же, что использует фронтенд. */
export const TOKEN_COOKIE = 'vela_token';

/**
 * ВСЕ токены запроса: из заголовка `Authorization` и из cookie.
 *
 * ⚠️ ВОЗВРАЩАЕТ СПИСОК, А НЕ ПЕРВЫЙ НАЙДЕННЫЙ, и это не придирка. Раньше здесь
 * было «заголовок, иначе cookie», и это запирало снаружи всех, кто входил ДО
 * перехода на httpOnly-cookie: у них в localStorage остался прежний токен, и
 * `authHeaders()` продолжал слать его Bearer'ом. После нового входа появлялась
 * валидная cookie, но заголовок побеждал, подпись не сходилась — 401 при живой
 * сессии. Со стороны это выглядело так: вход проходит, админка моргает
 * «проверка доступа» и выбрасывает обратно.
 *
 * Теперь гвард перебирает кандидатов и берёт первый, который проверяется:
 * негодный заголовок больше не отменяет годную cookie.
 *
 * Cookie разбираем вручную: ради одной строки тащить `cookie-parser` в образ,
 * который собирается без lock-файла, не стоит (§12.1 хендоффа).
 */
export function tokensOf(req: any): string[] {
  const out: string[] = [];

  const header: string = req.headers['authorization'] ?? '';
  if (header.startsWith('Bearer ')) {
    const t = header.slice(7).trim();
    if (t) out.push(t);
  }

  const raw: string = req.headers['cookie'] ?? '';
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== TOKEN_COOKIE) continue;
    const value = part.slice(eq + 1).trim();
    if (value) out.push(decodeURIComponent(value));
  }
  return out;
}

/** Первая полезная нагрузка, которая действительно проверилась. */
export function verifiedPayload(req: any) {
  for (const token of tokensOf(req)) {
    const payload = verifyToken(token);
    if (payload) return payload;
  }
  return null;
}

/**
 * Validates a JWT (Bearer header or cookie), loads the user, rejects
 * missing/blocked accounts, and attaches the user to the request.
 * Routes marked @Public() skip the check.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    if (tokensOf(req).length === 0) throw new UnauthorizedException('Требуется вход');

    const payload = verifiedPayload(req);
    if (!payload) throw new UnauthorizedException('Недействительный токен');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true, lastSeenAt: true },
    });
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    if (user.status === 'BLOCKED') throw new ForbiddenException('Аккаунт заблокирован');

    // «Время в сети»: отмечаем активность fire-and-forget, не чаще раза в
    // 5 минут — ноль влияния на латентность и на нагрузку БД.
    const FIVE_MIN = 5 * 60 * 1000;
    if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > FIVE_MIN) {
      this.prisma.user
        .update({ where: { id: user.id }, data: { lastSeenAt: new Date() } })
        .catch(() => {});
    }

    req.user = user;
    return true;
  }
}

/**
 * Enforces @Roles(...). SUPER_ADMIN passes everything. Must run after JwtAuthGuard.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const user = ctx.switchToHttp().getRequest().user;
    if (!user) throw new UnauthorizedException();
    if (user.role === 'SUPER_ADMIN') return true;
    if (!required.includes(user.role)) {
      throw new ForbiddenException('Недостаточно прав');
    }
    return true;
  }
}
