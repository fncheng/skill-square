import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
import { ContentTransferDto } from '../common/dto/content-transfer.dto';
import { CreateModelResponseDto } from './dto/create-model-response.dto';
import { ModelResponseQueryDto } from './dto/model-response-query.dto';
import { ModelResponseDto } from './dto/model-response-response.dto';
import { UpdateModelResponseDto } from './dto/update-model-response.dto';
import { ModelResponsesService } from './model-responses.service';

@ApiTags('Model Responses')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: '需要管理员会话。' })
@UseGuards(AdminSessionGuard)
@Controller('model-responses')
export class ModelResponsesController {
  constructor(private readonly service: ModelResponsesService) {}

  @Get()
  @ApiOperation({ summary: '获取仅管理员可见的模型回答列表' })
  @ApiOkResponse({ type: ModelResponseDto, isArray: true })
  findAll(@Query() query: ModelResponseQueryDto) {
    return this.service.findAll(query);
  }

  @Post('import')
  @ApiOperation({ summary: '导入模型回答迁移文件' })
  @ApiCreatedResponse({ type: ModelResponseDto })
  importOne(@Body() dto: ContentTransferDto) {
    return this.service.importOne(dto);
  }

  @Get(':id/export')
  @ApiOperation({ summary: '导出模型回答迁移文件' })
  @ApiOkResponse({ type: ContentTransferDto })
  exportOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.exportOne(id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取模型回答详情' })
  @ApiOkResponse({ type: ModelResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '收录模型回答' })
  @ApiCreatedResponse({ type: ModelResponseDto })
  create(@Body() dto: CreateModelResponseDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新模型回答' })
  @ApiOkResponse({ type: ModelResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateModelResponseDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除模型回答及其批注' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
