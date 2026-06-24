import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'crypto';
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

  // ── Members (invite by email) ────────────────────────────
  async listMembers(slug: string) {
    const tripId = await this.tripId(slug);
    return this.prisma.tripMember.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    });
  }

  /** Add a participant by email. Existing user → added. New email → a pending
   *  account is created and an invite link (set-password) is emailed. */
  async inviteMember(slug: string, emailRaw: string) {
    const tripId = await this.tripId(slug);
    const email = emailRaw.toLowerCase().trim();
    let user = await this.prisma.user.findUnique({ where: { email } });
    let invited = false;
    if (!user) {
      const token = randomBytes(24).toString('hex');
      user = await this.prisma.user.create({
        data: { email, role: 'MEMBER', passwordResetToken: token, passwordResetExpiry: new Date(Date.now() + 7 * 86400000) },
      });
      invited = true;
      await this.email.send(
        email,
        'Приглашение в поездку — Vela',
        `<p>Вас пригласили участвовать в поездке на Vela. Задайте пароль и войдите:</p>
         <p><a href="${this.email.link(`/reset-password?token=${token}`)}">Установить пароль и присоединиться</a></p>`,
      );
    }
    const member = await this.prisma.tripMember.upsert({
      where: { tripId_userId: { tripId, userId: user.id } },
      update: {},
      create: { tripId, userId: user.id, role: 'MEMBER' },
      include: { user: { select: { id: true, email: true, name: true, role: true } } },
    });
    return { ...member, invited };
  }

  async removeMember(slug: string, userId: string) {
    const tripId = await this.tripId(slug);
    await this.prisma.tripMember.deleteMany({ where: { tripId, userId } });
    return { ok: true };
  }

  /** Change a member's role within the trip (ORGANIZER ↔ MEMBER). */
  async setMemberRole(slug: string, userId: string, role: 'ORGANIZER' | 'MEMBER') {
    const tripId = await this.tripId(slug);
    await this.prisma.tripMember.updateMany({ where: { tripId, userId }, data: { role } });
    return { ok: true, role };
  }

  // ── Expenses: shared-cost calculator (who owes whom) ─────
  /** Members + expenses + computed settlement (overall and per-day). */
  async expensesOverview(slug: string) {
    const tripId = await this.tripId(slug);
    const [members, expenses] = await Promise.all([
      this.prisma.tripMember.findMany({
        where: { tripId },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { id: true, email: true, name: true } } },
      }),
      this.prisma.expense.findMany({ where: { tripId }, orderBy: { date: 'asc' } }),
    ]);
    const memberList = members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email }));
    const settlement = this.computeSettlement(expenses);
    // Group by calendar day for the end-of-day report.
    const byDayMap = new Map<string, typeof expenses>();
    for (const e of expenses) {
      const k = e.date.toISOString().slice(0, 10);
      (byDayMap.get(k) ?? byDayMap.set(k, []).get(k)!).push(e);
    }
    const byDay = [...byDayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, es]) => ({
        date,
        total: es.reduce((s, e) => s + e.amount, 0),
        settlement: this.computeSettlement(es),
      }));
    return { members: memberList, expenses, settlement, byDay };
  }

  /** Log a shared expense. Defaults: payer = current user, participants = all
   *  members. Only real trip members may be payer/participants. */
  async createExpense(
    slug: string,
    data: { description: string; amount: number; currency?: string; date: string; paidById?: string; participants?: string[] },
    userId: string,
  ) {
    const tripId = await this.tripId(slug);
    const members = await this.prisma.tripMember.findMany({ where: { tripId }, select: { userId: true } });
    const memberIds = new Set(members.map((m) => m.userId));
    const paidById = data.paidById && memberIds.has(data.paidById) ? data.paidById : userId;
    let participants = (data.participants ?? []).filter((p) => memberIds.has(p));
    if (participants.length === 0) participants = [...memberIds]; // split among everyone
    return this.prisma.expense.create({
      data: {
        tripId,
        paidById,
        description: data.description,
        amount: data.amount,
        currency: data.currency ?? 'RUB',
        date: new Date(data.date),
        participants,
        createdById: userId,
      },
    });
  }

  deleteExpense(id: string) {
    return this.prisma.expense.delete({ where: { id } }).then(() => ({ ok: true }));
  }

  /**
   * Net balance per user (paid − owed share) plus a minimal set of transfers
   * that settles everyone up. Amounts are integer minor units (kopecks), so
   * each expense's remainder is distributed one unit at a time — no rounding drift.
   */
  private computeSettlement(expenses: { paidById: string; amount: number; participants: string[] }[]) {
    const net = new Map<string, number>();
    const add = (id: string, v: number) => net.set(id, (net.get(id) ?? 0) + v);
    for (const e of expenses) {
      const parts = e.participants ?? [];
      if (parts.length === 0) continue;
      const base = Math.floor(e.amount / parts.length);
      let rem = e.amount - base * parts.length;
      add(e.paidById, e.amount);
      for (const p of parts) {
        const share = base + (rem > 0 ? 1 : 0);
        if (rem > 0) rem--;
        add(p, -share);
      }
    }
    const balances = [...net.entries()].map(([userId, n]) => ({ userId, net: n }));
    const debtors = balances.filter((b) => b.net < 0).map((b) => ({ id: b.userId, amt: -b.net })).sort((a, b) => b.amt - a.amt);
    const creditors = balances.filter((b) => b.net > 0).map((b) => ({ id: b.userId, amt: b.net })).sort((a, b) => b.amt - a.amt);
    const transfers: { from: string; to: string; amount: number }[] = [];
    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(debtors[i].amt, creditors[j].amt);
      if (pay > 0) transfers.push({ from: debtors[i].id, to: creditors[j].id, amount: pay });
      debtors[i].amt -= pay;
      creditors[j].amt -= pay;
      if (debtors[i].amt === 0) i++;
      if (creditors[j].amt === 0) j++;
    }
    return { balances, transfers };
  }

  // ── Memories: albums, photos, diary, timeline ────────────
  async memoriesOverview(slug: string) {
    const tripId = await this.tripId(slug);
    const [albums, memories] = await Promise.all([
      this.prisma.album.findMany({
        where: { tripId },
        orderBy: { createdAt: 'desc' },
        include: { photos: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.memory.findMany({ where: { tripId }, orderBy: { date: 'desc' } }),
    ]);
    return { albums, memories };
  }

  async createAlbum(slug: string, title: string, userId: string) {
    const tripId = await this.tripId(slug);
    if (!title?.trim()) throw new BadRequestException('Нужно название альбома');
    return this.prisma.album.create({ data: { tripId, title: title.trim(), createdById: userId } });
  }
  deleteAlbum(id: string) {
    return this.prisma.album.delete({ where: { id } }).then(() => ({ ok: true }));
  }

  async addPhoto(albumId: string, data: { url: string; caption?: string; takenAt?: string }, userId: string) {
    const album = await this.prisma.album.findUnique({ where: { id: albumId } });
    if (!album) throw new NotFoundException('Альбом не найден');
    const photo = await this.prisma.photo.create({
      data: { albumId, url: data.url, caption: data.caption, takenAt: data.takenAt ? new Date(data.takenAt) : null, createdById: userId },
    });
    if (!album.coverUrl) await this.prisma.album.update({ where: { id: albumId }, data: { coverUrl: data.url } });
    return photo;
  }
  deletePhoto(id: string) {
    return this.prisma.photo.delete({ where: { id } }).then(() => ({ ok: true }));
  }

  async createMemory(slug: string, data: any, userId: string) {
    const tripId = await this.tripId(slug);
    return this.prisma.memory.create({
      data: {
        tripId,
        title: data.title,
        text: data.text,
        date: new Date(data.date),
        location: data.location,
        photos: data.photos ?? [],
        createdById: userId,
      },
    });
  }
  deleteMemory(id: string) {
    return this.prisma.memory.delete({ where: { id } }).then(() => ({ ok: true }));
  }

  /** Chronological feed: memories + photos + calendar events. */
  async timeline(slug: string) {
    const tripId = await this.tripId(slug);
    const [memories, photos, events] = await Promise.all([
      this.prisma.memory.findMany({ where: { tripId } }),
      this.prisma.photo.findMany({ where: { album: { tripId } }, include: { album: { select: { title: true } } } }),
      this.prisma.calendarEvent.findMany({ where: { tripId } }),
    ]);
    const items = [
      ...memories.map((m) => ({ kind: 'memory' as const, date: m.date, title: m.title, text: m.text, location: m.location, photos: m.photos })),
      ...photos.map((p) => ({ kind: 'photo' as const, date: p.takenAt ?? p.createdAt, title: p.caption ?? p.album.title, url: p.url })),
      ...events.map((e) => ({ kind: 'event' as const, date: e.startAt, title: e.title, type: e.type, location: e.location })),
    ];
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
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
