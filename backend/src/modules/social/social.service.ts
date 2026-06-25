import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SocialTarget, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const AUTHOR = { id: true, name: true, email: true, image: true } as const;

@Injectable()
export class SocialService {
  constructor(private readonly prisma: PrismaService) {}

  /** Fire a notification (never to yourself). */
  private async notify(userId: string, type: NotificationType, actorId: string, targetType?: SocialTarget, targetId?: string) {
    if (userId === actorId) return;
    await this.prisma.notification.create({ data: { userId, type, actorId, targetType, targetId } });
  }
  private async tripOrganizers(tripId: string): Promise<string[]> {
    const ms = await this.prisma.tripMember.findMany({ where: { tripId, role: 'ORGANIZER' }, select: { userId: true } });
    return ms.map((m) => m.userId);
  }

  // ── Feed of public trips ──
  async feed(meId?: string) {
    const trips = await this.prisma.trip.findMany({
      where: { status: 'PUBLISHED', visibility: 'PUBLIC' },
      include: { country: true, scores: true },
      orderBy: { createdAt: 'desc' },
    });
    const ids = trips.map((t) => t.id);
    const [likes, comments, reposts, myLikes, myReposts] = await Promise.all([
      this.prisma.like.groupBy({ by: ['targetId'], where: { targetType: 'TRIP', targetId: { in: ids } }, _count: { _all: true } }),
      this.prisma.comment.groupBy({ by: ['targetId'], where: { targetType: 'TRIP', targetId: { in: ids } }, _count: { _all: true } }),
      this.prisma.repost.groupBy({ by: ['tripId'], where: { tripId: { in: ids } }, _count: { _all: true } }),
      meId ? this.prisma.like.findMany({ where: { userId: meId, targetType: 'TRIP', targetId: { in: ids } }, select: { targetId: true } }) : Promise.resolve([]),
      meId ? this.prisma.repost.findMany({ where: { userId: meId, tripId: { in: ids } }, select: { tripId: true } }) : Promise.resolve([]),
    ]);
    const lc = new Map(likes.map((x) => [x.targetId, x._count._all]));
    const cc = new Map(comments.map((x) => [x.targetId, x._count._all]));
    const rc = new Map(reposts.map((x) => [x.tripId, x._count._all]));
    const ml = new Set(myLikes.map((x) => x.targetId));
    const mr = new Set(myReposts.map((x) => x.tripId));
    return trips.map((t) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      subtitle: t.subtitle,
      heroImage: t.heroImage,
      summary: t.summary,
      durationDays: t.durationDays,
      seasonLabel: t.seasonLabel,
      country: t.country ? { name: t.country.name } : null,
      likes: lc.get(t.id) ?? 0,
      comments: cc.get(t.id) ?? 0,
      reposts: rc.get(t.id) ?? 0,
      likedByMe: ml.has(t.id),
      repostedByMe: mr.has(t.id),
    }));
  }

  // ── News (user microblog) ──
  async news(meId?: string) {
    const posts = await this.prisma.post.findMany({ include: { author: { select: AUTHOR } }, orderBy: { createdAt: 'desc' }, take: 100 });
    const ids = posts.map((p) => p.id);
    const [likes, comments, myLikes] = await Promise.all([
      this.prisma.like.groupBy({ by: ['targetId'], where: { targetType: 'POST', targetId: { in: ids } }, _count: { _all: true } }),
      this.prisma.comment.groupBy({ by: ['targetId'], where: { targetType: 'POST', targetId: { in: ids } }, _count: { _all: true } }),
      meId ? this.prisma.like.findMany({ where: { userId: meId, targetType: 'POST', targetId: { in: ids } }, select: { targetId: true } }) : Promise.resolve([]),
    ]);
    const lc = new Map(likes.map((x) => [x.targetId, x._count._all]));
    const cc = new Map(comments.map((x) => [x.targetId, x._count._all]));
    const ml = new Set(myLikes.map((x) => x.targetId));
    return posts.map((p) => ({
      ...p,
      likes: lc.get(p.id) ?? 0,
      comments: cc.get(p.id) ?? 0,
      likedByMe: ml.has(p.id),
    }));
  }

  createPost(authorId: string, text: string, imageUrl?: string) {
    return this.prisma.post.create({ data: { authorId, text, imageUrl }, include: { author: { select: AUTHOR } } });
  }

  async deletePost(id: string, user: { id: string; role: string }) {
    const post = await this.prisma.post.findUnique({ where: { id }, select: { authorId: true } });
    if (!post) throw new NotFoundException('Пост не найден');
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    if (post.authorId !== user.id && !isAdmin) throw new ForbiddenException('Нет прав');
    await this.prisma.post.delete({ where: { id } });
    return { ok: true };
  }

  // ── Likes (toggle) ──
  async toggleLike(userId: string, targetType: SocialTarget, targetId: string) {
    const existing = await this.prisma.like.findUnique({
      where: { userId_targetType_targetId: { userId, targetType, targetId } },
    });
    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.like.create({ data: { userId, targetType, targetId } });
      if (targetType === 'POST') {
        const p = await this.prisma.post.findUnique({ where: { id: targetId }, select: { authorId: true } });
        if (p) await this.notify(p.authorId, 'LIKE', userId, 'POST', targetId);
      } else {
        for (const o of await this.tripOrganizers(targetId)) await this.notify(o, 'LIKE', userId, 'TRIP', targetId);
      }
    }
    const count = await this.prisma.like.count({ where: { targetType, targetId } });
    return { liked: !existing, count };
  }

  // ── Comments ──
  listComments(targetType: SocialTarget, targetId: string) {
    return this.prisma.comment.findMany({
      where: { targetType, targetId },
      include: { user: { select: AUTHOR } },
      orderBy: { createdAt: 'asc' },
    });
  }
  async addComment(userId: string, targetType: SocialTarget, targetId: string, text: string) {
    const c = await this.prisma.comment.create({
      data: { userId, targetType, targetId, text },
      include: { user: { select: AUTHOR } },
    });
    if (targetType === 'POST') {
      const p = await this.prisma.post.findUnique({ where: { id: targetId }, select: { authorId: true } });
      if (p) await this.notify(p.authorId, 'COMMENT', userId, 'POST', targetId);
    } else {
      for (const o of await this.tripOrganizers(targetId)) await this.notify(o, 'COMMENT', userId, 'TRIP', targetId);
    }
    return c;
  }
  async deleteComment(id: string, user: { id: string; role: string }) {
    const c = await this.prisma.comment.findUnique({ where: { id }, select: { userId: true } });
    if (!c) throw new NotFoundException('Комментарий не найден');
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    if (c.userId !== user.id && !isAdmin) throw new ForbiddenException('Нет прав');
    await this.prisma.comment.delete({ where: { id } });
    return { ok: true };
  }

  // ── Reposts (toggle) ──
  async toggleRepost(userId: string, tripId: string) {
    const existing = await this.prisma.repost.findUnique({ where: { userId_tripId: { userId, tripId } } });
    if (existing) {
      await this.prisma.repost.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.repost.create({ data: { userId, tripId } });
      for (const o of await this.tripOrganizers(tripId)) await this.notify(o, 'REPOST', userId, 'TRIP', tripId);
    }
    const count = await this.prisma.repost.count({ where: { tripId } });
    return { reposted: !existing, count };
  }
}
