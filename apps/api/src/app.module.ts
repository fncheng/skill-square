import { Module } from '@nestjs/common';
import { CategoriesModule } from './categories/categories.module';
import { PrismaModule } from './prisma/prisma.module';
import { PromptsModule } from './prompts/prompts.module';
import { TagsModule } from './tags/tags.module';

@Module({
  imports: [PrismaModule, PromptsModule, CategoriesModule, TagsModule]
})
export class AppModule {}
