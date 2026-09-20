import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { AuthService } from '../auth/auth.service';
import { ContentTagsService } from './content-tags.service';
import { ContentTagItemsQueryDto } from './dto/content-tag-items-query.dto';
import { ContentTagCloudResponseDto, ContentTagItemsResponseDto } from './dto/content-tag-response.dto';

@ApiTags('Content Tags')
@Controller('content-tags')
export class ContentTagsController {
  constructor(
    private readonly contentTagsService: ContentTagsService,
    private readonly authService: AuthService
  ) {}

  @Get()
  @ApiOperation({ summary: '获取解决方案、学习笔记与杂谈的标签词云数据' })
  @ApiOkResponse({ type: ContentTagCloudResponseDto })
  findCloud() {
    return this.contentTagsService.findCloud();
  }

  @Get('items')
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({ summary: '获取指定标签下的公开内容；管理员会话额外包含模型回答' })
  @ApiOkResponse({ type: ContentTagItemsResponseDto })
  async findItems(@Query() query: ContentTagItemsQueryDto, @Req() request: Request) {
    // 仅由服务端验证 Cookie 后决定私有模型回答是否参与查询，不能信任客户端登录状态。
    const session = await this.authService.getSession(request);
    return this.contentTagsService.findItems(query, session.authenticated);
  }
}
