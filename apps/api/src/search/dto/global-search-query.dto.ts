import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

export class GlobalSearchQueryDto {
  @ApiProperty({ description: '标题搜索关键词。', maxLength: 120 })
  @IsString()
  @MaxLength(120)
  query: string;

  @ApiPropertyOptional({ description: '最多返回的结果数量。', default: 12, minimum: 1, maximum: 50 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 12;
}
