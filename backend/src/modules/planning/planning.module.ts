import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z, ZodError } from 'zod';
import { UserRole } from '@prisma/client';
import { EmailModule } from '../email/email.service';
import { PlanningService } from './planning.service';
import { JwtAuthGuard, RolesGuard } from '../auth/auth.guards';
import { Roles, CurrentUser, AuthUser } from '../auth/auth.decorators';

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  try {
    return schema.parse(body);
  } catch (e) {
    if (e instanceof ZodError) throw new BadRequestException(e.flatten());
    throw e;
  }
}

const TicketIn = z.object({
  kind: z.enum(['FLIGHT', 'TRAIN', 'BUS', 'FERRY', 'OTHER']).optional(),
  carrier: z.string().optional(),
  code: z.string().optional(),
  fromLocation: z.string().optional(),
  toLocation: z.string().optional(),
  departAt: z.string().optional(),
  arriveAt: z.string().optional(),
  seat: z.string().optional(),
  notes: z.string().optional(),
  fileUrl: z.string().optional(),
});
const DocIn = z.object({
  title: z.string().min(1),
  category: z.string().optional(),
  fileUrl: z.string().min(1),
  mime: z.string().optional(),
});
const EventIn = z.object({
  type: z.enum(['FLIGHT', 'HOTEL_CHECKIN', 'HOTEL_CHECKOUT', 'EXCURSION', 'MEETING', 'REMINDER', 'OTHER']).optional(),
  title: z.string().min(1),
  startAt: z.string().min(1),
  endAt: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  reminders: z.array(z.coerce.number().int().positive()).optional(), // minutes before
});

// Reads require login; writes require ORGANIZER+ (SUPER_ADMIN passes).
@Controller()
@UseGuards(JwtAuthGuard)
class PlanningController {
  constructor(private readonly svc: PlanningService) {}

  @Get('trips/:slug/planning')
  overview(@Param('slug') slug: string) {
    return this.svc.overview(slug);
  }

  @Post('trips/:slug/tickets')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  createTicket(@Param('slug') slug: string, @Body() body: unknown, @CurrentUser() u: AuthUser) {
    return this.svc.createTicket(slug, parse(TicketIn, body), u.id);
  }

  @Delete('tickets/:id')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  deleteTicket(@Param('id') id: string) {
    return this.svc.deleteTicket(id);
  }

  @Post('trips/:slug/documents')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  createDoc(@Param('slug') slug: string, @Body() body: unknown, @CurrentUser() u: AuthUser) {
    return this.svc.createDocument(slug, parse(DocIn, body), u.id);
  }

  @Delete('documents/:id')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  deleteDoc(@Param('id') id: string) {
    return this.svc.deleteDocument(id);
  }

  @Post('trips/:slug/events')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  createEvent(@Param('slug') slug: string, @Body() body: unknown, @CurrentUser() u: AuthUser) {
    return this.svc.createEvent(slug, parse(EventIn, body), u.id);
  }

  @Delete('events/:id')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  deleteEvent(@Param('id') id: string) {
    return this.svc.deleteEvent(id);
  }
}

@Module({
  imports: [EmailModule],
  controllers: [PlanningController],
  providers: [PlanningService],
})
export class PlanningModule {}
