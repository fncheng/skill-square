import { ApiProperty } from '@nestjs/swagger';

export enum ContentTagScope {
  ALL = 'ALL',
  SOLUTION = 'SOLUTION',
  NOTE = 'NOTE'
}

export enum ContentTagResourceType {
  SOLUTION = 'SOLUTION',
  NOTE = 'NOTE'
}

export class ContentTagCloudItemDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  total: number;

  @ApiProperty()
  solutionCount: number;

  @ApiProperty()
  noteCount: number;
}

export class ContentTagCloudResponseDto {
  @ApiProperty({ type: [ContentTagCloudItemDto] })
  items: ContentTagCloudItemDto[];

  @ApiProperty()
  totalTags: number;

  @ApiProperty()
  taggedSolutionCount: number;

  @ApiProperty()
  taggedNoteCount: number;
}

export class ContentTagItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  summary: string;

  @ApiProperty()
  category: string;

  @ApiProperty({ type: [String] })
  tags: string[];

  @ApiProperty({ enum: ContentTagResourceType })
  resourceType: ContentTagResourceType;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class ContentTagItemsResponseDto {
  @ApiProperty({ type: [ContentTagItemDto] })
  items: ContentTagItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;
}
