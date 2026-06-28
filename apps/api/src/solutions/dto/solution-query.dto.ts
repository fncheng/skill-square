import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SolutionQueryDto {
  @ApiPropertyOptional({ description: '标题、摘要或正文搜索关键词。' })
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
