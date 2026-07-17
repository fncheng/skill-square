import { Module } from '@nestjs/common';
import { UiPrototypesController } from './ui-prototypes.controller';
import { UiPrototypesService } from './ui-prototypes.service';

@Module({
  controllers: [UiPrototypesController],
  providers: [UiPrototypesService]
})
export class UiPrototypesModule {}
