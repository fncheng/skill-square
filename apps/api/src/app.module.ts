import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { PrismaModule } from './prisma/prisma.module';
import { PromptsModule } from './prompts/prompts.module';
import { SolutionsModule } from './solutions/solutions.module';
import { TagsModule } from './tags/tags.module';

@Module({
  imports: [PrismaModule, PromptsModule, CategoriesModule, TagsModule, SolutionsModule]
})
export class AppModule {}
