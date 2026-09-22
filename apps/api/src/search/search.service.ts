import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';
import {
  GlobalSearchItemDto,
  GlobalSearchMatchField,
  GlobalSearchResourceType,
  GlobalSearchResponseDto
} from './dto/global-search-response.dto';

interface GlobalSearchDatabaseRow {
  id: string;
  title: string;
  resourceType: GlobalSearchResourceType;
  updatedAt: Date;
  matchField: GlobalSearchMatchField;
  matchText: string | null;
}

type ArrayTagGlobalSearchResourceType = Exclude<GlobalSearchResourceType, GlobalSearchResourceType.PROMPT>;

const arrayTagSearchTables: Record<ArrayTagGlobalSearchResourceType, Prisma.Sql> = {
  [GlobalSearchResourceType.SOLUTION]: Prisma.raw('"solutions"'),
  [GlobalSearchResourceType.NOTE]: Prisma.raw('"notes"'),
  [GlobalSearchResourceType.MISCELLANY]: Prisma.raw('"miscellanies"'),
  [GlobalSearchResourceType.UI_PROTOTYPE]: Prisma.raw('"ui_prototypes"'),
  [GlobalSearchResourceType.MODEL_RESPONSE]: Prisma.raw('"model_responses"')
};

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService) {}

  async search(query: GlobalSearchQueryDto, request: Request): Promise<GlobalSearchResponseDto> {
    const keyword = query.query.trim();
    if (!keyword) {
      return { items: [] };
    }

    const session = await this.authService.getSession(request);
    const rows = await this.prisma.$queryRaw<GlobalSearchDatabaseRow[]>(
      this.buildSearchQuery(keyword, query.limit, session.authenticated)
    );

    return {
      items: rows.map((row) => this.toSearchItem(row))
    };
  }

  /**
   * 将各资源标准化后统一判断命中等级，保证数据库先排序和限制数量再返回结果。
   * 未认证请求的 entries 不包含 model_responses 分支，避免私有内容参与查询。
   */
  private buildSearchQuery(keyword: string, limit: number, includeModelResponses: boolean) {
    const containsPattern = `%${this.escapeLikePattern(keyword)}%`;
    const prefixPattern = `${this.escapeLikePattern(keyword)}%`;
    const entries = this.buildEntriesQuery(includeModelResponses);

    return Prisma.sql`
      WITH entries AS (
        ${entries}
      ),
      ranked_entries AS (
        SELECT
          entries.*,
          matching_tag."matchTag",
          position(lower(${keyword}) IN lower(entries."summary")) AS "summaryMatchPosition",
          CASE
            WHEN lower(entries."title") = lower(${keyword}) THEN 1
            WHEN entries."title" ILIKE ${prefixPattern} ESCAPE '\\' THEN 2
            WHEN entries."title" ILIKE ${containsPattern} ESCAPE '\\' THEN 3
            WHEN matching_tag."matchTag" IS NOT NULL AND lower(matching_tag."matchTag") = lower(${keyword}) THEN 4
            WHEN matching_tag."matchTag" IS NOT NULL AND matching_tag."matchTag" ILIKE ${prefixPattern} ESCAPE '\\' THEN 5
            WHEN matching_tag."matchTag" IS NOT NULL THEN 6
            ELSE 7
          END AS "matchRank"
        FROM entries
        LEFT JOIN LATERAL (
          SELECT btrim(tag.value) AS "matchTag"
          FROM unnest(entries."tags") AS tag(value)
          WHERE btrim(tag.value) ILIKE ${containsPattern} ESCAPE '\\'
          ORDER BY
            CASE
              WHEN lower(btrim(tag.value)) = lower(${keyword}) THEN 1
              WHEN btrim(tag.value) ILIKE ${prefixPattern} ESCAPE '\\' THEN 2
              ELSE 3
            END,
            btrim(tag.value) ASC
          LIMIT 1
        ) AS matching_tag ON TRUE
        WHERE entries."title" ILIKE ${containsPattern} ESCAPE '\\'
          OR entries."summary" ILIKE ${containsPattern} ESCAPE '\\'
          OR matching_tag."matchTag" IS NOT NULL
      )
      SELECT
        "id",
        "title",
        "resourceType",
        "updatedAt",
        CASE
          WHEN "matchRank" <= 3 THEN 'TITLE'
          WHEN "matchRank" <= 6 THEN 'TAG'
          ELSE 'SUMMARY'
        END AS "matchField",
        CASE
          WHEN "matchRank" BETWEEN 4 AND 6 THEN "matchTag"
          WHEN "matchRank" = 7 THEN concat(
            CASE WHEN "summaryMatchPosition" > 41 THEN '…' ELSE '' END,
            substring("summary" FROM greatest(1, "summaryMatchPosition" - 40) FOR 120),
            CASE
              WHEN char_length("summary") > greatest(1, "summaryMatchPosition" - 40) + 119 THEN '…'
              ELSE ''
            END
          )
          ELSE NULL
        END AS "matchText"
      FROM ranked_entries
      ORDER BY "matchRank" ASC, "updatedAt" DESC, "resourceType" ASC, "id" ASC
      LIMIT ${limit}
    `;
  }

  private buildEntriesQuery(includeModelResponses: boolean) {
    const publicEntries = Prisma.sql`
      ${this.buildPromptEntriesQuery()}
      UNION ALL
      ${this.buildArrayTagEntriesQuery(GlobalSearchResourceType.SOLUTION)}
      UNION ALL
      ${this.buildArrayTagEntriesQuery(GlobalSearchResourceType.NOTE)}
      UNION ALL
      ${this.buildArrayTagEntriesQuery(GlobalSearchResourceType.MISCELLANY)}
      UNION ALL
      ${this.buildArrayTagEntriesQuery(GlobalSearchResourceType.UI_PROTOTYPE)}
    `;

    return includeModelResponses
      ? Prisma.sql`${publicEntries} UNION ALL ${this.buildArrayTagEntriesQuery(GlobalSearchResourceType.MODEL_RESPONSE)}`
      : publicEntries;
  }

  private buildPromptEntriesQuery() {
    return Prisma.sql`
      SELECT
        prompt."id",
        prompt."name" AS "title",
        prompt."description" AS "summary",
        COALESCE(array_agg(DISTINCT tag."name") FILTER (WHERE tag."name" IS NOT NULL), ARRAY[]::text[]) AS "tags",
        'PROMPT'::text AS "resourceType",
        prompt."updatedAt"
      FROM "prompts" AS prompt
      LEFT JOIN "prompt_tags" AS prompt_tag ON prompt_tag."promptId" = prompt."id"
      LEFT JOIN "tags" AS tag ON tag."id" = prompt_tag."tagId"
      GROUP BY prompt."id", prompt."name", prompt."description", prompt."updatedAt"
    `;
  }

  private buildArrayTagEntriesQuery(resourceType: ArrayTagGlobalSearchResourceType) {
    const table = arrayTagSearchTables[resourceType];

    return Prisma.sql`
      SELECT
        resource."id",
        resource."title",
        resource."summary",
        resource."tags",
        ${resourceType}::text AS "resourceType",
        resource."updatedAt"
      FROM ${table} AS resource
    `;
  }

  private toSearchItem(row: GlobalSearchDatabaseRow): GlobalSearchItemDto {
    return {
      id: row.id,
      title: row.title,
      resourceType: row.resourceType,
      updatedAt: row.updatedAt,
      matchField: row.matchField,
      ...(row.matchText ? { matchText: row.matchText } : {})
    };
  }

  /** 将 LIKE 保留字符视作用户输入的普通文本。 */
  private escapeLikePattern(value: string) {
    return value.replace(/[\\%_]/g, '\\$&');
  }
}
