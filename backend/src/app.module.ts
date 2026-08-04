import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { RateLimitGuard } from './common/rate-limit.guard';
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
import { SupportModule } from './modules/support/support.module';
import { SocialModule } from './modules/social/social.module';
import { NetworkModule } from './modules/network/network.module';
import { CommunityModule } from './modules/community/community.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { TravelModule } from './modules/travel/travel.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ChatsModule } from './modules/chats/chats.module';
import { NewsModule } from './modules/news/news.module';
import { WeatherModule } from './modules/weather/weather.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { DigestModule } from './modules/digest/digest.module';
import { LegalModule } from './modules/legal/legal.module';
import { AccountModule } from './modules/account/account.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    AdminModule,
    SupportModule,
    SocialModule,
    NetworkModule,
    CommunityModule,
    AssistantModule,
    PlanningModule,
    TripsModule,
    RoutesModule,
    RecommendationsModule,
    AnalyticsModule,
    IntegrationsModule,
    UploadsModule,
    TravelModule,
    OrdersModule,
    ChatsModule,
    NewsModule,
    WeatherModule,
    CurrencyModule,
    DigestModule,
    LegalModule,
    AccountModule,
  ],
  providers: [
    // Глобально, но срабатывает только там, где на обработчике стоит
    // @RateLimit(...) — без декоратора запрос проходит не задерживаясь.
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
