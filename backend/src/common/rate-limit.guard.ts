import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const RATE_LIMIT_KEY = 'vela:rate-limit';

export interface RateLimitOptions {
  /** Сколько запросов разрешено в окне. */
  limit: number;
  /** Длина окна в миллисекундах. */
  windowMs: number;
}

/**
 * Ограничитель частоты на конкретный обработчик:
 *
 *   @RateLimit({ limit: 10, windowMs: 5 * 60_000 })
 *
 * Без декоратора обработчик не ограничивается.
 */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options);

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Ограничение частоты запросов, в памяти процесса.
 *
 * Почему без библиотеки: `@nestjs/throttler` тянет зависимость ради счётчика в
 * тридцать строк, а любая новая зависимость в этом проекте уже роняла прод —
 * образ собирается без lock-файла и разрешает версии заново (§12.1 хендоффа).
 *
 * Почему в памяти: API работает одним экземпляром (Render free), общего Redis
 * нет. ⚠️ При переходе на несколько экземпляров счётчик станет
 * «на экземпляр» — тогда его нужно вынести в общее хранилище.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, Bucket>();
  /** Порог, после которого выметаем протухшие корзины. */
  private static readonly SWEEP_AT = 5000;

  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!options) return true;

    const req = ctx.switchToHttp().getRequest();
    const now = Date.now();
    const key = `${req.method} ${req.route?.path ?? req.url}|${clientIp(req)}`;

    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      if (this.buckets.size > RateLimitGuard.SWEEP_AT) this.sweep(now);
      return true;
    }

    bucket.count += 1;
    if (bucket.count > options.limit) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      const res = ctx.switchToHttp().getResponse();
      res?.setHeader?.('Retry-After', String(retryAfter));
      throw new HttpException(
        `Слишком много запросов. Попробуйте через ${retryAfter} с.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private sweep(now: number) {
    for (const [k, b] of this.buckets) {
      if (b.resetAt <= now) this.buckets.delete(k);
    }
  }
}

/**
 * Адрес клиента для счётчика.
 *
 * Берём `req.ip`, а НЕ левый элемент `X-Forwarded-For`: заголовок присылает сам
 * клиент, прокси лишь дописывает к нему свой адрес, поэтому левый элемент
 * подделывается тривиально — и ограничитель обходится сменой одной строки в
 * запросе. `req.ip` при `trust proxy = 1` (выставлен в main.ts) — это адрес,
 * который увидел балансировщик Render, подделать его клиент не может.
 */
function clientIp(req: any): string {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}
