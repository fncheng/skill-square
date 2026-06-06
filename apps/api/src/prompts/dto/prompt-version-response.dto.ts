import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PromptVersionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  promptId: string;

  @ApiProperty()
  version: number;

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

  @ApiPropertyOptional({ nullable: true })
  categoryName: string | null;

  @ApiProperty({ type: [String] })
  tagIds: string[];

  @ApiProperty({ type: [String] })
  tagNames: string[];

  @ApiProperty()
  createdAt: Date;
}
