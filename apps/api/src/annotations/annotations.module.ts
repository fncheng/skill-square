import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AnnotationsController } from './annotations.controller';
import { AnnotationsService } from './annotations.service';
import { ModelResponseAnnotationGuard } from './guards/model-response-annotation.guard';

@Module({
  imports: [AuthModule],
  controllers: [AnnotationsController],
  providers: [AnnotationsService, ModelResponseAnnotationGuard]
})
export class AnnotationsModule {}
