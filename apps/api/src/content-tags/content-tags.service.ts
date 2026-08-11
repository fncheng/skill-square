import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContentTagItemsQueryDto } from './dto/content-tag-items-query.dto';
import {
  ContentTagCloudResponseDto,
  ContentTagItemsResponseDto,
  ContentTagResourceType,
  ContentTagScope
} from './dto/content-tag-response.dto';

interface TagAccumulator {
  name: string;
  total: number;
  solutionCount: number;
  noteCount: number;
}

interface ContentTagDatabaseRow {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  resourceType: ContentTagResourceType;
  createdAt: Date;
  updatedAt: Date;
}

interface ContentTagCountRow {
  total: number;
}

@Injectable()
export class ContentTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async findCloud(): Promise<ContentTagCloudResponseDto> {
    const [solutions, notes] = await Promise.all([
      this.prisma.solution.findMany({ select: { tags: true } }),
      this.prisma.note.findMany({ select: { tags: true } })
    ]);
    const tags = new Map<string, TagAccumulator>();

    solutions.forEach((item) => this.addResourceTags(tags, item.tags, ContentTagResourceType.SOLUTION));
    notes.forEach((item) => this.addResourceTags(tags, item.tags, ContentTagResourceType.NOTE));

    const items = Array.from(tags.values()).sort(
      (left, right) => right.total - left.total || left.name.localeCompare(right.name, 'zh-CN')
    );

    return {
      items,
      totalTags: items.length,
      taggedSolutionCount: solutions.filter((item) => item.tags.length > 0).length,
      taggedNoteCount: notes.filter((item) => item.tags.length > 0).length
    };
  }

  async findItems(query: ContentTagItemsQueryDto): Promise<ContentTagItemsResponseDto> {
    const targetTag = this.normalizeTag(query.tag);
    const keyword = query.search?.trim().toLocaleLowerCase('zh-CN') ?? '';
    const resourceType = query.resourceType ?? ContentTagScope.ALL;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const offset = (page - 1) * pageSize;
    const entries = this.buildEntriesQuery(resourceType, targetTag, keyword);

    const [items, countRows] = await Promise.all([
      this.prisma.$queryRaw<ContentTagDatabaseRow[]>(Prisma.sql`
        SELECT
          entries."id",
          entries."title",
          entries."summary",
          entries."category",
          entries."tags",
          entries."resourceType",
          entries."createdAt",
          entries."updatedAt"
        FROM (${entries}) AS entries
        ORDER BY entries."updatedAt" DESC, entries."resourceType" ASC, entries."id" ASC
        LIMIT ${pageSize}
        OFFSET ${offset}
      `),
      this.prisma.$queryRaw<ContentTagCountRow[]>(Prisma.sql`
        SELECT COUNT(*)::int AS "total"
        FROM (${entries}) AS entries
      `)
    ]);

    return {
      items,
      total: countRows[0]?.total ?? 0,
      page,
      pageSize
    };
  }

  private buildEntriesQuery(resourceType: ContentTagScope, targetTag: string, keyword: string) {
    if (resourceType === ContentTagScope.SOLUTION) {
      return this.buildSolutionQuery(targetTag, keyword);
    }
    if (resourceType === ContentTagScope.NOTE) {
      return this.buildNoteQuery(targetTag, keyword);
    }

    return Prisma.sql`
      ${this.buildSolutionQuery(targetTag, keyword)}
      UNION ALL
      ${this.buildNoteQuery(targetTag, keyword)}
    `;
  }

  private buildSolutionQuery(targetTag: string, keyword: string) {
    return Prisma.sql`
      SELECT
        resource."id",
        resource."title",
        resource."summary",
        resource."category",
        resource."tags",
        'SOLUTION'::text AS "resourceType",
        resource."createdAt",
        resource."updatedAt"
      FROM "solutions" AS resource
      WHERE ${this.buildWhereQuery(targetTag, keyword)}
    `;
  }

  private buildNoteQuery(targetTag: string, keyword: string) {
    return Prisma.sql`
      SELECT
        resource."id",
        resource."title",
        resource."summary",
        resource."category",
        resource."tags",
        'NOTE'::text AS "resourceType",
        resource."createdAt",
        resource."updatedAt"
      FROM "notes" AS resource
      WHERE ${this.buildWhereQuery(targetTag, keyword)}
    `;
  }

  private buildWhereQuery(targetTag: string, keyword: string) {
    const searchQuery = keyword
      ? Prisma.sql`
          AND lower(
            concat_ws(
              ' ',
              resource."title",
              resource."summary",
              resource."category",
              array_to_string(resource."tags", ' ')
            )
          ) LIKE ${`%${this.escapeLikePattern(keyword)}%`} ESCAPE '\'
        `
      : Prisma.empty;

    return Prisma.sql`
      EXISTS (
        SELECT 1
        FROM unnest(resource."tags") AS tag(value)
        WHERE lower(btrim(tag.value)) = ${targetTag}
      )
      ${searchQuery}
    `;
  }

  private escapeLikePattern(value: string) {
    return value.replace(/[\\%_]/g, '\\$&');
  }

  private addResourceTags(
    accumulator: Map<string, TagAccumulator>,
    resourceTags: string[],
    resourceType: ContentTagResourceType.SOLUTION | ContentTagResourceType.NOTE
  ) {
    const uniqueTags = new Map<string, string>();
    resourceTags.forEach((tag) => {
      const name = tag.trim();
      if (name) {
        uniqueTags.set(this.normalizeTag(name), name);
      }
    });

    uniqueTags.forEach((name, key) => {
      const current = accumulator.get(key) ?? {
        name,
        total: 0,
        solutionCount: 0,
        noteCount: 0
      };
      current.total += 1;
      if (resourceType === ContentTagResourceType.SOLUTION) {
        current.solutionCount += 1;
      } else {
        current.noteCount += 1;
      }
      accumulator.set(key, current);
    });
  }

  private normalizeTag(tag: string) {
    return tag.trim().toLocaleLowerCase('zh-CN');
  }
}
