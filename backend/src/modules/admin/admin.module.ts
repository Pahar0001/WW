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
  emailVerified: true, createdAt: true, lastSeenAt: true,
} satisfies Prisma.UserSelect;

// Дневной временной ряд за N дней: [{day: 'YYYY-MM-DD', count}] — для графиков.
type DayRow = { day: string; count: number };
async function dailySeries(
  prisma: PrismaService,
  table: 'User' | 'Trip' | 'TripOrder' | 'TripRating' | 'Post',
  days = 30,
): Promise<DayRow[]> {
  // Динамическое имя таблицы безопасно: значения ограничены литеральным типом.
  const rows = await prisma.$queryRawUnsafe<{ day: Date; count: bigint }[]>(
    `SELECT date_trunc('day', "createdAt") AS day, count(*)::bigint AS count
     FROM "${table}"
     WHERE "createdAt" > now() - interval '${days} days'
     GROUP BY 1 ORDER BY 1`,
  );
  // Плотный ряд: дни без событий = 0, чтобы графики не «рвались».
  const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), Number(r.count)]));
  const out: DayRow[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ day: d, count: byDay.get(d) ?? 0 });
  }
  return out;
}

// All admin routes require ADMIN (SUPER_ADMIN passes via RolesGuard).
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // Дашборд: суммарные метрики + онлайн + временные ряды + статус систем.
  @Get('stats')
  async stats() {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const [
      users, online, activeDay, newWeek,
      trips, published, privateTrips, members,
      ordersNew, ordersInProgress, ordersDone,
      ratingsAgg, posts, comments, supportMsgs, uploadsAgg,
      recent, series,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { lastSeenAt: { gte: fiveMinAgo } } }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: dayAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.trip.count(),
      this.prisma.trip.count({ where: { status: 'PUBLISHED', visibility: 'PUBLIC' } }),
      this.prisma.trip.count({ where: { visibility: 'PRIVATE' } }),
      this.prisma.tripMember.count(),
      this.prisma.tripOrder.count({ where: { status: 'NEW' } }),
      this.prisma.tripOrder.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.tripOrder.count({ where: { status: 'DONE' } }),
      this.prisma.tripRating.aggregate({ _count: true, _avg: { stars: true } }),
      this.prisma.post.count(),
      this.prisma.comment.count(),
      this.prisma.supportMessage.count(),
      this.prisma.upload.aggregate({ _count: true, _sum: { size: true } }),
      this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: SAFE_USER }),
      Promise.all([
        dailySeries(this.prisma, 'User'),
        dailySeries(this.prisma, 'Trip'),
        dailySeries(this.prisma, 'TripOrder'),
        dailySeries(this.prisma, 'TripRating'),
        dailySeries(this.prisma, 'Post'),
      ]),
    ]);

    const mem = process.memoryUsage();
    return {
      users: { total: users, online, activeDay, newWeek },
      trips: { total: trips, published, private: privateTrips, memberships: members },
      orders: { new: ordersNew, inProgress: ordersInProgress, done: ordersDone },
      social: {
        posts,
        comments,
        ratings: ratingsAgg._count,
        ratingAvg: ratingsAgg._avg.stars ? Number(ratingsAgg._avg.stars.toFixed(2)) : null,
        supportMessages: supportMsgs,
      },
      uploads: { count: uploadsAgg._count, bytes: uploadsAgg._sum.size ?? 0 },
      series: {
        registrations: series[0],
        trips: series[1],
        orders: series[2],
        ratings: series[3],
        posts: series[4],
      },
      system: {
        uptimeSec: Math.round(process.uptime()),
        node: process.version,
        rssMb: Math.round(mem.rss / 1024 / 1024),
        heapMb: Math.round(mem.heapUsed / 1024 / 1024),
        integrations: {
          groq: Boolean(process.env.GROQ_API_KEY),
          travelpayouts: Boolean(process.env.TRAVELPAYOUTS_TOKEN),
          marker: Boolean(process.env.TRAVELPAYOUTS_MARKER),
          resend: Boolean(process.env.RESEND_API_KEY),
          s3: Boolean(process.env.S3_BUCKET),
        },
      },
      recentUsers: recent,
    };
  }

  // All trips (incl. PRIVATE / archived) for the admin panel, with filters.
  @Get('trips')
  trips_(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('visibility') visibility?: string,
  ) {
    const where: Prisma.TripWhereInput = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status as any;
    if (visibility) where.visibility = visibility as any;
    return this.prisma.trip.findMany({
      where,
      include: { country: true, _count: { select: { members: true } } },
      orderBy: { createdAt: 'desc' },
    });
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
