import { ApiProperty } from '@nestjs/swagger';

export class AdminIdentityDto {
  @ApiProperty({ example: 'admin' })
  username: 'admin';

  @ApiProperty({ example: 'admin' })
  role: 'admin';
}

export class AuthSessionResponseDto {
  @ApiProperty()
  authenticated: boolean;

  @ApiProperty({ type: AdminIdentityDto, nullable: true })
  user: AdminIdentityDto | null;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}
