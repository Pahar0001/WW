import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Мессенджер: личные (1:1) и групповые чаты.
// Доставка — поллинг с фронта (as-is для free-tier без WebSocket);
// kind у сообщений — задел под голосовые и кружки (файлы лягут в Upload).

const MEMBER_SELECT = {
  userId: true,
  role: true,
  lastReadAt: true,
  user: { select: { id: true, name: true, email: true, image: true, lastSeenAt: true } },
} as const;

const MESSAGE_SELECT = {
  id: true,
  authorId: true,
  kind: true,
  text: true,
  uploadId: true,
  createdAt: true,
  author: { select: { id: true, name: true, email: true, image: true } },
} as const;

@Injectable()
export class ChatsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Мои чаты: последнее сообщение, собеседники, число непрочитанных. */
  async list(meId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: { members: { some: { userId: meId } } },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      include: {
        members: { select: MEMBER_SELECT },
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: MESSAGE_SELECT },
      },
    });

    // Непрочитанные одним запросом на все чаты (иначе N+1 при 100 чатах).
    const my = new Map(
      rows.map((c) => [c.id, c.members.find((m) => m.userId === meId)?.lastReadAt ?? new Date(0)]),
    );
    const unreadRows = rows.length
      ? await Promise.all(
          rows.map((c) =>
            this.prisma.conversationMessage.count({
              where: {
                conversationId: c.id,
                createdAt: { gt: my.get(c.id) },
                NOT: { authorId: meId },
              },
            }),
          ),
        )
      : [];

    return rows.map((c, i) => ({
      id: c.id,
      isGroup: c.isGroup,
      title: c.title,
      image: c.image,
      updatedAt: c.updatedAt,
      members: c.members,
      lastMessage: c.messages[0] ?? null,
      unread: unreadRows[i] ?? 0,
    }));
  }

  /** Суммарные непрочитанные (бейдж в навигации). */
  async unreadTotal(meId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId: meId },
      select: { conversationId: true, lastReadAt: true },
    });
    if (memberships.length === 0) return { unread: 0 };
    const counts = await Promise.all(
      memberships.map((m) =>
        this.prisma.conversationMessage.count({
          where: {
            conversationId: m.conversationId,
            createdAt: { gt: m.lastReadAt },
            NOT: { authorId: meId },
          },
        }),
      ),
    );
    return { unread: counts.reduce((a, b) => a + b, 0) };
  }

  /** Найти или создать личный чат с пользователем. */
  async direct(meId: string, otherId: string) {
    if (!otherId || otherId === meId) throw new BadRequestException('Не с кем начать чат');
    const other = await this.prisma.user.findUnique({ where: { id: otherId }, select: { id: true } });
    if (!other) throw new NotFoundException('Пользователь не найден');

    const existing = await this.prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: meId } } },
          { members: { some: { userId: otherId } } },
        ],
      },
      select: { id: true },
    });
    if (existing) return { id: existing.id, created: false };

    const conv = await this.prisma.conversation.create({
      data: {
        isGroup: false,
        createdBy: meId,
        members: { create: [{ userId: meId }, { userId: otherId }] },
      },
      select: { id: true },
    });
    return { id: conv.id, created: true };
  }

  /** Создать групповой чат. Создатель — OWNER. */
  async createGroup(meId: string, title: string, memberIds: string[]) {
    const name = String(title ?? '').trim().slice(0, 80);
    if (!name) throw new BadRequestException('У группы должно быть название');
    const ids = Array.from(new Set((memberIds ?? []).filter((id) => id && id !== meId))).slice(0, 50);
    if (ids.length === 0) throw new BadRequestException('Добавьте хотя бы одного участника');
    const found = await this.prisma.user.count({ where: { id: { in: ids } } });
    if (found !== ids.length) throw new BadRequestException('Некоторые пользователи не найдены');

    const conv = await this.prisma.conversation.create({
      data: {
        isGroup: true,
        title: name,
        createdBy: meId,
        members: {
          create: [{ userId: meId, role: 'OWNER' }, ...ids.map((userId) => ({ userId }))],
        },
      },
      select: { id: true },
    });
    return { id: conv.id, created: true };
  }

  /** Чат целиком (шапка + участники). Только для участника. */
  async get(meId: string, id: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id },
      include: { members: { select: MEMBER_SELECT } },
    });
    if (!conv) throw new NotFoundException('Чат не найден');
    if (!conv.members.some((m) => m.userId === meId)) throw new ForbiddenException('Вы не участник чата');
    return conv;
  }

  /** Сообщения: последние limit до курсора before (поллинг — after). */
  async messages(meId: string, id: string, opts: { before?: string; after?: string }) {
    await this.assertMember(meId, id);
    const { before, after } = opts;
    if (after) {
      // Поллинг новых: всё, что позже метки.
      const rows = await this.prisma.conversationMessage.findMany({
        where: { conversationId: id, createdAt: { gt: new Date(after) } },
        orderBy: { createdAt: 'asc' },
        take: 200,
        select: MESSAGE_SELECT,
      });
      return rows;
    }
    const rows = await this.prisma.conversationMessage.findMany({
      where: {
        conversationId: id,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: MESSAGE_SELECT,
    });
    return rows.reverse();
  }

  /**
   * Отправить сообщение: текст, голосовое (VOICE) или кружок (VIDEO_NOTE).
   * Для медиа uploadId — файл в Upload (кладётся через POST /uploads), text —
   * необязательная подпись.
   */
  async send(
    meId: string,
    id: string,
    text: string,
    media?: { kind: 'VOICE' | 'VIDEO_NOTE'; uploadId: string } | null,
  ) {
    const body = String(text ?? '').trim().slice(0, 4000);
    if (!body && !media) throw new BadRequestException('Пустое сообщение');
    await this.assertMember(meId, id);
    if (media) {
      // uploadId должен существовать: битые ссылки на файл в чате хуже ошибки.
      const up = await this.prisma.upload.findUnique({
        where: { id: media.uploadId },
        select: { id: true },
      });
      if (!up) throw new BadRequestException('Файл сообщения не найден');
    }
    const [msg] = await this.prisma.$transaction([
      this.prisma.conversationMessage.create({
        data: {
          conversationId: id,
          authorId: meId,
          kind: media?.kind ?? 'TEXT',
          text: body || null,
          uploadId: media?.uploadId ?? null,
        },
        select: MESSAGE_SELECT,
      }),
      // Чат всплывает наверх списка; своё прочитано автоматически.
      this.prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } }),
      this.prisma.conversationMember.updateMany({
        where: { conversationId: id, userId: meId },
        data: { lastReadAt: new Date() },
      }),
    ]);
    return msg;
  }

  /** Отметить чат прочитанным. */
  async markRead(meId: string, id: string) {
    await this.assertMember(meId, id);
    await this.prisma.conversationMember.updateMany({
      where: { conversationId: id, userId: meId },
      data: { lastReadAt: new Date() },
    });
    return { ok: true };
  }

  /** Переименовать группу (только OWNER). */
  async rename(meId: string, id: string, title: string) {
    const conv = await this.get(meId, id);
    if (!conv.isGroup) throw new BadRequestException('Личный чат нельзя переименовать');
    this.assertOwner(conv, meId);
    const name = String(title ?? '').trim().slice(0, 80);
    if (!name) throw new BadRequestException('Название не может быть пустым');
    await this.prisma.conversation.update({ where: { id }, data: { title: name } });
    return { ok: true, title: name };
  }

  /** Добавить участника в группу (только OWNER). */
  async addMember(meId: string, id: string, userId: string) {
    const conv = await this.get(meId, id);
    if (!conv.isGroup) throw new BadRequestException('В личный чат нельзя добавить участника');
    this.assertOwner(conv, meId);
    if (conv.members.some((m) => m.userId === userId)) return { ok: true };
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('Пользователь не найден');
    await this.prisma.conversationMember.create({ data: { conversationId: id, userId } });
    return { ok: true };
  }

  /** Выйти из чата (из группы; личный чат просто скрывать не умеем — выходим тоже). */
  async leave(meId: string, id: string) {
    const conv = await this.get(meId, id);
    await this.prisma.conversationMember.deleteMany({
      where: { conversationId: id, userId: meId },
    });
    // Пустая группа удаляется, чтобы не копить мусор.
    const left = await this.prisma.conversationMember.count({ where: { conversationId: id } });
    if (left === 0) await this.prisma.conversation.delete({ where: { id: conv.id } }).catch(() => undefined);
    return { ok: true };
  }

  private async assertMember(meId: string, id: string) {
    const m = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId: id, userId: meId } },
      select: { id: true },
    });
    if (!m) throw new ForbiddenException('Вы не участник чата');
  }

  private assertOwner(conv: { members: { userId: string; role: string }[] }, meId: string) {
    const me = conv.members.find((m) => m.userId === meId);
    if (!me || me.role !== 'OWNER') throw new ForbiddenException('Только владелец группы');
  }
}
