import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ContentTagScope } from './content-tag-response.dto';

export class ContentTagItemsQueryDto extends PaginationQueryDto {
  @ApiProperty({ description: '按标签名称精确筛选，忽略大小写。' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  tag: string;

  @ApiPropertyOptional({ enum: ContentTagScope, default: ContentTagScope.ALL })
  @IsOptional()
  @IsEnum(ContentTagScope)
  resourceType?: ContentTagScope = ContentTagScope.ALL;

  @ApiPropertyOptional({ description: '在标题、摘要、分类和标签中搜索。' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}
