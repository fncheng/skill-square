import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUiPrototypeDto } from './dto/create-ui-prototype.dto';
import { UiPrototypeQueryDto } from './dto/ui-prototype-query.dto';
import { UpdateUiPrototypeDto } from './dto/update-ui-prototype.dto';

@Injectable()
export class UiPrototypesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(query: UiPrototypeQueryDto) {
    const conditions: Prisma.UiPrototypeWhereInput[] = [];

    if (query.search?.trim()) {
      const keyword = query.search.trim();
      conditions.push({
        OR: [
          { title: { contains: keyword, mode: 'insensitive' } },
          { summary: { contains: keyword, mode: 'insensitive' } },
          { category: { contains: keyword, mode: 'insensitive' } },
          { tags: { has: keyword } }
        ]
      });
    }

    if (query.category?.trim()) {
      conditions.push({ category: query.category.trim() });
    }

    const where: Prisma.UiPrototypeWhereInput = conditions.length > 0 ? { AND: conditions } : {};

    return this.prisma.uiPrototype.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }]
    });
  }

  async findOne(id: string) {
    const prototype = await this.prisma.uiPrototype.findUnique({ where: { id } });
    if (!prototype) {
      throw new NotFoundException('UI 原型不存在。');
    }

    return prototype;
  }

  create(dto: CreateUiPrototypeDto) {
    return this.prisma.uiPrototype.create({
      data: {
        title: dto.title.trim(),
        summary: dto.summary?.trim() ?? '',
        html: dto.html,
        category: dto.category?.trim() ?? '',
        tags: this.normalizeTags(dto.tags),
        allowExternal: dto.allowExternal ?? false
      }
    });
  }

  async update(id: string, dto: UpdateUiPrototypeDto) {
    await this.findOne(id);

    return this.prisma.uiPrototype.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        summary: dto.summary?.trim(),
        html: dto.html,
        category: dto.category?.trim(),
        tags: dto.tags ? this.normalizeTags(dto.tags) : undefined,
        allowExternal: dto.allowExternal
      }
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.uiPrototype.delete({ where: { id } });
  }

  /** 去重、去空白，保证标签写入整洁。 */
  private normalizeTags(tags?: string[]) {
    return Array.from(new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean)));
  }
}
