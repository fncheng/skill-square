import { PartialType } from '@nestjs/swagger';
import { CreateModelResponseDto } from './create-model-response.dto';

export class UpdateModelResponseDto extends PartialType(CreateModelResponseDto) {}
