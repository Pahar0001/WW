import { Injectable, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  objectType?: string;
  objectId?: string;
  ip?: string;
  meta?: Record<string, unknown>;
}

/** Append-only audit log. Never throws into the caller's flow. */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          objectType: entry.objectType,
          objectId: entry.objectId,
          ip: entry.ip,
          meta: entry.meta as any,
        },
      });
    } catch {
      /* auditing must not break the request */
    }
  }
}

@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
