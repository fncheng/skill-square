import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GlobalSearchResourceType {
  PROMPT = 'PROMPT',
  SOLUTION = 'SOLUTION',
  NOTE = 'NOTE',
  MISCELLANY = 'MISCELLANY',
  UI_PROTOTYPE = 'UI_PROTOTYPE',
  MODEL_RESPONSE = 'MODEL_RESPONSE'
}

export enum GlobalSearchMatchField {
  TITLE = 'TITLE',
  SUMMARY = 'SUMMARY',
  TAG = 'TAG'
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

  @ApiProperty({ enum: GlobalSearchMatchField, description: '该结果的最高优先级命中字段。' })
  matchField: GlobalSearchMatchField;

  @ApiPropertyOptional({ description: '标签命中时为完整标签，摘要命中时为截断摘要片段。' })
  matchText?: string;
}

export class GlobalSearchResponseDto {
  @ApiProperty({ type: [GlobalSearchItemDto] })
  items: GlobalSearchItemDto[];
}
