import { PartialType } from '@nestjs/swagger';
import { CreateUiPrototypeDto } from './create-ui-prototype.dto';

export class UpdateUiPrototypeDto extends PartialType(CreateUiPrototypeDto) {}
