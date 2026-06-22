import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Param,
  Post,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { TripsService } from './trips.service';
import { CreateTripSchema } from './trips.dto';

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

  @Post()
  create(@Body() body: unknown) {
    let input;
    try {
      input = CreateTripSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) {
        throw new BadRequestException(e.flatten());
      }
      throw e;
    }
    return this.trips.create(input);
  }
}

@Module({
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
