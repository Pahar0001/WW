import { Controller, Get, Module } from '@nestjs/common';
import { Public } from '../auth/auth.decorators';

/**
 * Курсы валют ЦБ РФ — официальный источник, без ключей.
 *
 * GET /api/currency/rates → { date, rates: { USD: 78.5, THB: 2.31, … } },
 * где значение — рубли за ОДНУ единицу валюты (VunitRate). Кэш 6 часов:
 * ЦБ публикует курс раз в день. XML в windows-1251 — берём только
 * ASCII-поля (CharCode/VunitRate), имена валют не нужны.
 *
 * Real Data Policy: курс реальный, официальный → VERIFIED + дата ЦБ.
 */

const CBR_URL = 'https://www.cbr.ru/scripts/XML_daily.asp';
const CACHE_TTL = 6 * 3600 * 1000;

interface Rates {
  source: 'cbr.ru';
  dataStatus: 'VERIFIED';
  date: string; // дата курса ЦБ (ДД.ММ.ГГГГ)
  fetchedAt: string;
  rates: Record<string, number>; // RUB за 1 единицу валюты
}

@Controller('currency')
class CurrencyController {
  private cache: { at: number; data: Rates } | null = null;

  @Get('rates')
  @Public()
  async rates(): Promise<Rates | { rates: null }> {
    if (this.cache && Date.now() - this.cache.at < CACHE_TTL) return this.cache.data;
    try {
      const res = await fetch(CBR_URL, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // windows-1251: декодируем стандартным TextDecoder (Node 18+ поддерживает).
      const buf = await res.arrayBuffer();
      const xml = new TextDecoder('windows-1251').decode(buf);

      const date = xml.match(/<ValCurs Date="([^"]+)"/)?.[1] ?? '';
      const rates: Record<string, number> = {};
      const re =
        /<Valute[^>]*>[\s\S]*?<CharCode>([A-Z]{3})<\/CharCode>[\s\S]*?<VunitRate>([\d.,]+)<\/VunitRate>[\s\S]*?<\/Valute>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(xml))) {
        const v = parseFloat(m[2].replace(',', '.'));
        if (Number.isFinite(v) && v > 0) rates[m[1]] = v;
      }
      if (Object.keys(rates).length === 0) throw new Error('пустой ответ');

      const data: Rates = {
        source: 'cbr.ru',
        dataStatus: 'VERIFIED',
        date,
        fetchedAt: new Date().toISOString(),
        rates,
      };
      this.cache = { at: Date.now(), data };
      return data;
    } catch {
      // ЦБ недоступен: отдаём прошлый кэш, а без него — честное «нет данных».
      return this.cache?.data ?? { rates: null };
    }
  }
}

@Module({ controllers: [CurrencyController] })
export class CurrencyModule {}
