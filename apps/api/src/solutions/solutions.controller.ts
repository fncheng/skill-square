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
import { CreateSolutionDto } from './dto/create-solution.dto';
import { SolutionQueryDto } from './dto/solution-query.dto';
import { SolutionResponseDto } from './dto/solution-response.dto';
import { UpdateSolutionDto } from './dto/update-solution.dto';
import { SolutionsService } from './solutions.service';

@ApiTags('Solutions')
@Controller('solutions')
export class SolutionsController {
  constructor(private readonly solutionsService: SolutionsService) {}

  @Get()
  @ApiOperation({ summary: '获取解决方案列表' })
  @ApiOkResponse({ type: SolutionResponseDto, isArray: true })
  findAll(@Query() query: SolutionQueryDto) {
    return this.solutionsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取解决方案详情' })
  @ApiOkResponse({ type: SolutionResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.solutionsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建解决方案' })
  @ApiCreatedResponse({ type: SolutionResponseDto })
  create(@Body() dto: CreateSolutionDto) {
    return this.solutionsService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新解决方案' })
  @ApiOkResponse({ type: SolutionResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSolutionDto) {
    return this.solutionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除解决方案' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.solutionsService.remove(id);
  }
}
