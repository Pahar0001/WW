import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { TripsModule } from './modules/trips/trips.module';
import { RoutesModule } from './modules/routes/routes.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    TripsModule,
    RoutesModule,
    RecommendationsModule,
    AnalyticsModule,
    IntegrationsModule,
  ],
})
export class AppModule {}
