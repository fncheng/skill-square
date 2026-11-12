export interface SkillCandidateFile {
  path: string;
  size: number;
  hash: string;
}
export interface SkillFile extends SkillCandidateFile {
  id: string;
}
export interface SkillVersion {
  id: string;
  skillId: string;
  variantId: string;
  number: number;
  name: string;
  description: string;
  note: string;
  format: 'MD' | 'ZIP';
  originalName: string;
  contentHash: string;
  artifactHash: string;
  createdAt: string;
  files: SkillFile[];
}
export type SkillTool = 'codex' | 'claude-code' | 'unspecified';
export interface SkillVersionSummary extends Omit<SkillVersion, 'files'> {
  _count: { files: number };
}
export interface SkillVariant {
  id: string;
  skillId: string;
  toolKey: SkillTool;
  versions: SkillVersion[];
}
export interface SkillVariantSummary extends Omit<SkillVariant, 'versions'> {
  versions: SkillVersionSummary[];
  _count: { versions: number };
}
export interface SkillSummary {
  id: string;
  name: string;
  description: string;
  variants: SkillVariantSummary[];
  createdAt: string;
  updatedAt: string;
}
export interface Skill extends SkillSummary {
  versions: SkillVersion[];
}
export interface SkillCandidate {
  format: 'MD' | 'ZIP';
  name: string;
  description: string;
  files: SkillCandidateFile[];
  contentHash: string;
  artifactHash: string;
}
export interface SkillSave {
  file: File;
  name: string;
  description: string;
  note: string;
  requestId: string;
  expectedVersionId?: string;
  variantId?: string;
  toolKey?: SkillTool;
}
