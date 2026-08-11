import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AnnotationResourceType, Prisma } from '@prisma/client';
import { AnnotationResourceTypeDto } from '../annotations/dto/annotation-resource-type';
import {
  CONTENT_TRANSFER_FORMAT,
  ContentTransferDto,
  getContentTransferVersion
} from '../common/dto/content-transfer.dto';
import { normalizeTags } from '../common/utils/normalize-tags';
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

  async exportOne(id: string) {
    const solution = await this.prisma.solution.findUnique({
      where: { id },
      include: { annotations: { orderBy: { createdAt: 'asc' } } }
    });
    if (!solution) {
      throw new NotFoundException('解决方案不存在。');
    }

    const tags = normalizeTags(solution.tags);

    return {
      format: CONTENT_TRANSFER_FORMAT,
      version: getContentTransferVersion(tags),
      resourceType: AnnotationResourceTypeDto.SOLUTION,
      exportedAt: new Date().toISOString(),
      resource: {
        title: solution.title,
        summary: solution.summary,
        content: solution.content,
        category: solution.category,
        tags,
        createdAt: solution.createdAt.toISOString(),
        updatedAt: solution.updatedAt.toISOString()
      },
      annotations: solution.annotations.map((annotation) => ({
        content: annotation.content,
        exact: annotation.exact,
        prefix: annotation.prefix,
        suffix: annotation.suffix,
        start: annotation.start,
        end: annotation.end,
        documentUpdatedAt: annotation.documentUpdatedAt?.toISOString() ?? null,
        createdAt: annotation.createdAt.toISOString(),
        updatedAt: annotation.updatedAt.toISOString()
      }))
    };
  }

  create(dto: CreateSolutionDto) {
    return this.prisma.solution.create({
      data: {
        title: dto.title,
        summary: dto.summary ?? '',
        content: dto.content,
        category: dto.category ?? '',
        tags: normalizeTags(dto.tags)
      }
    });
  }

  async importOne(dto: ContentTransferDto) {
    if (dto.resourceType !== AnnotationResourceTypeDto.SOLUTION) {
      throw new BadRequestException('请选择解决方案迁移文件。');
    }

    return this.prisma.$transaction(async (transaction) => {
      const solution = await transaction.solution.create({
        data: {
          title: dto.resource.title,
          summary: dto.resource.summary,
          content: dto.resource.content,
          category: dto.resource.category,
          tags: normalizeTags(dto.resource.tags),
          createdAt: new Date(dto.resource.createdAt),
          updatedAt: new Date(dto.resource.updatedAt)
        }
      });

      if (dto.annotations.length > 0) {
        await transaction.annotation.createMany({
          data: dto.annotations.map((annotation) => ({
            resourceType: AnnotationResourceType.SOLUTION,
            noteId: null,
            solutionId: solution.id,
            content: annotation.content,
            exact: annotation.exact,
            prefix: annotation.prefix,
            suffix: annotation.suffix,
            start: annotation.start,
            end: annotation.end,
            documentUpdatedAt: annotation.documentUpdatedAt
              ? new Date(annotation.documentUpdatedAt)
              : null,
            createdAt: new Date(annotation.createdAt),
            updatedAt: new Date(annotation.updatedAt)
          }))
        });
      }

      return solution;
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
        tags: dto.tags ? normalizeTags(dto.tags) : undefined
      }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.solution.delete({ where: { id } });
  }
}
