import { Injectable } from '@nestjs/common';
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

interface ContentItemSource {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
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
    const [solutions, notes] = await Promise.all([
      this.prisma.solution.findMany({
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          tags: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      this.prisma.note.findMany({
        select: {
          id: true,
          title: true,
          summary: true,
          category: true,
          tags: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ]);
    const targetTag = this.normalizeTag(query.tag);
    const keyword = query.search?.trim().toLocaleLowerCase('zh-CN') ?? '';
    const resourceType = query.resourceType ?? ContentTagScope.ALL;
    const entries = [
      ...(resourceType !== ContentTagScope.NOTE
        ? this.filterItems(solutions, targetTag, keyword, ContentTagResourceType.SOLUTION)
        : []),
      ...(resourceType !== ContentTagScope.SOLUTION
        ? this.filterItems(notes, targetTag, keyword, ContentTagResourceType.NOTE)
        : [])
    ].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const start = (page - 1) * pageSize;

    return {
      items: entries.slice(start, start + pageSize),
      total: entries.length,
      page,
      pageSize
    };
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

  private filterItems(
    items: ContentItemSource[],
    targetTag: string,
    keyword: string,
    resourceType: ContentTagResourceType.SOLUTION | ContentTagResourceType.NOTE
  ) {
    return items
      .filter((item) => item.tags.some((tag) => this.normalizeTag(tag) === targetTag))
      .filter((item) => {
        if (!keyword) {
          return true;
        }
        return [item.title, item.summary, item.category, ...item.tags]
          .join(' ')
          .toLocaleLowerCase('zh-CN')
          .includes(keyword);
      })
      .map((item) => ({ ...item, resourceType }));
  }

  private normalizeTag(tag: string) {
    return tag.trim().toLocaleLowerCase('zh-CN');
  }
}
