import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { ConsentKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LegalService } from '../legal/legal.service';

export interface NotificationPrefs {
  notifyNews: boolean;
  notifyRoutes: boolean;
  notifyOffers: boolean;
  notifyReminders: boolean;
}

/** Рекламные каналы — их нельзя включить без действующего согласия на рекламу. */
const MARKETING_CHANNELS = ['notifyNews', 'notifyRoutes', 'notifyOffers'] as const;

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly legal: LegalService,
  ) {}

  async notifications(userId: string): Promise<NotificationPrefs> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notifyNews: true, notifyRoutes: true, notifyOffers: true, notifyReminders: true },
    });
    if (!u) throw new UnauthorizedException();
    return u;
  }

  /**
   * Обновить настройки уведомлений.
   *
   * Включить рекламный канал без действующего согласия нельзя — проверяем здесь,
   * а не только в интерфейсе: ст. 18 ФЗ «О рекламе» требует предварительного
   * согласия, и запрет должен держаться, даже если запрос пришёл мимо формы.
   */
  async setNotifications(userId: string, patch: Partial<NotificationPrefs>) {
    const wantsMarketing = MARKETING_CHANNELS.some((k) => patch[k] === true);
    if (wantsMarketing) {
      const state = await this.legal.current(userId);
      const marketing = state.find((s) => s.kind === ConsentKind.MARKETING);
      if (!marketing?.granted) {
        throw new ForbiddenException(
          'Чтобы получать рассылки, сначала дайте согласие на их получение в настройках',
        );
      }
    }
    const data: Record<string, boolean> = { ...patch };
    // Воскресный дайджест — это и есть канал «новые маршруты». Держим старый
    // рубильник в согласии с новым: ссылка «отписаться» из ранее отправленных
    // писем правит digestOptOut и обязана работать вечно.
    if (patch.notifyRoutes !== undefined) data.digestOptOut = !patch.notifyRoutes;

    const u = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: { notifyNews: true, notifyRoutes: true, notifyOffers: true, notifyReminders: true },
    });
    await this.audit.log({
      userId,
      action: 'account.notifications',
      objectType: 'user',
      objectId: userId,
    });
    return u;
  }

  /**
   * Выгрузка данных пользователя (ст. 14 152-ФЗ — право знать, что о тебе
   * обрабатывается). Отдаём JSON; файлы-вложения перечисляем ссылками, сами
   * байты в выгрузку не кладём — иначе ответ станет неподъёмным.
   */
  async exportData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        bio: true,
        role: true,
        status: true,
        emailVerified: true,
        termsAcceptedAt: true,
        digestOptOut: true,
        notifyNews: true,
        notifyRoutes: true,
        notifyOffers: true,
        notifyReminders: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new UnauthorizedException();

    const [
      consents,
      savedTrips,
      memberships,
      tripOrders,
      serviceRequests,
      posts,
      comments,
      likes,
      reposts,
      memories,
      albums,
      expenses,
      visitedCountries,
      communityMessages,
      chatMessages,
      supportMessages,
      assistantThreads,
      notifications,
      friendships,
      auditLogs,
    ] = await Promise.all([
      this.prisma.consent.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: { kind: true, granted: true, version: true, source: true, createdAt: true },
      }),
      // У SavedTrip нет связи на Trip (только tripId без внешнего ключа) —
      // отдаём идентификатор и сохранённый снимок варианта как есть.
      this.prisma.savedTrip.findMany({
        where: { userId },
        select: { tripId: true, snapshot: true, createdAt: true },
      }),
      this.prisma.tripMember.findMany({
        where: { userId },
        select: { role: true, createdAt: true, trip: { select: { slug: true, title: true } } },
      }),
      this.prisma.tripOrder.findMany({ where: { userId } }),
      // Заявки на трансфер и парковку: там может лежать адрес подачи и телефон,
      // то есть ровно те данные, ради которых выгрузку и запрашивают.
      this.prisma.serviceRequest.findMany({ where: { userId } }),
      this.prisma.post.findMany({ where: { authorId: userId } }),
      this.prisma.comment.findMany({ where: { userId } }),
      this.prisma.like.findMany({ where: { userId } }),
      this.prisma.repost.findMany({ where: { userId } }),
      this.prisma.memory.findMany({ where: { createdById: userId } }),
      this.prisma.album.findMany({ where: { createdById: userId } }),
      this.prisma.expense.findMany({ where: { paidById: userId } }),
      this.prisma.visitedCountry.findMany({ where: { userId }, select: { code: true, createdAt: true } }),
      this.prisma.communityMessage.findMany({ where: { userId } }),
      this.prisma.conversationMessage.findMany({ where: { authorId: userId } }),
      this.prisma.supportMessage.findMany({ where: { userId } }),
      this.prisma.assistantThread.findMany({
        where: { userId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
      this.prisma.notification.findMany({ where: { userId } }),
      this.prisma.friendship.findMany({
        where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
      }),
      this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        take: 1000,
      }),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      format: 'vela-account-export/1',
      note:
        'Выгрузка персональных данных аккаунта Vela. Загруженные файлы (фото, ' +
        'голосовые сообщения, документы) в файл не включены — они доступны по ' +
        'ссылкам вида /api/uploads/<id>, пока аккаунт не удалён.',
      user,
      consents,
      savedTrips,
      memberships,
      tripOrders,
      serviceRequests,
      social: { posts, comments, likes, reposts },
      travel: { memories, albums, expenses, visitedCountries },
      messages: { communityMessages, chatMessages, supportMessages },
      assistantThreads,
      notifications,
      friendships,
      auditLogs,
    };
  }

  /**
   * Самостоятельное удаление аккаунта (ст. 21 152-ФЗ). Требуем пароль: удаление
   * необратимо, а токен может быть угнан. Связанные записи уходят каскадом,
   * авторство в общих поездках обнуляется (onDelete: SetNull в схеме).
   */
  async deleteAccount(userId: string, password: string, ip?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (!user.passwordHash) throw new BadRequestException('У аккаунта не задан пароль');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Неверный пароль');

    // Последнего супер-админа удалять нельзя: администрировать станет некому,
    // а восстановить доступ можно только через переменные окружения и рестарт.
    if (user.role === 'SUPER_ADMIN') {
      const others = await this.prisma.user.count({
        where: { role: 'SUPER_ADMIN', id: { not: userId } },
      });
      if (others === 0) {
        throw new ForbiddenException(
          'Это последний супер-администратор — сначала назначьте другого',
        );
      }
    }

    // Пишем в журнал ДО удаления: сама запись переживёт пользователя
    // (AuditLog.userId → SetNull), и факт удаления останется зафиксирован.
    await this.audit.log({
      userId,
      action: 'account.delete',
      objectType: 'user',
      objectId: userId,
      ip,
    });
    await this.prisma.user.delete({ where: { id: userId } });
    return { ok: true };
  }
}
