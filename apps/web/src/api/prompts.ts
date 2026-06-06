import { http } from './request';
import type { Prompt, PromptPage, PromptPayload, PromptQuery, PromptVersion } from '@/types/domain';

export async function getPrompts(query: PromptQuery) {
  const response = await http.get<PromptPage>('/prompts', {
    params: {
      ...query,
      tagIds: query.tagIds?.join(',')
    }
  });
  return response.data;
}

export async function getPrompt(id: string) {
  const response = await http.get<Prompt>(`/prompts/${id}`);
  return response.data;
}

export async function createPrompt(payload: PromptPayload) {
  const response = await http.post<Prompt>('/prompts', payload);
  return response.data;
}

export async function updatePrompt(id: string, payload: PromptPayload) {
  const response = await http.put<Prompt>(`/prompts/${id}`, payload);
  return response.data;
}

export async function deletePrompt(id: string) {
  await http.delete(`/prompts/${id}`);
}

export async function favoritePrompt(id: string) {
  const response = await http.post<Prompt>(`/prompts/${id}/favorite`);
  return response.data;
}

export async function unfavoritePrompt(id: string) {
  const response = await http.delete<Prompt>(`/prompts/${id}/favorite`);
  return response.data;
}

export async function getPromptVersions(id: string) {
  const response = await http.get<PromptVersion[]>(`/prompts/${id}/versions`);
  return response.data;
}

export async function rollbackPrompt(id: string, versionId: string) {
  const response = await http.post<Prompt>(`/prompts/${id}/rollback/${versionId}`);
  return response.data;
}
