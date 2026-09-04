import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  Equals,
  IsArray,
  IsEnum,
  IsISO8601,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  Validate,
  ValidateNested
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnotationResourceTypeDto } from '../../annotations/dto/annotation-resource-type';
import { NormalizeTags } from '../decorators/normalize-tags.decorator';
import { ContentTransferTagsConstraint } from '../validators/content-transfer-tags.validator';

export const CONTENT_TRANSFER_FORMAT = 'prompt-skill-manager-transfer';
export const CONTENT_TRANSFER_VERSION = 2;
export const CONTENT_TRANSFER_VERSIONS = [1, CONTENT_TRANSFER_VERSION] as const;
export type ContentTransferVersion = (typeof CONTENT_TRANSFER_VERSIONS)[number];

export function getContentTransferVersion(tags: readonly string[]): ContentTransferVersion {
  return tags.length > 0 ? CONTENT_TRANSFER_VERSION : 1;
}

export class ContentTransferResourceDto {
  @ApiProperty({ example: 'WSL 内连接本机 PostgreSQL 失败' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiProperty({ example: 'WSL 中的 localhost 指向 WSL 自身，需使用主机地址。' })
  @IsString()
  @MaxLength(500)
  summary: string;

  @ApiProperty({ description: 'Markdown 正文内容。' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({ example: '环境' })
  @IsString()
  @MaxLength(80)
  category: string;

  @ApiProperty({
    type: [String],
    example: ['WSL', 'PostgreSQL'],
    description: 'v1 兼容无标签历史内容；v2 规范化后至少包含一项。'
  })
  @NormalizeTags()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @ArrayMaxSize(20)
  tags: string[];

  @ApiPropertyOptional({ description: '模型回答的来源产品；其他资源不使用。' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  sourceProduct?: string;

  @ApiPropertyOptional({ description: '模型回答的模型名称；其他资源不使用。' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  modelName?: string;

  @ApiPropertyOptional({ description: '模型回答的原始 Prompt；其他资源不使用。' })
  @IsOptional()
  @IsString()
  @MaxLength(50000)
  originalPrompt?: string;

  @ApiProperty()
  @IsISO8601()
  createdAt: string;

  @ApiProperty()
  @IsISO8601()
  updatedAt: string;
}

export class ContentTransferAnnotationDto {
  @ApiProperty({ description: '批注 Markdown 内容。' })
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  content: string;

  @ApiProperty({ description: '被批注的原文。' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  exact: string;

  @ApiProperty({ description: '原文前方上下文。' })
  @IsString()
  @MaxLength(500)
  prefix: string;

  @ApiProperty({ description: '原文后方上下文。' })
  @IsString()
  @MaxLength(500)
  suffix: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  start: number;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  end: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsISO8601()
  documentUpdatedAt: string | null;

  @ApiProperty()
  @IsISO8601()
  createdAt: string;

  @ApiProperty()
  @IsISO8601()
  updatedAt: string;
}

export class ContentTransferDto {
  @ApiProperty({ example: CONTENT_TRANSFER_FORMAT })
  @Equals(CONTENT_TRANSFER_FORMAT)
  format: typeof CONTENT_TRANSFER_FORMAT;

  @ApiProperty({ example: CONTENT_TRANSFER_VERSION, enum: [...CONTENT_TRANSFER_VERSIONS] })
  @IsInt()
  @IsIn(CONTENT_TRANSFER_VERSIONS)
  version: ContentTransferVersion;

  @ApiProperty({ enum: AnnotationResourceTypeDto })
  @IsEnum(AnnotationResourceTypeDto)
  resourceType: AnnotationResourceTypeDto;

  @ApiProperty()
  @IsISO8601()
  exportedAt: string;

  @ApiProperty({ type: ContentTransferResourceDto })
  @Validate(ContentTransferTagsConstraint)
  @ValidateNested()
  @Type(() => ContentTransferResourceDto)
  resource: ContentTransferResourceDto;

  @ApiProperty({ type: [ContentTransferAnnotationDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContentTransferAnnotationDto)
  annotations: ContentTransferAnnotationDto[];
}
