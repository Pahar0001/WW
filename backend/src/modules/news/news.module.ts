import { Controller, Get, Module } from '@nestjs/common';
import { NewsService } from './news.service';
import { PrismaModule } from '../prisma/prisma.module';
import { Public } from '../auth/auth.decorators';

// Travel-новости из открытых RSS-лент. Публично: это витринный контент.
@Controller('news')
class NewsController {
  constructor(private readonly news: NewsService) {}

  @Get('travel')
  @Public()
  travel() {
    return this.news.travel();
  }
}

@Module({
  imports: [PrismaModule],
  controllers: [NewsController],
  providers: [NewsService],
})
export class NewsModule {}
