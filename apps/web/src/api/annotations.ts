import { http } from './request';
import type {
  Annotation,
  AnnotationResourceType,
  CreateAnnotationPayload,
  UpdateAnnotationPayload
} from '@/types/domain';

export async function getAnnotations(resourceType: AnnotationResourceType, resourceId: string) {
  const response = await http.get<Annotation[]>('/annotations', {
    params: { resourceType, resourceId }
  });
  return response.data;
}

export async function createAnnotation(payload: CreateAnnotationPayload) {
  const response = await http.post<Annotation>('/annotations', payload);
  return response.data;
}

export async function updateAnnotation(id: string, payload: UpdateAnnotationPayload) {
  const response = await http.put<Annotation>(`/annotations/${id}`, payload);
  return response.data;
}

export async function deleteAnnotation(id: string) {
  await http.delete(`/annotations/${id}`);
}
