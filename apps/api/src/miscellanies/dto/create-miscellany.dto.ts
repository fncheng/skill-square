import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { NormalizeTags } from '../../common/decorators/normalize-tags.decorator';

export class CreateMiscellanyDto {
  @ApiProperty({ example: '一次关于团队协作的随手记录' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({ example: '记录尚未归类的工作想法与经验片段。' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @ApiProperty({ description: 'Markdown 正文内容。' })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiPropertyOptional({ example: '协作' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiProperty({ type: [String], example: ['随手记', '协作'], minItems: 1 })
  @NormalizeTags()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  @ArrayMaxSize(20)
  tags: string[];
}
