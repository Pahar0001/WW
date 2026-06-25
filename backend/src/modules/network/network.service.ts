import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PUB = { id: true, name: true, email: true, image: true, bio: true } as const;

type Rel = 'none' | 'outgoing' | 'incoming' | 'friends';

@Injectable()
export class NetworkService {
  constructor(private readonly prisma: PrismaService) {}

  private async notify(userId: string, type: NotificationType, actorId: string) {
    if (userId === actorId) return;
    await this.prisma.notification.create({ data: { userId, type, actorId } });
  }

  private relFrom(fs: { requesterId: string; addresseeId: string; status: string }[], me: string, other: string): Rel {
    const f = fs.find(
      (x) => (x.requesterId === me && x.addresseeId === other) || (x.requesterId === other && x.addresseeId === me),
    );
    if (!f) return 'none';
    if (f.status === 'ACCEPTED') return 'friends';
    return f.requesterId === me ? 'outgoing' : 'incoming';
  }

  // ── People directory ──
  async users(meId: string, search?: string) {
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: meId },
        status: 'ACTIVE',
        ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] } : {}),
      },
      select: PUB,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const fs = await this.prisma.friendship.findMany({ where: { OR: [{ requesterId: meId }, { addresseeId: meId }] } });
    return users.map((u) => ({ ...u, relationship: this.relFrom(fs, meId, u.id) }));
  }

  // ── Public profile ──
  async profile(meId: string, id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { ...PUB, createdAt: true } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    const [posts, friendCount, fs] = await Promise.all([
      this.prisma.post.findMany({ where: { authorId: id }, orderBy: { createdAt: 'desc' }, take: 50, include: { author: { select: PUB } } }),
      this.prisma.friendship.count({ where: { status: 'ACCEPTED', OR: [{ requesterId: id }, { addresseeId: id }] } }),
      this.prisma.friendship.findMany({ where: { OR: [{ requesterId: meId }, { addresseeId: meId }] } }),
    ]);
    return { user, posts, friendCount, relationship: id === meId ? ('self' as const) : this.relFrom(fs, meId, id) };
  }

  // ── Friends ──
  async request(meId: string, otherId: string) {
    if (meId === otherId) throw new BadRequestException('Нельзя добавить себя');
    const existing = await this.prisma.friendship.findFirst({
      where: { OR: [{ requesterId: meId, addresseeId: otherId }, { requesterId: otherId, addresseeId: meId }] },
    });
    if (existing) {
      // They already requested me → accept it.
      if (existing.status === 'PENDING' && existing.addresseeId === meId) {
        await this.prisma.friendship.update({ where: { id: existing.id }, data: { status: 'ACCEPTED' } });
        await this.notify(existing.requesterId, 'FRIEND_ACCEPT', meId);
        return { status: 'friends' as Rel };
      }
      return { status: existing.status === 'ACCEPTED' ? ('friends' as Rel) : existing.requesterId === meId ? ('outgoing' as Rel) : ('incoming' as Rel) };
    }
    await this.prisma.friendship.create({ data: { requesterId: meId, addresseeId: otherId } });
    await this.notify(otherId, 'FRIEND_REQUEST', meId);
    return { status: 'outgoing' as Rel };
  }

  async accept(meId: string, otherId: string) {
    const f = await this.prisma.friendship.findFirst({ where: { requesterId: otherId, addresseeId: meId, status: 'PENDING' } });
    if (!f) throw new NotFoundException('Заявка не найдена');
    await this.prisma.friendship.update({ where: { id: f.id }, data: { status: 'ACCEPTED' } });
    await this.notify(otherId, 'FRIEND_ACCEPT', meId);
    return { status: 'friends' as Rel };
  }

  async remove(meId: string, otherId: string) {
    await this.prisma.friendship.deleteMany({
      where: { OR: [{ requesterId: meId, addresseeId: otherId }, { requesterId: otherId, addresseeId: meId }] },
    });
    return { ok: true };
  }

  async friends(meId: string) {
    const fs = await this.prisma.friendship.findMany({
      where: { OR: [{ requesterId: meId }, { addresseeId: meId }] },
      include: { requester: { select: PUB }, addressee: { select: PUB } },
      orderBy: { updatedAt: 'desc' },
    });
    const friends = fs.filter((f) => f.status === 'ACCEPTED').map((f) => (f.requesterId === meId ? f.addressee : f.requester));
    const incoming = fs.filter((f) => f.status === 'PENDING' && f.addresseeId === meId).map((f) => f.requester);
    const outgoing = fs.filter((f) => f.status === 'PENDING' && f.requesterId === meId).map((f) => f.addressee);
    return { friends, incoming, outgoing };
  }

  // ── Notifications ──
  async notifications(meId: string) {
    const items = await this.prisma.notification.findMany({ where: { userId: meId }, orderBy: { createdAt: 'desc' }, take: 50 });
    const actorIds = [...new Set(items.map((i) => i.actorId).filter((x): x is string => !!x))];
    const actors = await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: PUB });
    const byId = new Map(actors.map((a) => [a.id, a]));
    const unread = await this.prisma.notification.count({ where: { userId: meId, read: false } });
    return {
      items: items.map((i) => ({ ...i, actor: i.actorId ? byId.get(i.actorId) ?? null : null })),
      unread,
    };
  }
  async markRead(meId: string) {
    await this.prisma.notification.updateMany({ where: { userId: meId, read: false }, data: { read: true } });
    return { ok: true };
  }

  // ── Own profile ──
  myProfile(meId: string) {
    return this.prisma.user.findUnique({ where: { id: meId }, select: { ...PUB, role: true } });
  }
  updateProfile(meId: string, data: { name?: string; bio?: string; image?: string }) {
    return this.prisma.user.update({
      where: { id: meId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.image !== undefined && { image: data.image }),
      },
      select: { ...PUB, role: true },
    });
  }
}
