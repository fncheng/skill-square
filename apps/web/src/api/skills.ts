import { http } from './request';
import type { SkillCandidate, SkillSave, SkillVersion, SkillVariant, SkillTool, SkillSummary, SkillVersionSummary } from '@/types/skill';

export const skillsApi = {
  async list() {
    return (await http.get<SkillSummary[]>('/skills')).data;
  },
  async detail(id: string, variantId?: string) {
    const skill = (await http.get<SkillSummary>(`/skills/${id}`)).data;
    const active = variantId ? skill.variants.find((item) => item.id === variantId) : skill.variants[0];
    if (!active) throw new Error('指定的工具适配不存在。');
    const variant = await this.variant(id, active.id);
    return { ...skill, versions: variant.versions };
  },
  async variant(id: string, variantId: string) {
    return (await http.get<SkillVariant>(`/skills/${id}/variants/${variantId}`)).data;
  },
  async classify(id: string, variantId: string, toolKey: SkillTool) {
    return (await http.patch<Omit<SkillVariant, 'versions'>>(`/skills/${id}/variants/${variantId}`, { expectedToolKey: 'unspecified', toolKey })).data;
  },
  async inspect(file: File) {
    const body = new FormData();
    body.append('file', file);
    return (await http.post<SkillCandidate>('/skills/inspect', body)).data;
  },
  async save(input: SkillSave, id?: string, newVariant = false) {
    const body = new FormData();
    body.append('file', input.file);
    body.append('name', input.name);
    body.append('description', input.description);
    body.append('note', input.note);
    body.append('requestId', input.requestId);
    if (input.toolKey) body.append('toolKey', input.toolKey);
    if (input.variantId) body.append('variantId', input.variantId);
    if (input.expectedVersionId) body.append('expectedVersionId', input.expectedVersionId);
    return (await http.post<SkillVersion>(id ? `/skills/${id}/${newVariant ? 'variants' : 'versions'}` : '/skills', body)).data;
  },
  async file(id: string, versionId: string, fileId: string) {
    return (await http.get<{ id: string; text: string | null }>(`/skills/${id}/versions/${versionId}/files/${fileId}`))
      .data;
  },
  async download(id: string, version: SkillVersion | SkillVersionSummary, name: string, toolKey: SkillTool) {
    const result = await http.get<Blob>(`/skills/${id}/versions/${version.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(result.data);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      version.format === 'MD'
        ? 'SKILL.md'
        : `${name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100) || 'skill'}-${toolKey}-v${version.number}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  async remove(id: string) {
    await http.delete(`/skills/${id}`);
  }
};
