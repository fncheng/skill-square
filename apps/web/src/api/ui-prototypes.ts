import { http } from './request';
import type { UiPrototype, UiPrototypePayload } from '@/types/domain';

export interface UiPrototypeQuery {
  search?: string;
  category?: string;
}

export async function getUiPrototypes(query: UiPrototypeQuery = {}) {
  const response = await http.get<UiPrototype[]>('/ui-prototypes', { params: query });
  return response.data;
}

export async function getUiPrototype(id: string) {
  const response = await http.get<UiPrototype>(`/ui-prototypes/${id}`);
  return response.data;
}

export async function createUiPrototype(payload: UiPrototypePayload) {
  const response = await http.post<UiPrototype>('/ui-prototypes', payload);
  return response.data;
}

export async function updateUiPrototype(id: string, payload: UiPrototypePayload) {
  const response = await http.put<UiPrototype>(`/ui-prototypes/${id}`, payload);
  return response.data;
}

export async function deleteUiPrototype(id: string) {
  await http.delete(`/ui-prototypes/${id}`);
}
