import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Support chat: a 1:1 thread between each user and the platform's super admins.
 * Threads are keyed by the requesting user; staff replies are marked
 * `fromSupport`. Transport is HTTP + polling, mirroring the trip chat.
 */
@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Messages in the current user's own thread. */
  myThread(userId: string, sinceISO?: string) {
    return this.prisma.supportMessage.findMany({
      where: { userId, ...(sinceISO ? { createdAt: { gt: new Date(sinceISO) } } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** A user posts into their own thread. */
  postFromUser(userId: string, text: string) {
    return this.prisma.supportMessage.create({
      data: { userId, authorId: userId, fromSupport: false, text },
    });
  }

  /** Admin: list all threads with their last message + owner info. */
  async listThreads() {
    const groups = await this.prisma.supportMessage.groupBy({
      by: ['userId'],
      _max: { createdAt: true },
      _count: { _all: true },
    });
    groups.sort((a, b) => (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0));
    const users = await this.prisma.user.findMany({
      where: { id: { in: groups.map((g) => g.userId) } },
      select: { id: true, email: true, name: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));
    const threads = await Promise.all(
      groups.map(async (g) => {
        const last = await this.prisma.supportMessage.findFirst({
          where: { userId: g.userId },
          orderBy: { createdAt: 'desc' },
        });
        return {
          user: userById.get(g.userId) ?? { id: g.userId, email: '—', name: null },
          lastText: last?.text ?? '',
          lastAt: g._max.createdAt,
          fromSupport: last?.fromSupport ?? false,
          count: g._count._all,
        };
      }),
    );
    return threads;
  }

  /** Admin: messages in a specific user's thread. */
  threadMessages(ownerId: string, sinceISO?: string) {
    return this.prisma.supportMessage.findMany({
      where: { userId: ownerId, ...(sinceISO ? { createdAt: { gt: new Date(sinceISO) } } : {}) },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Admin: reply into a user's thread. */
  postFromSupport(ownerId: string, adminId: string, text: string) {
    return this.prisma.supportMessage.create({
      data: { userId: ownerId, authorId: adminId, fromSupport: true, text },
    });
  }
}
