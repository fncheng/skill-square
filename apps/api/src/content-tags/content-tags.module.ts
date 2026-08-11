import { Module } from '@nestjs/common';
import { ContentTagsController } from './content-tags.controller';
import { ContentTagsService } from './content-tags.service';

@Module({
  controllers: [ContentTagsController],
  providers: [ContentTagsService]
})
export class ContentTagsModule {}
