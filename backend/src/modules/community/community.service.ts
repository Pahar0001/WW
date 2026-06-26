import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { COMMUNITY_COUNTRIES, getCommunityCountry, isCommunityCountry } from '../../common/countries';

interface Accessor { id: string; role: string }

const author = { select: { id: true, name: true, email: true, image: true } };

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  /** All country rooms with message counts + last-activity, for the room list. */
  async rooms() {
    const grouped = await this.prisma.communityMessage.groupBy({
      by: ['country'],
      _count: { _all: true },
      _max: { createdAt: true },
    });
    const stats = new Map(grouped.map((g) => [g.country, g]));
    return COMMUNITY_COUNTRIES.map((c) => {
      const s = stats.get(c.code);
      return {
        ...c,
        messages: s?._count._all ?? 0,
        lastActivity: s?._max.createdAt ?? null,
      };
    }).sort((a, b) => {
      const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
      const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
      if (tb !== ta) return tb - ta;
      return a.name.localeCompare(b.name, 'ru');
    });
  }

  private assertCountry(country: string) {
    if (!isCommunityCountry(country)) throw new NotFoundException('Неизвестная страна');
  }

  /** Country room: top-level questions/posts (newest first) each with its replies. */
  async messages(country: string) {
    this.assertCountry(country);
    const meta = getCommunityCountry(country)!;
    const all = await this.prisma.communityMessage.findMany({
      where: { country },
      orderBy: { createdAt: 'asc' },
      include: { user: author },
      take: 1000,
    });
    const repliesByParent = new Map<string, typeof all>();
    const tops: typeof all = [];
    for (const m of all) {
      if (m.parentId) {
        (repliesByParent.get(m.parentId) ?? repliesByParent.set(m.parentId, []).get(m.parentId)!).push(m);
      } else {
        tops.push(m);
      }
    }
    const threads = tops
      .map((t) => ({ ...t, replies: repliesByParent.get(t.id) ?? [] }))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { country: meta, threads };
  }

  /** Post a question (parentId omitted) or an answer to one (parentId set). */
  async post(userId: string, country: string, text: string, parentId?: string) {
    this.assertCountry(country);
    const body = text.trim();
    if (!body) throw new BadRequestException('Пустое сообщение');
    if (parentId) {
      const parent = await this.prisma.communityMessage.findUnique({ where: { id: parentId } });
      if (!parent || parent.country !== country) throw new BadRequestException('Сообщение, на которое вы отвечаете, не найдено');
      if (parent.parentId) throw new BadRequestException('Нельзя отвечать на ответ');
    }
    return this.prisma.communityMessage.create({
      data: { country, userId, text: body, parentId: parentId ?? null },
      include: { user: author },
    });
  }

  /** Delete a message (author or admin). Deleting a question cascades its replies. */
  async remove(id: string, accessor: Accessor) {
    const msg = await this.prisma.communityMessage.findUnique({ where: { id } });
    if (!msg) return { ok: true };
    const isAdmin = accessor.role === 'ADMIN' || accessor.role === 'SUPER_ADMIN';
    if (msg.userId !== accessor.id && !isAdmin) throw new ForbiddenException('Можно удалять только свои сообщения');
    await this.prisma.communityMessage.delete({ where: { id } });
    return { ok: true };
  }
}
