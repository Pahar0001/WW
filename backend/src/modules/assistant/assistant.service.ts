import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// AI travel consultant backed by Groq (OpenAI-compatible chat completions API).
// Focused on trip planning, visas and documents. Honours the Real Data Policy:
// it must not invent exact prices/times — give ranges and point to official
// sources. If GROQ_API_KEY is unset, the endpoint returns a graceful message.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `Ты — ИИ-консультант сервиса Vela (velatrips.ru) по планированию путешествий.
Помогаешь на русском языке: маршруты, визы, документы, сроки, порядок подачи, что взять с собой,
сезонность, логистика между городами.

Правила:
- Отвечай кратко, по делу, дружелюбно. Структурируй списками, когда уместно.
- НЕ выдумывай точные цены, курсы, сроки рассмотрения виз и расстояния. Если не уверен —
  говори это прямо и советуй проверить на официальном источнике (консульство, посольство,
  официальный визовый центр, авиаперевозчик).
- Визовые правила часто меняются и зависят от гражданства — всегда уточняй гражданство
  пользователя, если оно важно для ответа, и напоминай проверять актуальность на официальном сайте.
- Не давай юридических гарантий. Ты помощник, а не официальный источник.
- Если вопрос не про путешествия — вежливо верни к теме поездок.`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AssistantService {
  private readonly logger = new Logger('AssistantService');
  private readonly apiKey = process.env.GROQ_API_KEY;
  private readonly model = process.env.GROQ_MODEL || DEFAULT_MODEL;

  constructor(private readonly prisma: PrismaService) {}

  configured(): boolean {
    return Boolean(this.apiKey);
  }

  async chat(history: ChatMessage[]): Promise<{ reply: string }> {
    if (!this.apiKey) {
      return {
        reply:
          'ИИ-консультант ещё не подключён (не задан GROQ_API_KEY). Добавьте ключ Groq в переменные окружения — и я начну отвечать.',
      };
    }

    // Keep the last ~12 turns to bound the prompt size.
    const trimmed = history.slice(-12).map((m) => ({
      role: m.role,
      content: String(m.content).slice(0, 4000),
    }));

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.4,
          max_tokens: 900,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...trimmed],
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        this.logger.error(`Groq API ${res.status}: ${detail.slice(0, 300)}`);
        throw new ServiceUnavailableException('ИИ-консультант временно недоступен. Попробуйте позже.');
      }

      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const reply = data.choices?.[0]?.message?.content?.trim();
      if (!reply) throw new ServiceUnavailableException('Пустой ответ от ИИ. Попробуйте переформулировать.');
      return { reply };
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      this.logger.error(`Groq request failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Не удалось получить ответ ИИ. Попробуйте позже.');
    }
  }

  // ── Сохранённые диалоги (раздел /assistant) ──
  // Виджет остаётся stateless; здесь переписка живёт в БД и доступна с любого
  // устройства пользователя.

  listThreads(userId: string) {
    return this.prisma.assistantThread.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 100,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });
  }

  createThread(userId: string, title?: string | null) {
    return this.prisma.assistantThread.create({
      data: { userId, title: cleanTitle(title) || 'Новый диалог' },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });
  }

  /** Диалог целиком (сообщения по возрастанию времени). Только свой. */
  async getThread(userId: string, id: string) {
    const thread = await this.prisma.assistantThread.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, role: true, content: true, createdAt: true },
        },
      },
    });
    if (!thread) throw new NotFoundException('Диалог не найден');
    if (thread.userId !== userId) throw new ForbiddenException('Чужой диалог');
    return thread;
  }

  async renameThread(userId: string, id: string, title: string) {
    await this.assertOwner(userId, id);
    return this.prisma.assistantThread.update({
      where: { id },
      data: { title: cleanTitle(title) || 'Новый диалог' },
      select: { id: true, title: true, updatedAt: true },
    });
  }

  async deleteThread(userId: string, id: string) {
    await this.assertOwner(userId, id);
    await this.prisma.assistantThread.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Отправить сообщение в диалог: сохраняем реплику пользователя, спрашиваем
   * модель с учётом всей истории, сохраняем ответ. Возвращаем обе реплики,
   * чтобы фронт не перезапрашивал тред.
   */
  async sendToThread(userId: string, id: string, content: string) {
    const text = String(content ?? '').trim().slice(0, 4000);
    if (!text) throw new NotFoundException('Пустое сообщение');
    const thread = await this.getThread(userId, id);

    const history: ChatMessage[] = [
      ...thread.messages.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content,
      })),
      { role: 'user', content: text },
    ];

    const userMsg = await this.prisma.assistantMessage.create({
      data: { threadId: id, role: 'user', content: text },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    let reply: string;
    try {
      reply = (await this.chat(history)).reply;
    } catch (err) {
      // Реплика пользователя уже сохранена — не теряем её, но и «пустой»
      // ответ в историю не пишем.
      throw err;
    }

    const assistantMsg = await this.prisma.assistantMessage.create({
      data: { threadId: id, role: 'assistant', content: reply },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    // Первый вопрос задаёт название диалога — список слева читается осмысленно.
    const isFirst = thread.messages.length === 0;
    const updated = await this.prisma.assistantThread.update({
      where: { id },
      data: isFirst ? { title: cleanTitle(text) } : { updatedAt: new Date() },
      select: { id: true, title: true, updatedAt: true },
    });

    return { thread: updated, userMessage: userMsg, message: assistantMsg };
  }

  private async assertOwner(userId: string, id: string) {
    const t = await this.prisma.assistantThread.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!t) throw new NotFoundException('Диалог не найден');
    if (t.userId !== userId) throw new ForbiddenException('Чужой диалог');
  }
}

/** Заголовок диалога: одна строка, без markdown-мусора, до 60 символов. */
function cleanTitle(raw?: string | null): string {
  const s = String(raw ?? '')
    .replace(/\s+/g, ' ')
    .replace(/[*_`#]/g, '')
    .trim();
  if (!s) return '';
  return s.length > 60 ? `${s.slice(0, 57).trimEnd()}…` : s;
}
