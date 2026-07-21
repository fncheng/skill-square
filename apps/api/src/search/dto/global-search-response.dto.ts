import { ApiProperty } from '@nestjs/swagger';

export enum GlobalSearchResourceType {
  PROMPT = 'PROMPT',
  SOLUTION = 'SOLUTION',
  NOTE = 'NOTE',
  UI_PROTOTYPE = 'UI_PROTOTYPE'
}

export class GlobalSearchItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: GlobalSearchResourceType })
  resourceType: GlobalSearchResourceType;

  @ApiProperty()
  updatedAt: Date;
}

export class GlobalSearchResponseDto {
  @ApiProperty({ type: [GlobalSearchItemDto] })
  items: GlobalSearchItemDto[];
}
