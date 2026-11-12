import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SaveSkillDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(200) name: string;
  @ApiProperty() @IsString() @MaxLength(500) description: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(500) note: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() requestId: string;
  @ApiPropertyOptional({ enum: ['codex', 'claude-code', 'unspecified'] }) @IsOptional() @IsIn(['codex', 'claude-code', 'unspecified']) toolKey?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() variantId?: string;
  @ApiPropertyOptional({
    format: 'uuid',
    description: '追加版本时必填，窗口打开时的最新版本 ID'
  })
  @IsOptional()
  @IsUUID()
  expectedVersionId?: string;
}

export class ClassifySkillVariantDto {
  @ApiProperty({ enum: ['unspecified'] }) @IsIn(['unspecified']) expectedToolKey: string;
  @ApiProperty({ enum: ['codex', 'claude-code'] }) @IsIn(['codex', 'claude-code']) toolKey: string;
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
  @ApiProperty({ format: 'uuid' }) variantId: string;
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
export class SkillFileCountDto {
  @ApiProperty() files: number;
}
export class SkillVersionSummaryDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) skillId: string;
  @ApiProperty({ format: 'uuid' }) variantId: string;
  @ApiProperty() number: number;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty() note: string;
  @ApiProperty({ enum: ['MD', 'ZIP'] }) format: string;
  @ApiProperty() originalName: string;
  @ApiProperty() contentHash: string;
  @ApiProperty() artifactHash: string;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
  @ApiProperty({ type: SkillFileCountDto }) _count: SkillFileCountDto;
}
export class SkillCountDto {
  @ApiProperty() versions: number;
}
export class SkillVariantIdentityDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'uuid' }) skillId: string;
  @ApiProperty({ enum: ['codex', 'claude-code', 'unspecified'] }) toolKey: string;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt: Date;
}
export class SkillVariantDto extends SkillVariantIdentityDto {
  @ApiProperty({ type: [SkillVersionDto] }) versions: SkillVersionDto[];
}
export class SkillVariantSummaryDto extends SkillVariantIdentityDto {
  @ApiProperty({ type: [SkillVersionSummaryDto] }) versions: SkillVersionSummaryDto[];
  @ApiProperty({ type: SkillCountDto }) _count: SkillCountDto;
}
export class SkillDetailDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty({ format: 'date-time' }) createdAt: Date;
  @ApiProperty({ format: 'date-time' }) updatedAt: Date;
  @ApiProperty({ type: [SkillVariantSummaryDto] }) variants: SkillVariantSummaryDto[];
}
export class SkillTextDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ type: String, nullable: true }) text: string | null;
}
export class SkillListDto extends SkillDetailDto {}
export class SkillCandidateDto {
  @ApiProperty({ enum: ['MD', 'ZIP'] }) format: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty() contentHash: string;
  @ApiProperty() artifactHash: string;
  @ApiProperty({ type: [SkillCandidateFileDto] })
  files: SkillCandidateFileDto[];
}
