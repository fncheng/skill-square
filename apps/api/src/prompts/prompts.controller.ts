import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from '@nestjs/swagger';
import { CreatePromptDto } from './dto/create-prompt.dto';
import { FavoritePromptDto } from './dto/favorite-prompt.dto';
import { PromptQueryDto } from './dto/prompt-query.dto';
import { PaginatedPromptResponseDto, PromptResponseDto } from './dto/prompt-response.dto';
import { PromptVersionResponseDto } from './dto/prompt-version-response.dto';
import { UpdatePromptDto } from './dto/update-prompt.dto';
import { PromptsService } from './prompts.service';

@ApiTags('Prompts')
@Controller('prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  @ApiOperation({ summary: '获取 Prompt 列表' })
  @ApiOkResponse({ type: PaginatedPromptResponseDto })
  findAll(@Query() query: PromptQueryDto) {
    return this.promptsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取 Prompt 详情' })
  @ApiOkResponse({ type: PromptResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.promptsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建 Prompt' })
  @ApiCreatedResponse({ type: PromptResponseDto })
  create(@Body() dto: CreatePromptDto) {
    return this.promptsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新 Prompt，并自动生成版本快照' })
  @ApiOkResponse({ type: PromptResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePromptDto) {
    return this.promptsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除 Prompt' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.promptsService.remove(id);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: '收藏 Prompt' })
  @ApiOkResponse({ type: PromptResponseDto })
  favorite(@Param('id', ParseUUIDPipe) id: string) {
    return this.promptsService.markFavorite(id, true);
  }

  @Delete(':id/favorite')
  @ApiOperation({ summary: '取消收藏 Prompt' })
  @ApiOkResponse({ type: PromptResponseDto })
  unfavorite(@Param('id', ParseUUIDPipe) id: string) {
    return this.promptsService.markFavorite(id, false);
  }

  @Put(':id/favorite')
  @ApiOperation({ summary: '设置 Prompt 收藏状态' })
  @ApiOkResponse({ type: PromptResponseDto })
  setFavorite(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FavoritePromptDto) {
    return this.promptsService.markFavorite(id, dto.isFavorite);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '获取 Prompt 版本历史' })
  @ApiOkResponse({ type: PromptVersionResponseDto, isArray: true })
  findVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.promptsService.findVersions(id);
  }

  @Post(':id/rollback/:versionId')
  @ApiOperation({ summary: '回滚 Prompt 到指定版本' })
  @ApiOkResponse({ type: PromptResponseDto })
  rollback(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string
  ) {
    return this.promptsService.rollback(id, versionId);
  }
}
