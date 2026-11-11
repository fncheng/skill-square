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
export interface Skill {
  id: string;
  createdAt: string;
  updatedAt: string;
  versions: SkillVersion[];
  _count?: { versions: number };
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
}
