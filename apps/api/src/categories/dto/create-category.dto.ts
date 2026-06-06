import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: '前端开发' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name: string;

  @ApiPropertyOptional({ example: '前端工程、组件、交互和性能优化相关 Prompt。' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
