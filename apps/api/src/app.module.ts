import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { AnnotationsModule } from './annotations/annotations.module';
import { AuthModule } from './auth/auth.module';
import { AdminWriteGuard } from './auth/guards/admin-write.guard';
import { CategoriesModule } from './categories/categories.module';
import { ContentTagsModule } from './content-tags/content-tags.module';
import { NotesModule } from './notes/notes.module';
import { ModelResponsesModule } from './model-responses/model-responses.module';
import { PrismaModule } from './prisma/prisma.module';
import { PromptsModule } from './prompts/prompts.module';
import { SearchModule } from './search/search.module';
import { SolutionsModule } from './solutions/solutions.module';
import { TagsModule } from './tags/tags.module';
import { UiPrototypesModule } from './ui-prototypes/ui-prototypes.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 15 * 60 * 1000, limit: 5 }]),
    AuthModule,
    PrismaModule,
    PromptsModule,
    CategoriesModule,
    TagsModule,
    ContentTagsModule,
    SolutionsModule,
    NotesModule,
    ModelResponsesModule,
    AnnotationsModule,
    UiPrototypesModule,
    SearchModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AdminWriteGuard
    }
  ]
})
export class AppModule {}
