import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { UserRole } from '@prisma/client';
import { TripsService } from './trips.service';
import { CreateTripSchema } from './trips.dto';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { Roles } from '../auth/auth.decorators';
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

  @Get(':slug')
  get(@Param('slug') slug: string, @Req() req: any) {
    return this.trips.getBySlug(slug, optionalAccessor(req));
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  create(@Body() body: unknown) {
    let input;
    try {
      input = CreateTripSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new BadRequestException(e.flatten());
      }
      throw e;
    }
    return this.trips.create(input);
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
