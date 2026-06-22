import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class PlanningService implements OnModuleInit {
  private readonly logger = new Logger('PlanningService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // Background reminder worker: every 60s, send any due, unsent reminders.
  onModuleInit() {
    setInterval(() => this.processDueReminders().catch(() => {}), 60_000);
  }

  private async tripId(slug: string): Promise<string> {
    const trip = await this.prisma.trip.findUnique({ where: { slug }, select: { id: true } });
    if (!trip) throw new NotFoundException('Поездка не найдена');
    return trip.id;
  }

  /** Everything needed for the planner page. */
  async overview(slug: string) {
    const tripId = await this.tripId(slug);
    const [tickets, documents, events, hotels] = await Promise.all([
      this.prisma.ticket.findMany({ where: { tripId }, orderBy: { departAt: 'asc' } }),
      this.prisma.tripDocument.findMany({ where: { tripId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.calendarEvent.findMany({
        where: { tripId },
        orderBy: { startAt: 'asc' },
        include: { reminders: true },
      }),
      this.prisma.hotel.findMany({ where: { tripId }, orderBy: { checkIn: 'asc' } }),
    ]);
    return { tickets, documents, events, hotels };
  }

  // ── Hotels ───────────────────────────────────────────────
  async createHotel(slug: string, data: any) {
    const tripId = await this.tripId(slug);
    return this.prisma.hotel.create({
      data: {
        tripId,
        name: data.name,
        cityLabel: data.cityLabel,
        address: data.address,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        checkIn: data.checkIn ? new Date(data.checkIn) : null,
        checkOut: data.checkOut ? new Date(data.checkOut) : null,
        url: data.url,
        area: data.area,
        priceNote: data.priceNote,
        notes: data.notes,
        photoUrl: data.photoUrl,
        photos: data.photos ?? [],
        source: 'cms-user-input',
        dataStatus: 'VERIFIED',
      },
    });
  }
  deleteHotel(id: string) {
    return this.prisma.hotel.delete({ where: { id } }).then(() => ({ ok: true }));
  }

  // ── Chat (HTTP polling) ──────────────────────────────────
  async listChat(slug: string, sinceISO?: string) {
    const tripId = await this.tripId(slug);
    return this.prisma.chatMessage.findMany({
      where: { tripId, ...(sinceISO ? { createdAt: { gt: new Date(sinceISO) } } : {}) },
      orderBy: { createdAt: 'asc' },
      take: 200,
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }
  async postChat(slug: string, text: string, userId: string) {
    const tripId = await this.tripId(slug);
    return this.prisma.chatMessage.create({
      data: { tripId, userId, text },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  // ── Tickets ──────────────────────────────────────────────
  async createTicket(slug: string, data: any, userId: string) {
    const tripId = await this.tripId(slug);
    return this.prisma.ticket.create({
      data: {
        tripId,
        kind: data.kind ?? 'FLIGHT',
        carrier: data.carrier,
        code: data.code,
        fromLocation: data.fromLocation,
        toLocation: data.toLocation,
        departAt: data.departAt ? new Date(data.departAt) : null,
        arriveAt: data.arriveAt ? new Date(data.arriveAt) : null,
        seat: data.seat,
        notes: data.notes,
        fileUrl: data.fileUrl,
        createdById: userId,
      },
    });
  }
  deleteTicket(id: string) {
    return this.prisma.ticket.delete({ where: { id } }).then(() => ({ ok: true }));
  }

  // ── Documents ────────────────────────────────────────────
  async createDocument(slug: string, data: any, userId: string) {
    const tripId = await this.tripId(slug);
    return this.prisma.tripDocument.create({
      data: {
        tripId,
        title: data.title,
        category: data.category,
        fileUrl: data.fileUrl,
        mime: data.mime,
        createdById: userId,
      },
    });
  }
  deleteDocument(id: string) {
    return this.prisma.tripDocument.delete({ where: { id } }).then(() => ({ ok: true }));
  }

  // ── Calendar events (with reminders) ─────────────────────
  async createEvent(slug: string, data: any, userId: string) {
    const tripId = await this.tripId(slug);
    return this.prisma.calendarEvent.create({
      data: {
        tripId,
        type: data.type ?? 'OTHER',
        title: data.title,
        startAt: new Date(data.startAt),
        endAt: data.endAt ? new Date(data.endAt) : null,
        location: data.location,
        notes: data.notes,
        createdById: userId,
        reminders: data.reminders?.length
          ? { create: data.reminders.map((m: number) => ({ offsetMinutes: m })) }
          : undefined,
      },
      include: { reminders: true },
    });
  }
  deleteEvent(id: string) {
    return this.prisma.calendarEvent.delete({ where: { id } }).then(() => ({ ok: true }));
  }

  // ── Reminder worker ──────────────────────────────────────
  private async processDueReminders() {
    const now = new Date();
    const due = await this.prisma.reminder.findMany({
      where: { sent: false, channel: 'EMAIL', event: { startAt: { gte: now } } },
      include: { event: { include: { createdBy: { select: { email: true } }, trip: { select: { title: true, slug: true } } } } },
      take: 50,
    });
    for (const r of due) {
      const fireAt = new Date(r.event.startAt.getTime() - r.offsetMinutes * 60_000);
      if (fireAt > now) continue; // not yet
      const to = r.event.createdBy?.email;
      if (to) {
        await this.email.send(
          to,
          `Напоминание: ${r.event.title}`,
          `<p>Событие «${r.event.title}» в поездке «${r.event.trip.title}» начинается ${r.event.startAt.toLocaleString('ru-RU')}.</p>`,
        );
      }
      await this.prisma.reminder.update({ where: { id: r.id }, data: { sent: true, sentAt: new Date() } });
      this.logger.log(`Reminder sent for event ${r.eventId}`);
    }
  }
}
