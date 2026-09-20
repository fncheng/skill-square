import { PartialType } from '@nestjs/swagger';
import { CreateMiscellanyDto } from './create-miscellany.dto';

export class UpdateMiscellanyDto extends PartialType(CreateMiscellanyDto) {}
