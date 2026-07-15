import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AnnotationResourceTypeDto } from './annotation-resource-type';

export class AnnotationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: AnnotationResourceTypeDto })
  resourceType: AnnotationResourceTypeDto;

  @ApiProperty()
  resourceId: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  exact: string;

  @ApiProperty()
  prefix: string;

  @ApiProperty()
  suffix: string;

  @ApiProperty()
  start: number;

  @ApiProperty()
  end: number;

  @ApiPropertyOptional({ nullable: true })
  documentUpdatedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
