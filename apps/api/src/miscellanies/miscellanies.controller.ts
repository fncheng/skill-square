import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, Put, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContentTransferDto } from '../common/dto/content-transfer.dto';
import { CreateMiscellanyDto } from './dto/create-miscellany.dto';
import { MiscellanyQueryDto } from './dto/miscellany-query.dto';
import { MiscellanyResponseDto } from './dto/miscellany-response.dto';
import { UpdateMiscellanyDto } from './dto/update-miscellany.dto';
import { MiscellaniesService } from './miscellanies.service';

@ApiTags('Miscellanies')
@Controller('miscellanies')
export class MiscellaniesController {
  constructor(private readonly miscellaniesService: MiscellaniesService) {}

  @Get()
  @ApiOperation({ summary: '获取杂谈列表' })
  @ApiOkResponse({ type: MiscellanyResponseDto, isArray: true })
  findAll(@Query() query: MiscellanyQueryDto) { return this.miscellaniesService.findAll(query); }

  @Post('import')
  @ApiOperation({ summary: '从迁移文件导入杂谈' })
  @ApiCreatedResponse({ type: MiscellanyResponseDto })
  importOne(@Body() dto: ContentTransferDto) { return this.miscellaniesService.importOne(dto); }

  @Get(':id/export')
  @ApiOperation({ summary: '导出杂谈迁移文件数据' })
  @ApiOkResponse({ type: ContentTransferDto })
  exportOne(@Param('id', ParseUUIDPipe) id: string) { return this.miscellaniesService.exportOne(id); }

  @Get(':id')
  @ApiOperation({ summary: '获取杂谈详情' })
  @ApiOkResponse({ type: MiscellanyResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) { return this.miscellaniesService.findOne(id); }

  @Post()
  @ApiOperation({ summary: '创建杂谈' })
  @ApiCreatedResponse({ type: MiscellanyResponseDto })
  create(@Body() dto: CreateMiscellanyDto) { return this.miscellaniesService.create(dto); }

  @Put(':id')
  @ApiOperation({ summary: '更新杂谈' })
  @ApiOkResponse({ type: MiscellanyResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMiscellanyDto) { return this.miscellaniesService.update(id, dto); }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除杂谈' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) { return this.miscellaniesService.remove(id); }
}
