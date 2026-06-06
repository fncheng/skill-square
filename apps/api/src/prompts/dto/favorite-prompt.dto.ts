import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class FavoritePromptDto {
  @ApiProperty()
  @IsBoolean()
  isFavorite: boolean;
}
