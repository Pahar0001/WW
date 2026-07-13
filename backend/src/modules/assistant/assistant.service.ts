import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

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
}
