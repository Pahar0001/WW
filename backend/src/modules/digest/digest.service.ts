import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

/**
 * Воскресный email-дайджест (15:00 по Москве).
 *
 * Планировщик — внутрипроцессный, с «догоном»: каждые 10 минут проверяем,
 * наступил ли слот этой недели (вс 15:00 МСК) и не отправляли ли уже
 * (метка в SystemState — переживает рестарты). Если сервис в момент слота
 * спал (free-тариф Render) — письмо уйдёт при первом пробуждении после 15:00.
 *
 * Содержимое — только реальные данные платформы: новые маршруты недели и
 * самые просматриваемые (TripView). Отписка — подписанная HMAC-ссылка в
 * письме + тумблер в профиле; письма только подтверждённым адресам.
 */

const CHECK_EVERY_MS = 10 * 60 * 1000;
const STATE_KEY = 'digest.lastSentSlot';
const MSK_OFFSET_H = 3; // Москва: UTC+3, без переходов
const SEND_DOW = 0; // воскресенье
const SEND_HOUR = 15;

/** Идентификатор слота недели: дата ближайшего прошедшего «вс 15:00 МСК». */
function currentSlot(now = new Date()): string | null {
  const msk = new Date(now.getTime() + MSK_OFFSET_H * 3600 * 1000);
  // Сколько дней назад было воскресенье (в МСК)?
  const dow = msk.getUTCDay();
  const daysSinceSunday = (dow - SEND_DOW + 7) % 7;
  const slot = new Date(msk);
  slot.setUTCDate(msk.getUTCDate() - daysSinceSunday);
  slot.setUTCHours(SEND_HOUR, 0, 0, 0);
  if (slot.getTime() > msk.getTime()) return null; // слот этой недели ещё не наступил
  return slot.toISOString().slice(0, 10); // YYYY-MM-DD воскресенья
}

@Injectable()
export class DigestService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('DigestService');
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  onModuleInit() {
    // Первый чек — через минуту после старта (даём подняться БД/сиду).
    setTimeout(() => this.tick().catch(() => undefined), 60 * 1000);
    this.timer = setInterval(() => this.tick().catch(() => undefined), CHECK_EVERY_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Подпись ссылки отписки: не даёт отписывать чужие адреса перебором id. */
  sign(userId: string): string {
    const secret = process.env.JWT_SECRET ?? 'dev-insecure-secret-change-me';
    return createHmac('sha256', secret).update(`digest:${userId}`).digest('base64url');
  }

  verify(userId: string, token: string): boolean {
    const a = Buffer.from(this.sign(userId));
    const b = Buffer.from(String(token ?? ''));
    return a.length === b.length && timingSafeEqual(a, b);
  }

  async setOptOut(userId: string, optOut: boolean) {
    await this.prisma.user.update({ where: { id: userId }, data: { digestOptOut: optOut } });
    return { ok: true, optOut };
  }

  async getOptOut(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { digestOptOut: true },
    });
    return { optOut: u?.digestOptOut ?? false };
  }

  private async tick() {
    if (this.running) return;
    const slot = currentSlot();
    if (!slot) return;
    const state = await this.prisma.systemState.findUnique({ where: { key: STATE_KEY } });
    if (state?.value === slot) return; // на этой неделе уже отправляли

    this.running = true;
    try {
      // Метку ставим ДО рассылки: перезапуск посреди отправки не должен
      // привести к повторным письмам всей базе (лучше недослать, чем задвоить).
      await this.prisma.systemState.upsert({
        where: { key: STATE_KEY },
        update: { value: slot },
        create: { key: STATE_KEY, value: slot },
      });
      await this.sendDigest(slot);
    } finally {
      this.running = false;
    }
  }

  /** Тест: собрать дайджест и отправить только одному пользователю (админу). */
  async sendTestTo(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!u) return { ok: false };
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [newTrips, topViewed] = await Promise.all([
      this.prisma.trip.findMany({
        where: { createdAt: { gte: weekAgo }, visibility: 'PUBLIC', status: 'PUBLISHED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { slug: true, title: true, durationDays: true, country: { select: { name: true } } },
      }),
      this.prisma.$queryRaw<{ slug: string; title: string; country: string; views: bigint }[]>`
        SELECT t."slug", t."title", c."name" AS country, count(v.*)::bigint AS views
        FROM "TripView" v
        JOIN "Trip" t ON t."id" = v."tripId" AND t."visibility" = 'PUBLIC'
        JOIN "Country" c ON c."id" = t."countryId"
        WHERE v."createdAt" >= ${weekAgo}
        GROUP BY t."slug", t."title", c."name"
        ORDER BY views DESC
        LIMIT 3`,
    ]);
    await this.email.send(u.email, 'Vela — маршруты недели (тест)', this.render(u, newTrips, topViewed));
    return { ok: true, newTrips: newTrips.length, topViewed: topViewed.length };
  }

  /** Собрать и разослать дайджест за неделю до слота. */
  async sendDigest(slot: string) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

    const [newTrips, topViewed] = await Promise.all([
      this.prisma.trip.findMany({
        where: {
          createdAt: { gte: weekAgo },
          visibility: 'PUBLIC',
          status: 'PUBLISHED',
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          slug: true,
          title: true,
          durationDays: true,
          country: { select: { name: true } },
        },
      }),
      this.prisma.$queryRaw<{ slug: string; title: string; country: string; views: bigint }[]>`
        SELECT t."slug", t."title", c."name" AS country, count(v.*)::bigint AS views
        FROM "TripView" v
        JOIN "Trip" t ON t."id" = v."tripId" AND t."visibility" = 'PUBLIC'
        JOIN "Country" c ON c."id" = t."countryId"
        WHERE v."createdAt" >= ${weekAgo}
        GROUP BY t."slug", t."title", c."name"
        ORDER BY views DESC
        LIMIT 3`,
    ]);

    if (newTrips.length === 0 && topViewed.length === 0) {
      this.logger.log(`Дайджест ${slot}: за неделю нет материала — не отправляем.`);
      return;
    }

    const recipients = await this.prisma.user.findMany({
      where: { emailVerified: true, status: 'ACTIVE', digestOptOut: false },
      select: { id: true, email: true, name: true },
    });
    this.logger.log(`Дайджест ${slot}: получателей ${recipients.length}.`);

    for (const u of recipients) {
      const html = this.render(u, newTrips, topViewed);
      // Последовательно с паузой: не упираемся в rate-limit Resend.
      await this.email.send(u.email, 'Vela — маршруты недели', html);
      await new Promise((r) => setTimeout(r, 600));
    }
    this.logger.log(`Дайджест ${slot}: отправка завершена.`);
  }

  private render(
    user: { id: string; name: string | null },
    newTrips: { slug: string; title: string; durationDays: number; country: { name: string } }[],
    topViewed: { slug: string; title: string; country: string; views: bigint }[],
  ): string {
    const gold = '#c9a55f';
    const link = (p: string) => this.email.link(p);
    const item = (href: string, title: string, meta: string) =>
      `<tr><td style="padding:10px 0;border-bottom:1px solid #eee6d8;">
        <a href="${href}" style="color:#2b241c;text-decoration:none;font-size:16px;font-weight:600;">${title}</a>
        <div style="color:#8d8272;font-size:13px;margin-top:2px;">${meta}</div>
      </td></tr>`;

    const newBlock = newTrips.length
      ? `<h2 style="font-size:14px;letter-spacing:2px;text-transform:uppercase;color:${gold};margin:28px 0 6px;">Новые маршруты</h2>
         <table width="100%" cellpadding="0" cellspacing="0">${newTrips
           .map((t) => item(link(`/trips/${t.slug}`), t.title, `${t.country.name} · ${t.durationDays} дн.`))
           .join('')}</table>`
      : '';

    const topBlock = topViewed.length
      ? `<h2 style="font-size:14px;letter-spacing:2px;text-transform:uppercase;color:${gold};margin:28px 0 6px;">Читают на этой неделе</h2>
         <table width="100%" cellpadding="0" cellspacing="0">${topViewed
           .map((t) => item(link(`/trips/${t.slug}`), t.title, t.country))
           .join('')}</table>`
      : '';

    const unsub = link(`/api/digest/unsubscribe?u=${user.id}&t=${this.sign(user.id)}`);
    return `<!doctype html><html><body style="margin:0;background:#f5efe3;font-family:Arial,Helvetica,sans-serif;color:#2b241c;">
      <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
        <div style="font-size:26px;font-family:Georgia,serif;">Vela</div>
        <p style="margin:18px 0 0;font-size:15px;line-height:1.5;">
          ${user.name ? `${user.name}, з` : 'З'}дравствуйте! Короткий воскресный дайджест — что нового на платформе за неделю.
        </p>
        ${newBlock}
        ${topBlock}
        <p style="margin:30px 0 0;">
          <a href="${link('/')}" style="display:inline-block;background:${gold};color:#241c10;text-decoration:none;padding:12px 22px;border-radius:999px;font-size:14px;font-weight:600;">Открыть Vela</a>
        </p>
        <p style="margin:34px 0 0;color:#8d8272;font-size:12px;line-height:1.5;">
          Вы получили письмо, потому что зарегистрированы на velatrips.ru.
          <a href="${unsub}" style="color:#8d8272;">Отписаться от дайджеста</a>
        </p>
      </div>
    </body></html>`;
  }
}
