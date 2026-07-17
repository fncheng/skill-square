import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UiPrototypeQueryDto {
  @ApiPropertyOptional({ description: '名称、描述、分类或标签搜索关键词。' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ description: '按分类精确筛选。' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;
}
