import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Annotation, AnnotationResourceType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnnotationQueryDto } from './dto/annotation-query.dto';
import { AnnotationResourceTypeDto } from './dto/annotation-resource-type';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { UpdateAnnotationDto } from './dto/update-annotation.dto';

@Injectable()
export class AnnotationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AnnotationQueryDto) {
    await this.ensureResourceExists(query.resourceType, query.resourceId);

    const annotations = await this.prisma.annotation.findMany({
      where: this.buildResourceWhere(query.resourceType, query.resourceId),
      orderBy: [{ createdAt: 'asc' }]
    });

    return annotations.map((annotation) => this.toResponse(annotation));
  }

  async create(dto: CreateAnnotationDto) {
    this.validateAnchor(dto);
    await this.ensureResourceExists(dto.resourceType, dto.resourceId);

    const annotation = await this.prisma.annotation.create({
      data: {
        resourceType: dto.resourceType as AnnotationResourceType,
        noteId: dto.resourceType === AnnotationResourceTypeDto.NOTE ? dto.resourceId : null,
        solutionId: dto.resourceType === AnnotationResourceTypeDto.SOLUTION ? dto.resourceId : null,
        content: dto.content,
        exact: dto.exact,
        prefix: dto.prefix ?? '',
        suffix: dto.suffix ?? '',
        start: dto.start,
        end: dto.end,
        documentUpdatedAt: dto.documentUpdatedAt ? new Date(dto.documentUpdatedAt) : null
      }
    });

    return this.toResponse(annotation);
  }

  async update(id: string, dto: UpdateAnnotationDto) {
    const existing = await this.findRecord(id);
    const anchor = {
      exact: dto.exact ?? existing.exact,
      start: dto.start ?? existing.start,
      end: dto.end ?? existing.end
    };
    this.validateAnchor(anchor);

    const annotation = await this.prisma.annotation.update({
      where: { id },
      data: {
        content: dto.content,
        exact: dto.exact,
        prefix: dto.prefix,
        suffix: dto.suffix,
        start: dto.start,
        end: dto.end,
        documentUpdatedAt:
          dto.documentUpdatedAt === undefined ? undefined : new Date(dto.documentUpdatedAt)
      }
    });

    return this.toResponse(annotation);
  }

  async remove(id: string) {
    await this.findRecord(id);
    await this.prisma.annotation.delete({ where: { id } });
  }

  private async findRecord(id: string) {
    const annotation = await this.prisma.annotation.findUnique({ where: { id } });
    if (!annotation) {
      throw new NotFoundException('批注不存在。');
    }
    return annotation;
  }

  private async ensureResourceExists(resourceType: AnnotationResourceTypeDto, resourceId: string) {
    const resource =
      resourceType === AnnotationResourceTypeDto.NOTE
        ? await this.prisma.note.findUnique({ where: { id: resourceId }, select: { id: true } })
        : await this.prisma.solution.findUnique({ where: { id: resourceId }, select: { id: true } });

    if (!resource) {
      throw new NotFoundException(
        resourceType === AnnotationResourceTypeDto.NOTE ? '笔记不存在。' : '解决方案不存在。'
      );
    }
  }

  private buildResourceWhere(
    resourceType: AnnotationResourceTypeDto,
    resourceId: string
  ): Prisma.AnnotationWhereInput {
    return resourceType === AnnotationResourceTypeDto.NOTE
      ? { resourceType: AnnotationResourceType.NOTE, noteId: resourceId }
      : { resourceType: AnnotationResourceType.SOLUTION, solutionId: resourceId };
  }

  private validateAnchor(anchor: Pick<CreateAnnotationDto, 'exact' | 'start' | 'end'>) {
    if (anchor.end <= anchor.start) {
      throw new BadRequestException('批注选区的结束位置必须大于起始位置。');
    }

    if (anchor.end - anchor.start !== anchor.exact.length) {
      throw new BadRequestException('批注选区位置与原文长度不一致。');
    }
  }

  private toResponse(annotation: Annotation) {
    return {
      id: annotation.id,
      resourceType: annotation.resourceType,
      resourceId: annotation.noteId ?? annotation.solutionId!,
      content: annotation.content,
      exact: annotation.exact,
      prefix: annotation.prefix,
      suffix: annotation.suffix,
      start: annotation.start,
      end: annotation.end,
      documentUpdatedAt: annotation.documentUpdatedAt,
      createdAt: annotation.createdAt,
      updatedAt: annotation.updatedAt
    };
  }
}
