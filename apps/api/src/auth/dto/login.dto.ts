import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin', maxLength: 80 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  username: string;

  @ApiProperty({ format: 'password', maxLength: 128, writeOnly: true })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
