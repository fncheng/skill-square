import { http } from './request';
import type { Tag } from '@/types/domain';

export interface TagPayload {
  name: string;
  color: string;
}

export async function getTags() {
  const response = await http.get<Tag[]>('/tags');
  return response.data;
}

export async function createTag(payload: TagPayload) {
  const response = await http.post<Tag>('/tags', payload);
  return response.data;
}

export async function updateTag(id: string, payload: TagPayload) {
  const response = await http.put<Tag>(`/tags/${id}`, payload);
  return response.data;
}

export async function deleteTag(id: string) {
  await http.delete(`/tags/${id}`);
}
