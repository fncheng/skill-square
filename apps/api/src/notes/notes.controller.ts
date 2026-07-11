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
import { CreateNoteDto } from './dto/create-note.dto';
import { NoteQueryDto } from './dto/note-query.dto';
import { NoteResponseDto } from './dto/note-response.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotesService } from './notes.service';

@ApiTags('Notes')
@Controller('notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @ApiOperation({ summary: '获取学习笔记列表' })
  @ApiOkResponse({ type: NoteResponseDto, isArray: true })
  findAll(@Query() query: NoteQueryDto) {
    return this.notesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取学习笔记详情' })
  @ApiOkResponse({ type: NoteResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.notesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建学习笔记' })
  @ApiCreatedResponse({ type: NoteResponseDto })
  create(@Body() dto: CreateNoteDto) {
    return this.notesService.create(dto);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新学习笔记' })
  @ApiOkResponse({ type: NoteResponseDto })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateNoteDto) {
    return this.notesService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除学习笔记' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.notesService.remove(id);
  }
}
