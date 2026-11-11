import { http } from './request';
import type { Skill, SkillCandidate, SkillSave, SkillVersion } from '@/types/skill';

export const skillsApi = {
  async list() {
    return (await http.get<Skill[]>('/skills')).data;
  },
  async detail(id: string) {
    return (await http.get<Skill>(`/skills/${id}`)).data;
  },
  async inspect(file: File) {
    const body = new FormData();
    body.append('file', file);
    return (await http.post<SkillCandidate>('/skills/inspect', body)).data;
  },
  async save(input: SkillSave, id?: string) {
    const body = new FormData();
    body.append('file', input.file);
    body.append('name', input.name);
    body.append('description', input.description);
    body.append('note', input.note);
    body.append('requestId', input.requestId);
    if (input.expectedVersionId) body.append('expectedVersionId', input.expectedVersionId);
    return (await http.post<SkillVersion>(id ? `/skills/${id}/versions` : '/skills', body)).data;
  },
  async file(id: string, versionId: string, fileId: string) {
    return (await http.get<{ id: string; text: string | null }>(`/skills/${id}/versions/${versionId}/files/${fileId}`))
      .data;
  },
  async download(id: string, version: SkillVersion) {
    const result = await http.get<Blob>(`/skills/${id}/versions/${version.id}/download`, { responseType: 'blob' });
    const url = URL.createObjectURL(result.data);
    const link = document.createElement('a');
    link.href = url;
    link.download =
      version.format === 'MD'
        ? 'SKILL.md'
        : `${version.name.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 100) || 'skill'}-v${version.number}.zip`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
  async remove(id: string) {
    await http.delete(`/skills/${id}`);
  }
};
