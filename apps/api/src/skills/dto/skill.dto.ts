import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SaveSkillDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) name: string;
  @ApiProperty() @IsString() @MaxLength(500) description: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) note: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() requestId: string;
  @ApiPropertyOptional({
    format: 'uuid',
    description: '追加版本时必填，窗口打开时的最新版本 ID'
  })
  @IsOptional()
  @IsUUID()
  expectedVersionId?: string;
}

export class SkillCandidateFileDto {
  @ApiProperty() path: string;
  @ApiProperty() size: number;
  @ApiProperty() hash: string;
}
export class SkillFileDto extends SkillCandidateFileDto {
  @ApiProperty({ format: 'uuid' }) id: string;
}
export class SkillVersionDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) skillId: string;
  @ApiProperty() number: number;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty() note: string;
  @ApiProperty({ enum: ['MD', 'ZIP'] }) format: string;
  @ApiProperty() originalName: string;
  @ApiProperty() contentHash: string;
  @ApiProperty() artifactHash: string;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
  @ApiProperty({ type: [SkillFileDto] }) files: SkillFileDto[];
}
export class SkillDetailDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt: Date;
  @ApiProperty({ type: [SkillVersionDto] }) versions: SkillVersionDto[];
}
export class SkillTextDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: String, nullable: true }) text: string | null;
}
export class SkillCountDto {
  @ApiProperty() versions: number;
}
export class SkillListDto extends SkillDetailDto {
  @ApiProperty({ type: SkillCountDto }) _count: SkillCountDto;
}
export class SkillCandidateDto {
  @ApiProperty({ enum: ['MD', 'ZIP'] }) format: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty() contentHash: string;
  @ApiProperty() artifactHash: string;
  @ApiProperty({ type: [SkillCandidateFileDto] })
  files: SkillCandidateFileDto[];
}
