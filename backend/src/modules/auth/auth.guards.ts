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

/**
 * Validates a Bearer JWT, loads the user, rejects missing/blocked accounts, and
 * attaches the user to the request. Routes marked @Public() skip the check.
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
    const header: string = req.headers['authorization'] ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Требуется вход');

    const payload = verifyToken(token);
    if (!payload) throw new UnauthorizedException('Недействительный токен');

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true },
    });
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    if (user.status === 'BLOCKED') throw new ForbiddenException('Аккаунт заблокирован');

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
