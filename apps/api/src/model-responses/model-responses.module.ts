import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ModelResponsesController } from './model-responses.controller';
import { ModelResponsesService } from './model-responses.service';

@Module({ imports: [AuthModule], controllers: [ModelResponsesController], providers: [ModelResponsesService] })
export class ModelResponsesModule {}
