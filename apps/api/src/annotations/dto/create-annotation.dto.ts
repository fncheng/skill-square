import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsISO8601, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { AnnotationResourceTypeDto } from './annotation-resource-type';

export class CreateAnnotationDto {
  @ApiProperty({ enum: AnnotationResourceTypeDto, example: AnnotationResourceTypeDto.NOTE })
  @IsEnum(AnnotationResourceTypeDto)
  resourceType: AnnotationResourceTypeDto;

  @ApiProperty({ description: '笔记或解决方案 UUID。' })
  @IsUUID()
  resourceId: string;

  @ApiProperty({ description: '批注 Markdown 内容。' })
  @IsString()
  @MinLength(1)
  @MaxLength(50000)
  content: string;

  @ApiProperty({ description: '被批注的原文。', maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  exact: string;

  @ApiPropertyOptional({ description: '原文前方上下文，用于正文修改后的重新定位。', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  prefix?: string;

  @ApiPropertyOptional({ description: '原文后方上下文，用于正文修改后的重新定位。', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  suffix?: string;

  @ApiProperty({ description: '选区在渲染文本中的起始偏移。', minimum: 0 })
  @IsInt()
  @Min(0)
  start: number;

  @ApiProperty({ description: '选区在渲染文本中的结束偏移。', minimum: 1 })
  @IsInt()
  @Min(1)
  end: number;

  @ApiPropertyOptional({ description: '创建锚点时文档的更新时间。' })
  @IsOptional()
  @IsISO8601()
  documentUpdatedAt?: string;
}
