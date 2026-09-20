import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AnnotationResourceType, Prisma } from '@prisma/client';
import { AnnotationResourceTypeDto } from '../annotations/dto/annotation-resource-type';
import { CONTENT_TRANSFER_FORMAT, ContentTransferDto, getContentTransferVersion } from '../common/dto/content-transfer.dto';
import { normalizeTags } from '../common/utils/normalize-tags';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMiscellanyDto } from './dto/create-miscellany.dto';
import { MiscellanyQueryDto } from './dto/miscellany-query.dto';
import { UpdateMiscellanyDto } from './dto/update-miscellany.dto';

@Injectable()
export class MiscellaniesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: MiscellanyQueryDto) {
    const conditions: Prisma.MiscellanyWhereInput[] = [];
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
    const where: Prisma.MiscellanyWhereInput = conditions.length > 0 ? { AND: conditions } : {};
    return this.prisma.miscellany.findMany({ where, orderBy: [{ updatedAt: 'desc' }] });
  }

  async findOne(id: string) {
    const miscellany = await this.prisma.miscellany.findUnique({ where: { id } });
    if (!miscellany) throw new NotFoundException('杂谈不存在。');
    return miscellany;
  }

  async exportOne(id: string) {
    const miscellany = await this.prisma.miscellany.findUnique({
      where: { id },
      include: { annotations: { orderBy: { createdAt: 'asc' } } }
    });
    if (!miscellany) throw new NotFoundException('杂谈不存在。');
    const tags = normalizeTags(miscellany.tags);
    return {
      format: CONTENT_TRANSFER_FORMAT,
      version: getContentTransferVersion(tags),
      resourceType: AnnotationResourceTypeDto.MISCELLANY,
      exportedAt: new Date().toISOString(),
      resource: {
        title: miscellany.title,
        summary: miscellany.summary,
        content: miscellany.content,
        category: miscellany.category,
        tags,
        createdAt: miscellany.createdAt.toISOString(),
        updatedAt: miscellany.updatedAt.toISOString()
      },
      annotations: miscellany.annotations.map((annotation) => ({
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

  create(dto: CreateMiscellanyDto) {
    return this.prisma.miscellany.create({
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
    if (dto.resourceType !== AnnotationResourceTypeDto.MISCELLANY) {
      throw new BadRequestException('请选择杂谈迁移文件。');
    }
    return this.prisma.$transaction(async (transaction) => {
      const miscellany = await transaction.miscellany.create({
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
            resourceType: AnnotationResourceType.MISCELLANY,
            noteId: null,
            solutionId: null,
            miscellanyId: miscellany.id,
            modelResponseId: null,
            content: annotation.content,
            exact: annotation.exact,
            prefix: annotation.prefix,
            suffix: annotation.suffix,
            start: annotation.start,
            end: annotation.end,
            documentUpdatedAt: annotation.documentUpdatedAt ? new Date(annotation.documentUpdatedAt) : null,
            createdAt: new Date(annotation.createdAt),
            updatedAt: new Date(annotation.updatedAt)
          }))
        });
      }
      return miscellany;
    });
  }

  async update(id: string, dto: UpdateMiscellanyDto) {
    await this.findOne(id);
    return this.prisma.miscellany.update({
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
    await this.prisma.miscellany.delete({ where: { id } });
  }
}
