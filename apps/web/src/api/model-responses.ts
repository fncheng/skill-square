import { http } from './request';
import type { ContentTransferFile } from '@/types/content-transfer';
import type { ModelResponse, ModelResponsePayload } from '@/types/domain';

export interface ModelResponseQuery {
  search?: string;
  category?: string;
}

export async function getModelResponses(query: ModelResponseQuery = {}) {
  const response = await http.get<ModelResponse[]>('/model-responses', { params: query });
  return response.data;
}
export async function getModelResponse(id: string) {
  return (await http.get<ModelResponse>(`/model-responses/${id}`)).data;
}

export async function exportModelResponse(id: string) {
  return (await http.get<ContentTransferFile>(`/model-responses/${id}/export`)).data;
}

export async function importModelResponse(payload: ContentTransferFile) {
  return (await http.post<ModelResponse>('/model-responses/import', payload)).data;
}

export async function createModelResponse(payload: ModelResponsePayload) {
  return (await http.post<ModelResponse>('/model-responses', payload)).data;
}

export async function updateModelResponse(id: string, payload: ModelResponsePayload) {
  return (await http.put<ModelResponse>(`/model-responses/${id}`, payload)).data;
}

export async function deleteModelResponse(id: string) {
  await http.delete(`/model-responses/${id}`);
}
