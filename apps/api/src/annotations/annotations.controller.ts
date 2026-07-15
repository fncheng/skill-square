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
import { AnnotationsService } from './annotations.service';
import { AnnotationQueryDto } from './dto/annotation-query.dto';
import { AnnotationResponseDto } from './dto/annotation-response.dto';
import { CreateAnnotationDto } from './dto/create-annotation.dto';
import { UpdateAnnotationDto } from './dto/update-annotation.dto';

@ApiTags('Annotations')
@Controller('annotations')
export class AnnotationsController {
  constructor(private readonly annotationsService: AnnotationsService) {}

  @Get()
  @ApiOperation({ summary: '获取文档批注列表' })
  @ApiOkResponse({ type: AnnotationResponseDto, isArray: true })
  findAll(@Query() query: AnnotationQueryDto) {
    return this.annotationsService.findAll(query);
  }

  @Post()
  @ApiOperation({ summary: '创建 Markdown 批注' })
  @ApiCreatedResponse({ type: AnnotationResponseDto })
  create(@Body() dto: CreateAnnotationDto) {
    return this.annotationsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新批注内容或文本锚点' })
  @ApiOkResponse({ type: AnnotationResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAnnotationDto) {
    return this.annotationsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除批注' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.annotationsService.remove(id);
  }
}
