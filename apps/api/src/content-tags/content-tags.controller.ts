import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContentTagsService } from './content-tags.service';
import { ContentTagItemsQueryDto } from './dto/content-tag-items-query.dto';
import { ContentTagCloudResponseDto, ContentTagItemsResponseDto } from './dto/content-tag-response.dto';

@ApiTags('Content Tags')
@Controller('content-tags')
export class ContentTagsController {
  constructor(private readonly contentTagsService: ContentTagsService) {}

  @Get()
  @ApiOperation({ summary: '获取解决方案与学习笔记的标签词云数据' })
  @ApiOkResponse({ type: ContentTagCloudResponseDto })
  findCloud() {
    return this.contentTagsService.findCloud();
  }

  @Get('items')
  @ApiOperation({ summary: '获取指定标签下的解决方案与学习笔记' })
  @ApiOkResponse({ type: ContentTagItemsResponseDto })
  findItems(@Query() query: ContentTagItemsQueryDto) {
    return this.contentTagsService.findItems(query);
  }
}
