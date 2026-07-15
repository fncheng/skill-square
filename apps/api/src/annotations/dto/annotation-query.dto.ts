import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { AnnotationResourceTypeDto } from './annotation-resource-type';

export class AnnotationQueryDto {
  @ApiProperty({ enum: AnnotationResourceTypeDto, example: AnnotationResourceTypeDto.NOTE })
  @IsEnum(AnnotationResourceTypeDto)
  resourceType: AnnotationResourceTypeDto;

  @ApiProperty({ description: '笔记或解决方案 UUID。' })
  @IsUUID()
  resourceId: string;
}
