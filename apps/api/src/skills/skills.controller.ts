import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCookieAuth,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse
} from '@nestjs/swagger';
import { Response } from 'express';
import { AUTH_COOKIE_NAME } from '../auth/auth.constants';
import { AdminSessionGuard } from '../auth/guards/admin-session.guard';
import {
  SaveSkillDto,
  SkillCandidateDto,
  SkillDetailDto,
  SkillListDto,
  SkillTextDto,
  SkillVersionDto
} from './dto/skill.dto';
import { SkillsService, UploadedSkillFile } from './skills.service';
import { SKILL_UPLOAD_LIMIT } from './skill-package';

@Injectable()
class PrivateCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    context.switchToHttp().getResponse<Response>().setHeader('Cache-Control', 'private, no-store');
    return next.handle();
  }
}

const upload = FileInterceptor('file', {
  // Busboy 达到阈值即拒绝，包解析器负责校验含等号的文件上限。
  limits: { fileSize: SKILL_UPLOAD_LIMIT + 1, files: 1, fields: 6 }
});
@ApiTags('Skills')
@ApiCookieAuth(AUTH_COOKIE_NAME)
@ApiUnauthorizedResponse({ description: '需要管理员会话。' })
@UseGuards(AdminSessionGuard)
@UseInterceptors(PrivateCacheInterceptor)
@Controller('skills')
export class SkillsController {
  constructor(private readonly service: SkillsService) {}
  @Get()
  @ApiOkResponse({ type: SkillListDto, isArray: true })
  @ApiOperation({ summary: '列出私有 SKILL' })
  list() {
    return this.service.list();
  }
  @Post('inspect')
  @ApiCreatedResponse({ type: SkillCandidateDto })
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file']
    }
  })
  @ApiOperation({ summary: '校验候选文件包' })
  inspect(@UploadedFile() file: UploadedSkillFile) {
    return this.service.inspect(file).then(({ files, ...rest }) => ({
      ...rest,
      files: files.map(({ text, ...item }) => item)
    }));
  }
  @Post()
  @ApiCreatedResponse({ type: SkillVersionDto })
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string' },
        description: { type: 'string' },
        note: { type: 'string' },
        requestId: { type: 'string', format: 'uuid' }
      },
      required: ['file', 'name', 'description', 'note', 'requestId']
    }
  })
  @ApiOperation({ summary: '创建 SKILL' })
  create(@UploadedFile() file: UploadedSkillFile, @Body() dto: SaveSkillDto) {
    return this.service.save(file, dto);
  }
  @Post(':id/versions')
  @ApiCreatedResponse({ type: SkillVersionDto })
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        name: { type: 'string' },
        description: { type: 'string' },
        note: { type: 'string' },
        requestId: { type: 'string', format: 'uuid' },
        expectedVersionId: { type: 'string', format: 'uuid' }
      },
      required: ['file', 'name', 'description', 'note', 'requestId', 'expectedVersionId']
    }
  })
  @ApiOperation({ summary: '追加完整版本' })
  append(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: UploadedSkillFile, @Body() dto: SaveSkillDto) {
    return this.service.save(file, dto, id);
  }
  @Get(':id')
  @ApiOkResponse({ type: SkillDetailDto })
  @ApiOperation({ summary: '获取 SKILL 全部版本与文件清单' })
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.detail(id);
  }
  @Get(':id/versions/:versionId/files/:fileId')
  @ApiOkResponse({ type: SkillTextDto })
  @ApiOperation({ summary: '按需获取指定文件的有界文本' })
  file(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string
  ) {
    return this.service.file(id, versionId, fileId);
  }
  @Get(':id/versions/:versionId/download')
  @ApiOkResponse({ schema: { type: 'string', format: 'binary' } })
  @ApiOperation({ summary: '下载指定版本原包' })
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Res() response: Response
  ) {
    const version = await this.service.download(id, versionId);
    const filename =
      version.format === 'MD'
        ? 'SKILL.md'
        : `${version.name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100) || 'skill'}-v${version.number}.zip`;
    response
      .set({
        'Cache-Control': 'private, no-store',
        'Content-Type': version.format === 'MD' ? 'text/markdown; charset=utf-8' : 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff'
      })
      .send(version.artifact);
  }
  @Delete(':id')
  @ApiNoContentResponse()
  @HttpCode(204)
  @ApiOperation({ summary: '删除 SKILL 及所有版本' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
