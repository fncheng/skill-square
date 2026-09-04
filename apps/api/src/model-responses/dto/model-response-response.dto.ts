import { ApiProperty } from '@nestjs/swagger';

export class ModelResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  summary: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  category: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty()
  sourceProduct: string;

  @ApiProperty()
  modelName: string;

  @ApiProperty()
  originalPrompt: string;

  @ApiProperty()
  annotationCount: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
