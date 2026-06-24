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
const HotelIn = z.object({
  name: z.string().min(1),
  cityLabel: z.string().optional(),
  address: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  checkIn: z.string().optional(),
  checkOut: z.string().optional(),
  url: z.string().optional(),
  area: z.string().optional(),
  priceNote: z.string().optional(),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
  photos: z.array(z.string()).optional(),
});
const ChatIn = z.object({ text: z.string().min(1).max(2000) });
const InviteIn = z.object({ email: z.string().email() });
const RoleIn = z.object({ role: z.enum(['ORGANIZER', 'MEMBER']) });
const AlbumIn = z.object({ title: z.string().min(1) });
const PhotoIn = z.object({ url: z.string().min(1), caption: z.string().optional(), takenAt: z.string().optional() });
const MemoryIn = z.object({
  title: z.string().min(1),
  text: z.string().min(1),
  date: z.string().min(1),
  location: z.string().optional(),
  photos: z.array(z.string()).optional(),
});
const ExpenseIn = z.object({
  description: z.string().min(1).max(200),
  amount: z.coerce.number().int().positive(), // minor units (kopecks)
  currency: z.string().optional(),
  date: z.string().min(1),
  paidById: z.string().optional(),
  participants: z.array(z.string()).optional(),
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

  // ── Hotels ──
  @Post('trips/:slug/hotels')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  createHotel(@Param('slug') slug: string, @Body() body: unknown) {
    return this.svc.createHotel(slug, parse(HotelIn, body));
  }

  @Delete('hotels/:id')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  deleteHotel(@Param('id') id: string) {
    return this.svc.deleteHotel(id);
  }

  // ── Chat (any authenticated user can read/post) ──
  @Get('trips/:slug/chat')
  chat(@Param('slug') slug: string, @Query('since') since?: string) {
    return this.svc.listChat(slug, since);
  }

  @Post('trips/:slug/chat')
  postChat(@Param('slug') slug: string, @Body() body: unknown, @CurrentUser() u: AuthUser) {
    return this.svc.postChat(slug, parse(ChatIn, body).text, u.id);
  }

  // ── Members (invite by email) — organizer/admin ──
  @Get('trips/:slug/members')
  members(@Param('slug') slug: string) {
    return this.svc.listMembers(slug);
  }

  @Post('trips/:slug/members')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  invite(@Param('slug') slug: string, @Body() body: unknown) {
    return this.svc.inviteMember(slug, parse(InviteIn, body).email);
  }

  @Delete('trips/:slug/members/:userId')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  removeMember(@Param('slug') slug: string, @Param('userId') userId: string) {
    return this.svc.removeMember(slug, userId);
  }

  @Patch('trips/:slug/members/:userId/role')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  setMemberRole(@Param('slug') slug: string, @Param('userId') userId: string, @Body() body: unknown) {
    return this.svc.setMemberRole(slug, userId, parse(RoleIn, body).role);
  }

  // ── Expenses: shared-cost calculator (any trip member) ──
  @Get('trips/:slug/expenses')
  expenses(@Param('slug') slug: string) {
    return this.svc.expensesOverview(slug);
  }

  @Post('trips/:slug/expenses')
  createExpense(@Param('slug') slug: string, @Body() body: unknown, @CurrentUser() u: AuthUser) {
    return this.svc.createExpense(slug, parse(ExpenseIn, body), u.id);
  }

  @Delete('expenses/:id')
  deleteExpense(@Param('id') id: string) {
    return this.svc.deleteExpense(id);
  }

  // ── Memories: albums, photos, diary, timeline ──
  @Get('trips/:slug/memories')
  memories(@Param('slug') slug: string) {
    return this.svc.memoriesOverview(slug);
  }

  @Get('trips/:slug/timeline')
  timeline(@Param('slug') slug: string) {
    return this.svc.timeline(slug);
  }

  @Post('trips/:slug/albums')
  createAlbum(@Param('slug') slug: string, @Body() body: unknown, @CurrentUser() u: AuthUser) {
    return this.svc.createAlbum(slug, parse(AlbumIn, body).title, u.id);
  }

  @Delete('albums/:id')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  deleteAlbum(@Param('id') id: string) {
    return this.svc.deleteAlbum(id);
  }

  @Post('albums/:id/photos')
  addPhoto(@Param('id') id: string, @Body() body: unknown, @CurrentUser() u: AuthUser) {
    return this.svc.addPhoto(id, parse(PhotoIn, body), u.id);
  }

  @Delete('photos/:id')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  deletePhoto(@Param('id') id: string) {
    return this.svc.deletePhoto(id);
  }

  @Post('trips/:slug/memories')
  createMemory(@Param('slug') slug: string, @Body() body: unknown, @CurrentUser() u: AuthUser) {
    return this.svc.createMemory(slug, parse(MemoryIn, body), u.id);
  }

  @Delete('memories/:id')
  @UseGuards(RolesGuard) @Roles(UserRole.ORGANIZER, UserRole.ADMIN)
  deleteMemory(@Param('id') id: string) {
    return this.svc.deleteMemory(id);
  }
}

@Module({
  imports: [EmailModule],
  controllers: [PlanningController],
  providers: [PlanningService],
})
export class PlanningModule {}
