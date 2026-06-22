import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { TripsModule } from './modules/trips/trips.module';
import { RoutesModule } from './modules/routes/routes.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlanningModule } from './modules/planning/planning.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    AdminModule,
    PlanningModule,
    TripsModule,
    RoutesModule,
    RecommendationsModule,
    AnalyticsModule,
    IntegrationsModule,
    UploadsModule,
  ],
})
export class AppModule {}
