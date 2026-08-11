import { http } from './request';
import type {
  ContentTagCloudResponse,
  ContentTagItemsResponse,
  ContentTagScope
} from '@/types/domain';

export interface ContentTagItemsQuery {
  tag: string;
  resourceType?: ContentTagScope;
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function getContentTagCloud() {
  const response = await http.get<ContentTagCloudResponse>('/content-tags');
  return response.data;
}

export async function getContentTagItems(query: ContentTagItemsQuery) {
  const response = await http.get<ContentTagItemsResponse>('/content-tags/items', { params: query });
  return response.data;
}
