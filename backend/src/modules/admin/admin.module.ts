import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditModule, AuditService } from '../audit/audit.service';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { Roles, CurrentUser, AuthUser } from '../auth/auth.decorators';

const SAFE_USER = {
  id: true, email: true, name: true, role: true, status: true,
  emailVerified: true, createdAt: true,
} satisfies Prisma.UserSelect;

// All admin routes require ADMIN (SUPER_ADMIN passes via RolesGuard).
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get('stats')
  async stats() {
    const [users, trips, published, members, recent] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.trip.count(),
      this.prisma.trip.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.tripMember.count(),
      this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 5, select: SAFE_USER }),
    ]);
    return { users, trips, publishedTrips: published, memberships: members, recentUsers: recent };
  }

  @Get('users')
  users(@Query('search') search?: string, @Query('role') role?: string) {
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role as UserRole;
    return this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200, select: SAFE_USER });
  }

  @Get('users/:id')
  user(@Param('id') id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { ...SAFE_USER, memberships: { include: { trip: { select: { slug: true, title: true } } } } },
    });
  }

  @Patch('users/:id/role')
  @Roles(UserRole.SUPER_ADMIN) // only Super Admin changes roles
  async setRole(@Param('id') id: string, @Body() body: { role: UserRole }, @CurrentUser() me: AuthUser, @Req() req: any) {
    const user = await this.prisma.user.update({ where: { id }, data: { role: body.role }, select: SAFE_USER });
    await this.audit.log({ userId: me.id, action: 'role.change', objectType: 'user', objectId: id, ip: req.ip, meta: { role: body.role } });
    return user;
  }

  @Post('users/:id/block')
  async block(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    const u = await this.prisma.user.update({ where: { id }, data: { status: 'BLOCKED' }, select: SAFE_USER });
    await this.audit.log({ userId: me.id, action: 'user.block', objectType: 'user', objectId: id });
    return u;
  }

  @Post('users/:id/unblock')
  async unblock(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    const u = await this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' }, select: SAFE_USER });
    await this.audit.log({ userId: me.id, action: 'user.unblock', objectType: 'user', objectId: id });
    return u;
  }

  @Post('users/:id/verify')
  async verify(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    const u = await this.prisma.user.update({ where: { id }, data: { emailVerified: true, emailVerifyToken: null }, select: SAFE_USER });
    await this.audit.log({ userId: me.id, action: 'user.verify', objectType: 'user', objectId: id });
    return u;
  }

  @Post('users/:id/reset-password')
  async resetPassword(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    const temp = randomBytes(6).toString('hex'); // 12-char temp password
    await this.prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(temp, 10) } });
    await this.audit.log({ userId: me.id, action: 'user.reset_password', objectType: 'user', objectId: id });
    return { ok: true, tempPassword: temp };
  }

  @Delete('users/:id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string, @CurrentUser() me: AuthUser) {
    if (id === me.id) return { ok: false, error: 'Нельзя удалить самого себя' };
    await this.prisma.user.delete({ where: { id } });
    await this.audit.log({ userId: me.id, action: 'user.delete', objectType: 'user', objectId: id });
    return { ok: true };
  }

  @Get('audit')
  audit_(@Query('limit') limit?: string) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 100, 500),
      include: { user: { select: { email: true } } },
    });
  }
}

@Module({ imports: [AuditModule], controllers: [AdminController] })
export class AdminModule {}
