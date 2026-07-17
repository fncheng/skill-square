import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AnnotationResourceType, Prisma } from '@prisma/client';
import { AnnotationResourceTypeDto } from '../annotations/dto/annotation-resource-type';
import {
  CONTENT_TRANSFER_FORMAT,
  CONTENT_TRANSFER_VERSION,
  ContentTransferDto
} from '../common/dto/content-transfer.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { NoteQueryDto } from './dto/note-query.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@Injectable()
export class NotesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: NoteQueryDto) {
    const conditions: Prisma.NoteWhereInput[] = [];

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

    const where: Prisma.NoteWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    return this.prisma.note.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }]
    });
  }

  async findOne(id: string) {
    const note = await this.prisma.note.findUnique({ where: { id } });
    if (!note) {
      throw new NotFoundException('笔记不存在。');
    }

    return note;
  }

  async exportOne(id: string) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: { annotations: { orderBy: { createdAt: 'asc' } } }
    });
    if (!note) {
      throw new NotFoundException('笔记不存在。');
    }

    return {
      format: CONTENT_TRANSFER_FORMAT,
      version: CONTENT_TRANSFER_VERSION,
      resourceType: AnnotationResourceTypeDto.NOTE,
      exportedAt: new Date().toISOString(),
      resource: {
        title: note.title,
        summary: note.summary,
        content: note.content,
        category: note.category,
        tags: note.tags,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString()
      },
      annotations: note.annotations.map((annotation) => ({
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

  create(dto: CreateNoteDto) {
    return this.prisma.note.create({
      data: {
        title: dto.title,
        summary: dto.summary ?? '',
        content: dto.content,
        category: dto.category ?? '',
        tags: this.normalizeTags(dto.tags)
      }
    });
  }

  async importOne(dto: ContentTransferDto) {
    if (dto.resourceType !== AnnotationResourceTypeDto.NOTE) {
      throw new BadRequestException('请选择学习笔记迁移文件。');
    }

    return this.prisma.$transaction(async (transaction) => {
      const note = await transaction.note.create({
        data: {
          title: dto.resource.title,
          summary: dto.resource.summary,
          content: dto.resource.content,
          category: dto.resource.category,
          tags: this.normalizeTags(dto.resource.tags),
          createdAt: new Date(dto.resource.createdAt),
          updatedAt: new Date(dto.resource.updatedAt)
        }
      });

      if (dto.annotations.length > 0) {
        await transaction.annotation.createMany({
          data: dto.annotations.map((annotation) => ({
            resourceType: AnnotationResourceType.NOTE,
            noteId: note.id,
            solutionId: null,
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

      return note;
    });
  }

  async update(id: string, dto: UpdateNoteDto) {
    await this.findOne(id);

    return this.prisma.note.update({
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
    await this.prisma.note.delete({ where: { id } });
  }

  /** 去重、去空白，保证标签写入整洁。 */
  private normalizeTags(tags?: string[]) {
    return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)));
  }
}
