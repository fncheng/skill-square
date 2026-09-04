import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeTags } from '../../common/decorators/normalize-tags.decorator';

export class CreateModelResponseDto {
  @ApiProperty({ example: '为现有服务补充私有读取权限' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: '一份可直接落地的 NestJS Guard 实现建议。' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiProperty({ description: '模型回答 Markdown 正文。' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ example: '权限设计' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiProperty({ type: [String], minItems: 1, example: ['NestJS', '权限'] })
  @NormalizeTags()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags: string[];

  @ApiPropertyOptional({ example: 'ChatGPT' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceProduct?: string;

  @ApiPropertyOptional({ example: 'GPT-5' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelName?: string;

  @ApiPropertyOptional({ description: '产生该回答时输入的原始 Prompt。' })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  originalPrompt?: string;
}
