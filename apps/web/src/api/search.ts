import { http } from './request';
import type { GlobalSearchResponse } from '@/types/domain';

export async function globalSearch(query: string, limit = 12) {
  const response = await http.get<GlobalSearchResponse>('/search', {
    params: { query, limit }
  });
  return response.data;
}
