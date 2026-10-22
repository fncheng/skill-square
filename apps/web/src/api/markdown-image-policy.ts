import { http } from './request';
import type { MarkdownImagePolicy, UpdateMarkdownImagePolicyPayload } from '@/types/domain';

/** 公开读取策略时静默失败，由渲染层按 fail closed 处理。 */
export async function getMarkdownImagePolicy(): Promise<MarkdownImagePolicy> {
  const response = await http.get<MarkdownImagePolicy>('/markdown-image-policy', {
    skipGlobalErrorToast: true
  });
  return response.data;
}

export async function updateMarkdownImagePolicy(
  payload: UpdateMarkdownImagePolicyPayload
): Promise<MarkdownImagePolicy> {
  const response = await http.put<MarkdownImagePolicy>('/markdown-image-policy', payload, {
    skipGlobalErrorToast: true
  });
  return response.data;
}
