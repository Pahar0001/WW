import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ServiceRequestKind, ServiceRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Заявки на трансфер и парковку из раздела логистики.
 *
 * Это тот путь оформления, который не зависит ни от одного партнёра: человек
 * оставляет заявку у нас, админ видит её в админке и организует услугу. Виджет
 * и партнёрские ссылки могут быть не настроены или не покрывать город — заявка
 * работает всегда.
 *
 * ⚠️ ПДн. Адрес подачи и телефон — персональные данные, поэтому:
 *  · оба поля необязательны, без них заявка всё равно принимается;
 *  · заявку оставляет только авторизованный человек (связь через почту аккаунта);
 *  · длина полей ограничена — не место для произвольных данных;
 *  · состав описан в политике конфиденциальности.
 */

const KINDS = new Set<string>(Object.values(ServiceRequestKind));
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const IATA_RE = /^[A-Z]{3}$/;

export interface CreateServiceRequestInput {
  kind?: string;
  tripSlug?: string;
  airportIata?: string;
  serviceDate?: string;
  serviceTime?: string;
  pax?: number;
  pickup?: string;
  phone?: string;
  comment?: string;
}

/** Обрезаем и приводим к null: пустая строка в базе хуже отсутствия значения. */
const trim = (v: unknown, max: number): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s ? s.slice(0, max) : null;
};

@Injectable()
export class ServiceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: CreateServiceRequestInput) {
    const kind = String(input.kind ?? '');
    if (!KINDS.has(kind)) {
      throw new BadRequestException('Неизвестный тип заявки');
    }

    const airportIata = String(input.airportIata ?? '').toUpperCase();
    if (!IATA_RE.test(airportIata)) {
      throw new BadRequestException('Нужен код аэропорта из трёх латинских букв');
    }

    const serviceDate = String(input.serviceDate ?? '');
    if (!DATE_RE.test(serviceDate)) {
      throw new BadRequestException('Дата должна быть в формате ГГГГ-ММ-ДД');
    }
    // Заявка на вчера — это опечатка, а не заказ: принять её значит потратить
    // время админа и разочаровать человека.
    const today = new Date().toISOString().slice(0, 10);
    if (serviceDate < today) {
      throw new BadRequestException('Дата уже прошла — проверьте, пожалуйста');
    }

    const serviceTime = trim(input.serviceTime, 5);
    if (serviceTime && !TIME_RE.test(serviceTime)) {
      throw new BadRequestException('Время должно быть в формате ЧЧ:ММ');
    }

    const pax = Math.min(20, Math.max(1, Math.round(Number(input.pax) || 1)));

    return this.prisma.serviceRequest.create({
      data: {
        userId,
        kind: kind as ServiceRequestKind,
        tripSlug: trim(input.tripSlug, 120),
        airportIata,
        serviceDate,
        serviceTime,
        pax,
        pickup: trim(input.pickup, 300),
        phone: trim(input.phone, 32),
        comment: trim(input.comment, 1000),
      },
      select: {
        id: true,
        kind: true,
        status: true,
        airportIata: true,
        serviceDate: true,
        serviceTime: true,
        createdAt: true,
      },
    });
  }

  /** Свои заявки — человек должен видеть, что с ними стало. */
  listMine(userId: string) {
    return this.prisma.serviceRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  listAll() {
    return this.prisma.serviceRequest.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  countNew() {
    return this.prisma.serviceRequest
      .count({ where: { status: ServiceRequestStatus.NEW } })
      .then((count) => ({ count }));
  }

  async update(
    id: string,
    body: { status?: string; adminNote?: string; priceRub?: number | null },
  ) {
    const existing = await this.prisma.serviceRequest.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Заявка не найдена');

    const data: Record<string, unknown> = {};
    if (body.status) {
      if (!Object.values(ServiceRequestStatus).includes(body.status as ServiceRequestStatus)) {
        throw new BadRequestException('Неизвестный статус');
      }
      data.status = body.status;
    }
    if (body.adminNote !== undefined) data.adminNote = trim(body.adminNote, 2000);
    if (body.priceRub !== undefined) {
      data.priceRub =
        body.priceRub == null ? null : Math.max(0, Math.round(Number(body.priceRub) || 0));
    }

    return this.prisma.serviceRequest.update({ where: { id }, data });
  }
}
