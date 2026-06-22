import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import { z } from 'zod';

// First-party, privacy-respecting analytics. No third-party trackers.
// In-memory ring buffer here for the reference build; swap for a table or a
// time-series store in production (interface stays the same).
const Event = z.object({
  name: z.string().min(1),
  path: z.string().optional(),
  props: z.record(z.any()).optional(),
  ts: z.number().optional(),
});
type Event = z.infer<typeof Event>;

class AnalyticsService {
  private readonly buffer: Event[] = [];
  private readonly max = 5000;

  track(e: Event) {
    this.buffer.push({ ...e, ts: e.ts ?? Date.now() });
    if (this.buffer.length > this.max) this.buffer.shift();
    return { accepted: true };
  }

  summary() {
    const counts: Record<string, number> = {};
    for (const e of this.buffer) counts[e.name] = (counts[e.name] ?? 0) + 1;
    return { total: this.buffer.length, byEvent: counts };
  }
}

@Controller('analytics')
class AnalyticsController {
  private readonly svc = new AnalyticsService();

  @Post('event')
  track(@Body() body: unknown) {
    return this.svc.track(Event.parse(body));
  }

  @Get('summary')
  summary() {
    return this.svc.summary();
  }
}

@Module({ controllers: [AnalyticsController] })
export class AnalyticsModule {}
