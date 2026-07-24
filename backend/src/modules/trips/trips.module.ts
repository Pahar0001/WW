import {
  BadRequestException,
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
import { ZodError } from 'zod';
import { UserRole } from '@prisma/client';
import { TripsService } from './trips.service';
import { CreateTripSchema, UpdateTripSchema } from './trips.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { Roles, CurrentUser, AuthUser } from '../auth/auth.decorators';
import { verifyToken } from '../../common/jwt';

// Decode a Bearer token if present (no error if absent) — for optional auth.
function optionalAccessor(req: any): { id: string; role: string } | null {
  const h: string = req.headers?.authorization ?? '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : null;
  if (!t) return null;
  const p = verifyToken(t);
  return p ? { id: p.sub, role: p.role } : null;
}

@Controller('trips')
class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  list() {
    return this.trips.list();
  }

  // Declared before ":slug" so it is not captured as a slug param.
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  mine(@CurrentUser() user: AuthUser) {
    return this.trips.listMine(user.id);
  }

  @Get(':slug')
  get(@Param('slug') slug: string, @Req() req: any) {
    return this.trips.getBySlug(slug, optionalAccessor(req));
  }

  // Automatic spend estimate. Optional ?travelers= & ?comfort=BUDGET|STANDARD|COMFORT.
  @Get(':slug/estimate')
  estimate(
    @Param('slug') slug: string,
    @Query('travelers') travelers: string | undefined,
    @Query('comfort') comfort: string | undefined,
    @Req() req: any,
  ) {
    const n = travelers ? parseInt(travelers, 10) : undefined;
    const c = comfort === 'BUDGET' || comfort === 'COMFORT' || comfort === 'STANDARD' ? comfort : undefined;
    return this.trips.estimateSpend(
      slug,
      { travelers: Number.isFinite(n as number) ? n : undefined, comfort: c },
      optionalAccessor(req),
    );
  }

  // Any authenticated user may create a trip. Non-admins are restricted to
  // PRIVATE trips (enforced in the service); only ADMIN+ can publish PUBLIC ones.
  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() body: unknown, @CurrentUser() user: AuthUser) {
    let input;
    try {
      input = CreateTripSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new BadRequestException(e.flatten());
      }
      throw e;
    }
    return this.trips.create(input, { id: user.id, role: user.role });
  }

  // Any authenticated user can copy a PUBLIC trip into their own PRIVATE copy.
  @Post(':slug/copy')
  @UseGuards(JwtAuthGuard)
  copy(@Param('slug') slug: string, @CurrentUser() user: AuthUser) {
    return this.trips.copyTrip(slug, user.id);
  }

  // Star rating (1–5). One per user per trip; upserts.
  @Post(':slug/rate')
  @UseGuards(JwtAuthGuard)
  rate(@Param('slug') slug: string, @Body() body: { stars?: number }, @CurrentUser() user: AuthUser) {
    const stars = Number(body?.stars);
    return this.trips.rate(slug, user.id, stars);
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN) // everyone except MEMBER
  update(@Param('slug') slug: string, @Body() body: unknown) {
    let input;
    try {
      input = UpdateTripSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) throw new BadRequestException(e.flatten());
      throw e;
    }
    return this.trips.update(slug, input);
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('slug') slug: string) {
    return this.trips.remove(slug);
  }
}

@Module({
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
