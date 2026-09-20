import { Module } from '@nestjs/common';
import { MiscellaniesController } from './miscellanies.controller';
import { MiscellaniesService } from './miscellanies.service';

@Module({
  controllers: [MiscellaniesController],
  providers: [MiscellaniesService]
})
export class MiscellaniesModule {}
