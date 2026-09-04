import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';
import {
  GlobalSearchItemDto,
  GlobalSearchResourceType,
  GlobalSearchResponseDto
} from './dto/global-search-response.dto';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService, private readonly authService: AuthService) {}

  async search(query: GlobalSearchQueryDto, request: Request): Promise<GlobalSearchResponseDto> {
    const keyword = query.query.trim();
    if (!keyword) {
      return { items: [] };
    }

    const take = query.limit;
    const [prompts, solutions, notes, uiPrototypes, session] = await Promise.all([
      this.prisma.prompt.findMany({
        where: { name: { contains: keyword, mode: 'insensitive' } },
        select: { id: true, name: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take
      }),
      this.prisma.solution.findMany({
        where: { title: { contains: keyword, mode: 'insensitive' } },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take
      }),
      this.prisma.note.findMany({
        where: { title: { contains: keyword, mode: 'insensitive' } },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take
      }),
      this.prisma.uiPrototype.findMany({
        where: { title: { contains: keyword, mode: 'insensitive' } },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take
      }),
      this.authService.getSession(request)
    ]);

    const modelResponses = session.authenticated
      ? await this.prisma.modelResponse.findMany({
          where: { title: { contains: keyword, mode: 'insensitive' } },
          select: { id: true, title: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take
        })
      : [];

    const items: GlobalSearchItemDto[] = [
      ...prompts.map((prompt) => ({
        id: prompt.id,
        title: prompt.name,
        resourceType: GlobalSearchResourceType.PROMPT,
        updatedAt: prompt.updatedAt
      })),
      ...solutions.map((solution) => ({
        ...solution,
        resourceType: GlobalSearchResourceType.SOLUTION
      })),
      ...notes.map((note) => ({
        ...note,
        resourceType: GlobalSearchResourceType.NOTE
      })),
      ...uiPrototypes.map((uiPrototype) => ({
        ...uiPrototype,
        resourceType: GlobalSearchResourceType.UI_PROTOTYPE
      })),
      ...modelResponses.map((modelResponse) => ({ ...modelResponse, resourceType: GlobalSearchResourceType.MODEL_RESPONSE }))
    ];

    return {
      items: items.sort((left, right) => this.compareItems(left, right, keyword)).slice(0, take)
    };
  }

  private compareItems(left: GlobalSearchItemDto, right: GlobalSearchItemDto, keyword: string) {
    const normalizedKeyword = keyword.toLocaleLowerCase();
    const leftRank = this.getMatchRank(left.title, normalizedKeyword);
    const rightRank = this.getMatchRank(right.title, normalizedKeyword);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return right.updatedAt.getTime() - left.updatedAt.getTime();
  }

  private getMatchRank(title: string, normalizedKeyword: string) {
    const normalizedTitle = title.toLocaleLowerCase();
    if (normalizedTitle === normalizedKeyword) {
      return 0;
    }
    if (normalizedTitle.startsWith(normalizedKeyword)) {
      return 1;
    }
    return 2;
  }
}
