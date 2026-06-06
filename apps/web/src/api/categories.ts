import { http } from './request';
import type { Category } from '@/types/domain';

export interface CategoryPayload {
  name: string;
  description: string;
}

export async function getCategories() {
  const response = await http.get<Category[]>('/categories');
  return response.data;
}

export async function createCategory(payload: CategoryPayload) {
  const response = await http.post<Category>('/categories', payload);
  return response.data;
}

export async function updateCategory(id: string, payload: CategoryPayload) {
  const response = await http.put<Category>(`/categories/${id}`, payload);
  return response.data;
}

export async function deleteCategory(id: string) {
  await http.delete(`/categories/${id}`);
}
