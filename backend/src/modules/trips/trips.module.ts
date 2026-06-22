import { Controller, Get, Module, Param } from '@nestjs/common';
import { TripsService } from './trips.service';

@Controller('trips')
class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  list() {
    return this.trips.list();
  }

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.trips.getBySlug(slug);
  }
}

@Module({
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
