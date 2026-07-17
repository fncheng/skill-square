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
import { ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateUiPrototypeDto } from './dto/create-ui-prototype.dto';
import { UiPrototypeQueryDto } from './dto/ui-prototype-query.dto';
import { UiPrototypeResponseDto } from './dto/ui-prototype-response.dto';
import { UpdateUiPrototypeDto } from './dto/update-ui-prototype.dto';
import { UiPrototypesService } from './ui-prototypes.service';

@ApiTags('UI Prototypes')
@Controller('ui-prototypes')
export class UiPrototypesController {
  constructor(private readonly uiPrototypesService: UiPrototypesService) {}

  @Get()
  @ApiOperation({ summary: '获取 UI 原型列表' })
  @ApiOkResponse({ type: UiPrototypeResponseDto, isArray: true })
  findAll(@Query() query: UiPrototypeQueryDto) {
    return this.uiPrototypesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取 UI 原型详情' })
  @ApiOkResponse({ type: UiPrototypeResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.uiPrototypesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建 UI 原型' })
  @ApiCreatedResponse({ type: UiPrototypeResponseDto })
  create(@Body() dto: CreateUiPrototypeDto) {
    return this.uiPrototypesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新 UI 原型' })
  @ApiOkResponse({ type: UiPrototypeResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUiPrototypeDto) {
    return this.uiPrototypesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除 UI 原型' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.uiPrototypesService.remove(id);
  }
}
