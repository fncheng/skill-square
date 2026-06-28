import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSolutionDto } from './dto/create-solution.dto';
import { SolutionQueryDto } from './dto/solution-query.dto';
import { UpdateSolutionDto } from './dto/update-solution.dto';

@Injectable()
export class SolutionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: SolutionQueryDto) {
    const conditions: Prisma.SolutionWhereInput[] = [];

    if (query.search?.trim()) {
      const keyword = query.search.trim();
      conditions.push({
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { summary: { contains: keyword, mode: 'insensitive' } },
          { content: { contains: keyword, mode: 'insensitive' } }
        ]
      });
    }

    if (query.category?.trim()) {
      conditions.push({ category: query.category.trim() });
    }

    const where: Prisma.SolutionWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    return this.prisma.solution.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }]
    });
  }

  async findOne(id: string) {
    const solution = await this.prisma.solution.findUnique({ where: { id } });
    if (!solution) {
      throw new NotFoundException('解决方案不存在。');
    }

    return solution;
  }

  create(dto: CreateSolutionDto) {
    return this.prisma.solution.create({
      data: {
        title: dto.title,
        summary: dto.summary ?? '',
        content: dto.content,
        category: dto.category ?? '',
        tags: this.normalizeTags(dto.tags)
      }
    });
  }

  async update(id: string, dto: UpdateSolutionDto) {
    await this.findOne(id);

    return this.prisma.solution.update({
      where: { id },
      data: {
        title: dto.title,
        summary: dto.summary,
        content: dto.content,
        category: dto.category,
        tags: dto.tags ? this.normalizeTags(dto.tags) : undefined
      }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.solution.delete({ where: { id } });
  }

  /** 去重、去空白，保证标签写入整洁。 */
  private normalizeTags(tags?: string[]) {
    return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)));
  }
}
