import { http } from './request';
import type { ContentTransferFile } from '@/types/content-transfer';
import type { Solution, SolutionPayload } from '@/types/domain';

export interface SolutionQuery {
  search?: string;
  category?: string;
}

export async function getSolutions(query: SolutionQuery = {}) {
  const response = await http.get<Solution[]>('/solutions', { params: query });
  return response.data;
}

export async function getSolution(id: string) {
  const response = await http.get<Solution>(`/solutions/${id}`);
  return response.data;
}

export async function exportSolution(id: string) {
  const response = await http.get<ContentTransferFile>(`/solutions/${id}/export`);
  return response.data;
}

export async function importSolution(payload: ContentTransferFile) {
  const response = await http.post<Solution>('/solutions/import', payload);
  return response.data;
}

export async function createSolution(payload: SolutionPayload) {
  const response = await http.post<Solution>('/solutions', payload);
  return response.data;
}

export async function updateSolution(id: string, payload: SolutionPayload) {
  const response = await http.put<Solution>(`/solutions/${id}`, payload);
  return response.data;
}

export async function deleteSolution(id: string) {
  await http.delete(`/solutions/${id}`);
}
