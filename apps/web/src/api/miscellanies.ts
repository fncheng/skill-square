import { http } from './request';
import type { ContentTransferFile } from '@/types/content-transfer';
import type { Miscellany, MiscellanyPayload } from '@/types/domain';

export interface MiscellanyQuery {
  search?: string;
  category?: string;
}

export async function getMiscellanies(query: MiscellanyQuery = {}) {
  const response = await http.get<Miscellany[]>('/miscellanies', { params: query });
  return response.data;
}

export async function getMiscellany(id: string) {
  const response = await http.get<Miscellany>(`/miscellanies/${id}`);
  return response.data;
}

export async function exportMiscellany(id: string) {
  const response = await http.get<ContentTransferFile>(`/miscellanies/${id}/export`);
  return response.data;
}

export async function importMiscellany(payload: ContentTransferFile) {
  const response = await http.post<Miscellany>('/miscellanies/import', payload);
  return response.data;
}

export async function createMiscellany(payload: MiscellanyPayload) {
  const response = await http.post<Miscellany>('/miscellanies', payload);
  return response.data;
}

export async function updateMiscellany(id: string, payload: MiscellanyPayload) {
  const response = await http.put<Miscellany>(`/miscellanies/${id}`, payload);
  return response.data;
}

export async function deleteMiscellany(id: string) {
  await http.delete(`/miscellanies/${id}`);
}
