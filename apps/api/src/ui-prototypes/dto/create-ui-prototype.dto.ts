import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsByteLength,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength
} from 'class-validator';

const MAX_HTML_BYTES = 2 * 1024 * 1024;

export class CreateUiPrototypeDto {
  @ApiProperty({ example: 'AI 智能体运营工作台' })
  @IsString()
  @MinLength(1)
  @Matches(/\S/, { message: 'UI 原型名称不能为空。' })
  @MaxLength(160)
  title: string;

  @ApiPropertyOptional({ example: '展示智能体调用趋势、关键指标和待处理事项的后台首页。' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiProperty({ description: '完整的单文件 HTML 源码，UTF-8 编码后最大 2 MB。' })
  @IsString()
  @Matches(/\S/, { message: 'HTML 内容不能为空。' })
  @IsByteLength(1, MAX_HTML_BYTES, { message: 'HTML 内容不能为空且不能超过 2 MB。' })
  html: string;

  @ApiPropertyOptional({ example: '后台系统' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ type: [String], example: ['Dashboard', 'AI Agent'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @ArrayMaxSize(20)
  tags?: string[];

  @ApiPropertyOptional({
    default: false,
    description: '是否允许预览页面加载远程图片、字体、脚本和其他外部资源。'
  })
  @IsOptional()
  @IsBoolean()
  allowExternal?: boolean;
}
