import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GlobalSearchQueryDto } from './dto/global-search-query.dto';
import { GlobalSearchResponseDto } from './dto/global-search-response.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: '按标题全局搜索内容' })
  @ApiOkResponse({ type: GlobalSearchResponseDto })
  search(@Query() query: GlobalSearchQueryDto, @Req() request: Request) {
    return this.searchService.search(query, request);
  }
}
