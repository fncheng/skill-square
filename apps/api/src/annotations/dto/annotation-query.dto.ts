import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { AnnotationResourceTypeDto } from './annotation-resource-type';

export class AnnotationQueryDto {
  @ApiProperty({ enum: AnnotationResourceTypeDto, example: AnnotationResourceTypeDto.NOTE })
  @IsEnum(AnnotationResourceTypeDto)
  resourceType: AnnotationResourceTypeDto;

  @ApiProperty({ description: '笔记、解决方案或模型回答 UUID。' })
  @IsUUID()
  resourceId: string;
}
