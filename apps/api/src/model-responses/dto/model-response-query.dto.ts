import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ModelResponseQueryDto {
  @ApiPropertyOptional({ description: '标题、摘要、正文、标签、来源产品、模型名称或原始 Prompt 搜索关键词。' })
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
