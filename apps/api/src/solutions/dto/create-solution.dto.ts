import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSolutionDto {
  @ApiProperty({ example: '关于 Codex 如何在没有 AGENTS.md 时读取 CLAUDE.md' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: '通过配置 project_doc_fallback_filenames，让 Codex 回退读取 CLAUDE.md。' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiProperty({ description: 'Markdown 正文内容。' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ example: 'Codex' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({ type: [String], example: ['Codex', 'CLAUDE.md', '配置'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @ArrayMaxSize(20)
  tags?: string[];
}
