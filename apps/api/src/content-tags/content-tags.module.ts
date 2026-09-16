import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ContentTagsController } from './content-tags.controller';
import { ContentTagsService } from './content-tags.service';

@Module({
  imports: [AuthModule],
  controllers: [ContentTagsController],
  providers: [ContentTagsService]
})
export class ContentTagsModule {}
