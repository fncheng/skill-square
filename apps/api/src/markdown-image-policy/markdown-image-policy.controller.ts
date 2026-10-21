import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiBadRequestResponse, ApiConflictResponse, ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { MarkdownImagePolicyResponseDto } from './dto/markdown-image-policy-response.dto';
import { UpdateMarkdownImagePolicyDto } from './dto/update-markdown-image-policy.dto';
import { MarkdownImagePolicyService } from './markdown-image-policy.service';

@ApiTags('Markdown Image Policy')
@Controller('markdown-image-policy')
export class MarkdownImagePolicyController {
  constructor(private readonly service: MarkdownImagePolicyService) {}

  @Get()
  @ApiOperation({ summary: '获取 Markdown 外部图片白名单' })
  @ApiOkResponse({ type: MarkdownImagePolicyResponseDto })
  getPolicy() {
    return this.service.getPolicy();
  }

  @Put()
  @ApiCookieAuth(AUTH_COOKIE_NAME)
  @ApiOperation({ summary: '原子替换 Markdown 外部图片白名单' })
  @ApiOkResponse({ type: MarkdownImagePolicyResponseDto })
  @ApiBadRequestResponse({ description: 'Host 格式、列表数量或版本号不合法。' })
  @ApiUnauthorizedResponse({ description: '需要管理员会话。' })
  @ApiConflictResponse({ description: 'expectedVersion 已过期。' })
  updatePolicy(@Body() dto: UpdateMarkdownImagePolicyDto) {
    return this.service.updatePolicy(dto);
  }
}
