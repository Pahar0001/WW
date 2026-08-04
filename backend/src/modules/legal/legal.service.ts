import { Injectable } from '@nestjs/common';
import { ConsentKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  DOCUMENT_VERSIONS,
  REQUIRED_CONSENTS,
  currentVersionFor,
} from './versions';

export interface ConsentInput {
  kind: ConsentKind;
  granted: boolean;
  /** Редакция, которую пользователь ВИДЕЛ на экране. */
  version: string;
}

export interface ConsentContext {
  source?: string;
  ip?: string;
  userAgent?: string;
}

/** Текущее состояние одного вида согласия. */
export interface ConsentState {
  kind: ConsentKind;
  granted: boolean;
  version: string | null;
  at: Date | null;
  /** Согласие есть, но по устаревшей редакции документа → спросить заново. */
  outdated: boolean;
}

@Injectable()
export class LegalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  versions() {
    return {
      documents: DOCUMENT_VERSIONS,
      required: REQUIRED_CONSENTS,
    };
  }

  /**
   * Записать согласия. Каждая запись — НОВАЯ строка, включая отзыв: прошлые не
   * трогаем, иначе доказать, на что человек соглашался раньше, будет нечем.
   *
   * Версию берём ту, что прислал клиент (её человек видел), но только если она
   * известна нам как редакция соответствующего документа. Иначе в базу попадёт
   * произвольная строка от клиента и «доказательство» перестанет что-либо
   * значить — подставляем текущую и помечаем источник.
   */
  async record(userId: string, entries: ConsentInput[], ctx: ConsentContext = {}) {
    const known = new Set<string>(Object.values(DOCUMENT_VERSIONS));
    const rows: Prisma.ConsentCreateManyInput[] = entries.map((e) => ({
      userId,
      kind: e.kind,
      granted: e.granted,
      version: known.has(e.version) ? e.version : currentVersionFor(e.kind),
      source: ctx.source ?? null,
      ip: ctx.ip ?? null,
      // Длинные UA обрезаем: доказательственной ценности хвост не добавляет,
      // а строка приходит от клиента и ничем не ограничена.
      userAgent: ctx.userAgent ? ctx.userAgent.slice(0, 512) : null,
    }));
    if (rows.length === 0) return { ok: true, recorded: 0 };

    await this.prisma.consent.createMany({ data: rows });

    // `termsAcceptedAt` остаётся быстрым флагом для гейта — держим в согласии
    // с историей: принял → ставим время, отозвал → снимаем, и окно вернётся.
    const terms = entries.filter((e) => e.kind === ConsentKind.TERMS).pop();
    if (terms) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { termsAcceptedAt: terms.granted ? new Date() : null },
      });
    }

    // Отзыв согласия на рекламу обязан гасить сами рассылки, а не только
    // строку в истории: иначе письма продолжат уходить после отзыва.
    const marketing = entries.filter((e) => e.kind === ConsentKind.MARKETING).pop();
    if (marketing && !marketing.granted) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { notifyNews: false, notifyRoutes: false, notifyOffers: false, digestOptOut: true },
      });
    }

    for (const e of entries) {
      await this.audit.log({
        userId,
        action: e.granted ? 'consent.grant' : 'consent.revoke',
        objectType: 'consent',
        objectId: e.kind,
        ip: ctx.ip,
      });
    }
    return { ok: true, recorded: rows.length };
  }

  /** Текущее состояние по каждому виду согласия — последняя строка выигрывает. */
  async current(userId: string): Promise<ConsentState[]> {
    const rows = await this.prisma.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return Object.values(ConsentKind).map((kind) => {
      const last = rows.find((r) => r.kind === kind);
      return {
        kind,
        granted: last?.granted ?? false,
        version: last?.version ?? null,
        at: last?.createdAt ?? null,
        outdated: Boolean(last?.granted) && last!.version !== currentVersionFor(kind),
      };
    });
  }

  /** Каких обязательных согласий не хватает (нет вовсе или редакция устарела). */
  async missingRequired(userId: string): Promise<ConsentKind[]> {
    const state = await this.current(userId);
    return REQUIRED_CONSENTS.filter((kind) => {
      const s = state.find((x) => x.kind === kind);
      return !s || !s.granted || s.outdated;
    });
  }

  /** История для страницы настроек: что и когда пользователь подписывал. */
  async history(userId: string, take = 50) {
    const rows = await this.prisma.consent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take,
      // ip и userAgent наружу не отдаём: это данные для разбирательства,
      // а не для экрана настроек.
      select: { kind: true, granted: true, version: true, source: true, createdAt: true },
    });
    return rows;
  }
}
