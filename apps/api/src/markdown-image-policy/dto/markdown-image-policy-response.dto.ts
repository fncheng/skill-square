import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MarkdownImagePolicyResponseDto {
  @ApiProperty({ example: ['cdn.example.com', 'images.unsplash.com'] })
  allowedHosts: string[];

  @ApiProperty({ example: 3 })
  version: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  updatedAt: Date | null;
}
