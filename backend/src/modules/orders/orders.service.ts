import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// «Заказать путешествие»: пользователь пишет пожелание своими словами,
// ИИ (Groq) конкретизирует его в структурированный бриф, заявка уходит админу.
// Real Data Policy: ИИ структурирует пожелание, но НЕ выдумывает цены/сроки —
// бюджет и даты берутся только из слов пользователя или помечаются вопросом.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const REFINE_PROMPT = `Ты — ассистент travel-сервиса Vela. Пользователь описал пожелание к путешествию
своими словами. Преврати его в короткий структурированный бриф для организатора на русском языке.

Формат (строго, без лишнего текста до и после):
Направление: …
Даты / сезон: …
Длительность: …
Путешественников: …
Бюджет: …
Стиль отдыха: …
Ключевые пожелания: …
Открытые вопросы: …

Правила:
- Заполняй поля ТОЛЬКО из слов пользователя. Чего нет в тексте — пиши «не указано»
  и добавь уточняющий вопрос в «Открытые вопросы».
- НИЧЕГО не выдумывай: ни цен, ни дат, ни отелей.
- «Открытые вопросы» — 2–4 коротких вопроса, которые помогут организатору
  подготовить маршрут (например: гражданство для визы, город вылета, даты).
- Пиши кратко: каждое поле — одна строка.`;

const STATUSES = ['NEW', 'IN_PROGRESS', 'DONE', 'DECLINED'] as const;
export type OrderStatus = (typeof STATUSES)[number];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger('OrdersService');
  private readonly apiKey = process.env.GROQ_API_KEY;
  private readonly model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  constructor(private readonly prisma: PrismaService) {}

  /** ИИ-конкретизация пожелания (без сохранения). Без ключа — честный null. */
  async refine(wish: string): Promise<{ brief: string | null; configured: boolean }> {
    const text = wish?.trim();
    if (!text || text.length < 10) {
      throw new BadRequestException('Опишите пожелание хотя бы парой предложений.');
    }
    if (!this.apiKey) return { brief: null, configured: false };
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          max_tokens: 500,
          messages: [
            { role: 'system', content: REFINE_PROMPT },
            { role: 'user', content: text.slice(0, 4000) },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        this.logger.error(`Groq refine ${res.status}`);
        return { brief: null, configured: true };
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const brief = data.choices?.[0]?.message?.content?.trim() || null;
      return { brief, configured: true };
    } catch {
      // ИИ недоступен — заявка всё равно может уйти с исходным текстом.
      return { brief: null, configured: true };
    }
  }

  /** Создать заявку (бриф — от ИИ, возможно отредактированный пользователем). */
  async create(userId: string, wish: string, brief?: string | null) {
    const text = wish?.trim();
    if (!text || text.length < 10) {
      throw new BadRequestException('Опишите пожелание хотя бы парой предложений.');
    }
    return this.prisma.tripOrder.create({
      data: {
        userId,
        wish: text.slice(0, 8000),
        brief: brief?.trim().slice(0, 8000) || null,
      },
    });
  }

  /** Мои заявки (новые сверху). */
  listMine(userId: string) {
    return this.prisma.tripOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Все заявки для админки (новые сверху; NEW — первыми). */
  listAll() {
    return this.prisma.tripOrder.findMany({
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { user: { select: { id: true, email: true, name: true } } },
    });
  }

  /** Кол-во новых заявок — бейдж в админке. */
  async countNew() {
    const count = await this.prisma.tripOrder.count({ where: { status: 'NEW' } });
    return { count };
  }

  /** Обновить статус/комментарий (ADMIN+). Комментарий виден пользователю. */
  async update(id: string, patch: { status?: string; adminNote?: string }) {
    const order = await this.prisma.tripOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Заявка не найдена');
    const status =
      patch.status && (STATUSES as readonly string[]).includes(patch.status)
        ? (patch.status as OrderStatus)
        : undefined;
    return this.prisma.tripOrder.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(patch.adminNote !== undefined && { adminNote: patch.adminNote?.slice(0, 4000) || null }),
      },
    });
  }
}
