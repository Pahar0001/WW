import { Body, Controller, Module, Post } from '@nestjs/common';
import { z } from 'zod';

// Input contract for the AI travel planner. Kept provider-agnostic so it can be
// served by rules today and an LLM agent later (see docs/INTEGRATIONS.md).
const PlannerInput = z.object({
  budgetRub: z.number().int().positive().optional(),
  days: z.number().int().min(1).max(60),
  country: z.string().optional(),
  pacePreference: z.enum(['calm', 'balanced', 'active']).optional(),
  interests: z.array(z.string()).default([]),
  month: z.number().int().min(1).max(12).optional(),
});
type PlannerInput = z.infer<typeof PlannerInput>;

interface PlannerOutput {
  recommendedPace: 'CALM' | 'BALANCED' | 'ACTIVE';
  rationale: string;
  // Three returnable shapes, mirroring the product's calm/balanced/active idea.
  options: { pace: 'CALM' | 'BALANCED' | 'ACTIVE'; label: string; note: string }[];
  dataNote: string;
}

class RecommendationsService {
  /**
   * Transparent rule engine. It recommends a *pace*, never invents prices or
   * itineraries — concrete days/prices come from sourced Trip data downstream.
   */
  plan(input: PlannerInput): PlannerOutput {
    let pace: PlannerOutput['recommendedPace'] = 'BALANCED';
    const reasons: string[] = [];

    if (input.pacePreference === 'calm') {
      pace = 'CALM';
      reasons.push('вы предпочли спокойный темп');
    } else if (input.pacePreference === 'active') {
      pace = 'ACTIVE';
      reasons.push('вы предпочли насыщенный темп');
    } else {
      // Short trips lean active to see more; long trips can afford calm.
      if (input.days <= 7) {
        pace = 'ACTIVE';
        reasons.push('короткая поездка — есть смысл успеть больше');
      } else if (input.days >= 16) {
        pace = 'CALM';
        reasons.push('длинная поездка — можно не спешить');
      } else {
        reasons.push('средняя длительность — сбалансированный темп');
      }
    }

    return {
      recommendedPace: pace,
      rationale: reasons.join('; '),
      options: [
        { pace: 'CALM', label: 'Спокойный', note: 'Меньше переездов, больше отдыха' },
        { pace: 'BALANCED', label: 'Сбалансированный', note: 'Баланс впечатлений и отдыха' },
        { pace: 'ACTIVE', label: 'Активный', note: 'Максимум мест за поездку' },
      ],
      dataNote:
        'Рекомендация темпа. Конкретные дни, цены и время в пути берутся только ' +
        'из проверенных источников и не выдумываются.',
    };
  }
}

@Controller('recommendations')
class RecommendationsController {
  private readonly svc = new RecommendationsService();

  @Post('plan')
  plan(@Body() body: unknown) {
    const parsed = PlannerInput.parse(body);
    return this.svc.plan(parsed);
  }
}

@Module({ controllers: [RecommendationsController] })
export class RecommendationsModule {}
