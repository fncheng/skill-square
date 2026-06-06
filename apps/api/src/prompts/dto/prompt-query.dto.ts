import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class PromptQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '名称或内容搜索关键词。' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: '分类 ID。' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: '标签 ID，支持逗号分隔或重复查询参数。' })
  @IsOptional()
  tagIds?: string | string[];

  @ApiPropertyOptional({ description: '标签名称搜索关键词。' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  tag?: string;

  @ApiPropertyOptional({ description: '是否仅查询收藏 Prompt。' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return value === true || value === 'true';
  })
  @IsBoolean()
  favorite?: boolean;
}
