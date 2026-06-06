import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { PromptQueryDto } from './dto/prompt-query.dto';
import { PromptResponseDto } from './dto/prompt-response.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';

const promptInclude = {
  category: true,
  tags: {
    include: {
      tag: true
    }
  }
} satisfies Prisma.PromptInclude;

type PromptWithRelations = Prisma.PromptGetPayload<{ include: typeof promptInclude }>;

@Injectable()
export class PromptsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PromptQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const tagIds = this.normalizeList(query.tagIds);
    const conditions: Prisma.PromptWhereInput[] = [];

    if (query.search?.trim()) {
      const keyword = query.search.trim();
      conditions.push({
        OR: [
          { name: { contains: keyword, mode: 'insensitive' } },
          { content: { contains: keyword, mode: 'insensitive' } }
        ]
      });
    }

    if (query.categoryId) {
      conditions.push({ categoryId: query.categoryId });
    }

    if (query.favorite !== undefined) {
      conditions.push({ isFavorite: query.favorite });
    }

    if (tagIds.length > 0) {
      conditions.push({
        tags: {
          some: {
            tagId: { in: tagIds }
          }
        }
      });
    }

    if (query.tag?.trim()) {
      conditions.push({
        tags: {
          some: {
            tag: {
              name: { contains: query.tag.trim(), mode: 'insensitive' }
            }
          }
        }
      });
    }

    const where: Prisma.PromptWhereInput = conditions.length > 0 ? { AND: conditions } : {};
    const [items, total] = await this.prisma.$transaction([
      this.prisma.prompt.findMany({
        where,
        include: promptInclude,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.prompt.count({ where })
    ]);

    return {
      items: items.map((prompt) => this.toPromptResponse(prompt)),
      total,
      page,
      pageSize
    };
  }

  async findOne(id: string) {
    const prompt = await this.prisma.prompt.findUnique({
      where: { id },
      include: promptInclude
    });

    if (!prompt) {
      throw new NotFoundException('Prompt 不存在。');
    }

    return this.toPromptResponse(prompt);
  }

  async create(dto: CreatePromptDto) {
    return this.prisma.$transaction(async (tx) => {
      const prompt = await tx.prompt.create({
        data: {
          name: dto.name,
          description: dto.description ?? '',
          content: dto.content,
          isFavorite: dto.isFavorite ?? false,
          category: dto.categoryId ? { connect: { id: dto.categoryId } } : undefined,
          tags: this.buildTagCreateInput(dto.tagIds)
        },
        include: promptInclude
      });

      await this.createVersionSnapshot(tx, prompt);
      return this.toPromptResponse(prompt);
    });
  }

  async update(id: string, dto: UpdatePromptDto) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.prompt.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Prompt 不存在。');
      }

      const prompt = await tx.prompt.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          content: dto.content,
          isFavorite: dto.isFavorite,
          category:
            dto.categoryId === null
              ? { disconnect: true }
              : dto.categoryId
                ? { connect: { id: dto.categoryId } }
                : undefined,
          tags:
            dto.tagIds !== undefined
              ? {
                  deleteMany: {},
                  create: this.uniqueIds(dto.tagIds).map((tagId) => ({
                    tag: { connect: { id: tagId } }
                  }))
                }
              : undefined
        },
        include: promptInclude
      });

      await this.createVersionSnapshot(tx, prompt);
      return this.toPromptResponse(prompt);
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.prompt.delete({ where: { id } });
  }

  async markFavorite(id: string, isFavorite: boolean) {
    await this.findOne(id);
    const prompt = await this.prisma.prompt.update({
      where: { id },
      data: { isFavorite },
      include: promptInclude
    });

    return this.toPromptResponse(prompt);
  }

  async findVersions(id: string) {
    await this.findOne(id);

    return this.prisma.promptVersion.findMany({
      where: { promptId: id },
      orderBy: [{ version: 'desc' }]
    });
  }

  async rollback(id: string, versionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.promptVersion.findFirst({
        where: {
          id: versionId,
          promptId: id
        }
      });

      if (!version) {
        throw new NotFoundException('Prompt 版本不存在。');
      }

      const existing = await tx.prompt.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Prompt 不存在。');
      }

      const category = version.categoryId
        ? await tx.category.findUnique({ where: { id: version.categoryId } })
        : null;
      const tags =
        version.tagIds.length > 0
          ? await tx.tag.findMany({ where: { id: { in: version.tagIds } } })
          : [];

      const prompt = await tx.prompt.update({
        where: { id },
        data: {
          name: version.name,
          description: version.description,
          content: version.content,
          isFavorite: version.isFavorite,
          category: category ? { connect: { id: category.id } } : { disconnect: true },
          tags: {
            deleteMany: {},
            create: tags.map((tag) => ({
              tag: { connect: { id: tag.id } }
            }))
          }
        },
        include: promptInclude
      });

      await this.createVersionSnapshot(tx, prompt);
      return this.toPromptResponse(prompt);
    });
  }

  private async createVersionSnapshot(tx: Prisma.TransactionClient, prompt: PromptWithRelations) {
    const nextVersion = await this.getNextVersion(tx, prompt.id);

    await tx.promptVersion.create({
      data: {
        promptId: prompt.id,
        version: nextVersion,
        name: prompt.name,
        description: prompt.description,
        content: prompt.content,
        isFavorite: prompt.isFavorite,
        categoryId: prompt.categoryId,
        categoryName: prompt.category?.name,
        tagIds: prompt.tags.map((item) => item.tag.id),
        tagNames: prompt.tags.map((item) => item.tag.name)
      }
    });
  }

  private async getNextVersion(tx: Prisma.TransactionClient, promptId: string) {
    const aggregate = await tx.promptVersion.aggregate({
      where: { promptId },
      _max: { version: true }
    });

    return (aggregate._max.version ?? 0) + 1;
  }

  private buildTagCreateInput(tagIds?: string[]) {
    const ids = this.uniqueIds(tagIds);

    if (ids.length === 0) {
      return undefined;
    }

    return {
      create: ids.map((tagId) => ({
        tag: { connect: { id: tagId } }
      }))
    };
  }

  private normalizeList(value?: string | string[]) {
    if (!value) {
      return [];
    }

    const values = Array.isArray(value) ? value : [value];
    return this.uniqueIds(values.flatMap((item) => item.split(',')));
  }

  private uniqueIds(ids?: string[]) {
    return Array.from(new Set((ids ?? []).map((id) => id.trim()).filter(Boolean)));
  }

  private toPromptResponse(prompt: PromptWithRelations): PromptResponseDto {
    return {
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      content: prompt.content,
      isFavorite: prompt.isFavorite,
      categoryId: prompt.categoryId,
      category: prompt.category,
      tags: prompt.tags.map((item) => item.tag).sort((a, b) => a.name.localeCompare(b.name)),
      createdAt: prompt.createdAt,
      updatedAt: prompt.updatedAt
    };
  }
}
