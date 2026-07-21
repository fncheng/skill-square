import { Module } from '@nestjs/common';
import { AnnotationsModule } from './annotations/annotations.module';
import { CategoriesModule } from './categories/categories.module';
import { NotesModule } from './notes/notes.module';
import { PrismaModule } from './prisma/prisma.module';
import { PromptsModule } from './prompts/prompts.module';
import { SearchModule } from './search/search.module';
import { SolutionsModule } from './solutions/solutions.module';
import { TagsModule } from './tags/tags.module';
import { UiPrototypesModule } from './ui-prototypes/ui-prototypes.module';

@Module({
  imports: [
    PrismaModule,
    PromptsModule,
    CategoriesModule,
    TagsModule,
    SolutionsModule,
    NotesModule,
    AnnotationsModule,
    UiPrototypesModule,
    SearchModule
  ]
})
export class AppModule {}
