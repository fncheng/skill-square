import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
