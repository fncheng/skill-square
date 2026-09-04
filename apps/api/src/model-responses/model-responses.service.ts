import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AnnotationResourceType, Prisma } from '@prisma/client';
import { AnnotationResourceTypeDto } from '../annotations/dto/annotation-resource-type';
import {
  CONTENT_TRANSFER_FORMAT,
  ContentTransferDto,
  ContentTransferResourceDto,
  getContentTransferVersion
} from '../common/dto/content-transfer.dto';
import { normalizeTags } from '../common/utils/normalize-tags';
import { PrismaService } from '../prisma/prisma.service';
import { CreateModelResponseDto } from './dto/create-model-response.dto';
import { ModelResponseQueryDto } from './dto/model-response-query.dto';
import { UpdateModelResponseDto } from './dto/update-model-response.dto';

@Injectable()
export class ModelResponsesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ModelResponseQueryDto) {
    const conditions: Prisma.ModelResponseWhereInput[] = [];
    if (query.search?.trim()) {
      const keyword = query.search.trim();
      conditions.push({
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { summary: { contains: keyword, mode: 'insensitive' } },
          { content: { contains: keyword, mode: 'insensitive' } },
          { tags: { has: keyword } },
          { sourceProduct: { contains: keyword, mode: 'insensitive' } },
          { modelName: { contains: keyword, mode: 'insensitive' } },
          { originalPrompt: { contains: keyword, mode: 'insensitive' } }
        ]
      });
    }
    if (query.category?.trim()) {
      conditions.push({ category: query.category.trim() });
    }
    const records = await this.prisma.modelResponse.findMany({
      where: conditions.length ? { AND: conditions } : {},
      include: { _count: { select: { annotations: true } } },
      orderBy: { updatedAt: 'desc' }
    });
    return records.map((record) => this.toResponse(record));
  }

  async findOne(id: string) {
    const record = await this.prisma.modelResponse.findUnique({
      where: { id }, include: { _count: { select: { annotations: true } } }
    });
    if (!record) throw new NotFoundException('模型回答不存在。');
    return this.toResponse(record);
  }

  async exportOne(id: string) {
    const record = await this.prisma.modelResponse.findUnique({
      where: { id }, include: { annotations: { orderBy: { createdAt: 'asc' } } }
    });
    if (!record) throw new NotFoundException('模型回答不存在。');
    const tags = normalizeTags(record.tags);
    return {
      format: CONTENT_TRANSFER_FORMAT, version: getContentTransferVersion(tags),
      resourceType: AnnotationResourceTypeDto.MODEL_RESPONSE, exportedAt: new Date().toISOString(),
      resource: {
        title: record.title, summary: record.summary, content: record.content, category: record.category, tags,
        sourceProduct: record.sourceProduct, modelName: record.modelName, originalPrompt: record.originalPrompt,
        createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString()
      },
      annotations: record.annotations.map((annotation) => ({
        content: annotation.content, exact: annotation.exact, prefix: annotation.prefix, suffix: annotation.suffix,
        start: annotation.start, end: annotation.end,
        documentUpdatedAt: annotation.documentUpdatedAt?.toISOString() ?? null,
        createdAt: annotation.createdAt.toISOString(), updatedAt: annotation.updatedAt.toISOString()
      }))
    };
  }

  async create(dto: CreateModelResponseDto) {
    const record = await this.prisma.modelResponse.create({ data: this.toCreateData(dto) });
    return { ...record, annotationCount: 0 };
  }

  async importOne(dto: ContentTransferDto) {
    if (dto.resourceType !== AnnotationResourceTypeDto.MODEL_RESPONSE) throw new BadRequestException('请选择模型回答迁移文件。');
    return this.prisma.$transaction(async (transaction) => {
      const record = await transaction.modelResponse.create({ data: {
        ...this.toCreateData(dto.resource), createdAt: new Date(dto.resource.createdAt), updatedAt: new Date(dto.resource.updatedAt)
      } });
      if (dto.annotations.length) await transaction.annotation.createMany({ data: dto.annotations.map((annotation) => ({
        resourceType: AnnotationResourceType.MODEL_RESPONSE, noteId: null, solutionId: null, modelResponseId: record.id,
        content: annotation.content, exact: annotation.exact, prefix: annotation.prefix, suffix: annotation.suffix,
        start: annotation.start, end: annotation.end,
        documentUpdatedAt: annotation.documentUpdatedAt ? new Date(annotation.documentUpdatedAt) : null,
        createdAt: new Date(annotation.createdAt), updatedAt: new Date(annotation.updatedAt)
      })) });
      return { ...record, annotationCount: dto.annotations.length };
    });
  }

  async update(id: string, dto: UpdateModelResponseDto) {
    await this.findOne(id);
    const record = await this.prisma.modelResponse.update({ where: { id }, data: this.toUpdateData(dto) });
    const annotationCount = await this.prisma.annotation.count({ where: { modelResponseId: id } });
    return { ...record, annotationCount };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.modelResponse.delete({ where: { id } });
  }

  /** 将新增或导入载荷转换为完整的 Prisma 创建数据。 */
  private toCreateData(
    dto: CreateModelResponseDto | ContentTransferResourceDto
  ): Prisma.ModelResponseUncheckedCreateInput {
    const value = {
      title: dto.title?.trim(),
      summary: dto.summary?.trim(),
      content: dto.content,
      category: dto.category?.trim(),
      tags: dto.tags ? normalizeTags(dto.tags) : undefined,
      sourceProduct: dto.sourceProduct?.trim(),
      modelName: dto.modelName?.trim(),
      originalPrompt: dto.originalPrompt?.trim()
    };
    return { title: value.title ?? '', summary: value.summary ?? '', content: value.content ?? '', category: value.category ?? '', tags: value.tags ?? [], sourceProduct: value.sourceProduct ?? '', modelName: value.modelName ?? '', originalPrompt: value.originalPrompt ?? '' };
  }

  /** 将更新载荷转换为仅包含已提供字段的 Prisma 更新数据。 */
  private toUpdateData(dto: UpdateModelResponseDto): Prisma.ModelResponseUncheckedUpdateInput {
    return {
      title: dto.title?.trim(),
      summary: dto.summary?.trim(),
      content: dto.content,
      category: dto.category?.trim(),
      tags: dto.tags ? normalizeTags(dto.tags) : undefined,
      sourceProduct: dto.sourceProduct?.trim(),
      modelName: dto.modelName?.trim(),
      originalPrompt: dto.originalPrompt?.trim()
    };
  }

  private toResponse(record: Prisma.ModelResponseGetPayload<{ include: { _count: { select: { annotations: true } } } }>) {
    const { _count, ...response } = record;
    return { ...response, annotationCount: _count.annotations };
  }
}
