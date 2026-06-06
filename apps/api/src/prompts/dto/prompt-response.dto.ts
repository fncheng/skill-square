import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto';
import { TagResponseDto } from '../../tags/dto/tag-response.dto';

export class PromptResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  isFavorite: boolean;

  @ApiPropertyOptional({ nullable: true })
  categoryId: string | null;

  @ApiPropertyOptional({ type: CategoryResponseDto, nullable: true })
  category: CategoryResponseDto | null;

  @ApiProperty({ type: TagResponseDto, isArray: true })
  tags: TagResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class PaginatedPromptResponseDto {
  @ApiProperty({ type: PromptResponseDto, isArray: true })
  items: PromptResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}
