import { PartialType, PickType } from '@nestjs/swagger';
import { CreateAnnotationDto } from './create-annotation.dto';

export class UpdateAnnotationDto extends PartialType(
  PickType(CreateAnnotationDto, [
    'content',
    'exact',
    'prefix',
    'suffix',
    'start',
    'end',
    'documentUpdatedAt'
  ] as const)
) {}
