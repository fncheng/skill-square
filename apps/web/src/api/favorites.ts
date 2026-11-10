import { http } from './request';
import { getPrompts } from './prompts';
import { getSolutions } from './solutions';
import { getNotes } from './notes';
import { getMiscellanies } from './miscellanies';
import { getModelResponses } from './model-responses';
import type { FavoriteItem } from '@/types/domain';

export type FavoriteResource = FavoriteItem['resource'];

/** Prompt 接口分页，逐页读取才能完整展示已收藏的 Prompt。 */
async function getFavoritePrompts(): Promise<FavoriteItem[]> {
  const items: FavoriteItem[] = [];
  let page = 1;
  let total = 0;
  do {
    const result = await getPrompts({ page, pageSize: 100, favorite: true });
    items.push(...result.items.map((item) => ({
      id: item.id, resource: 'prompts' as const, title: item.name,
      summary: item.description, updatedAt: item.updatedAt
    })));
    total = result.total;
    if (result.items.length === 0) break;
    page += 1;
  } while (items.length < total);
  return items;
}

/** 独立请求各资源，部分资源失败时保留其余可用结果。 */
export async function getAllFavorites(isAdmin: boolean) {
  const requests: Promise<FavoriteItem[]>[] = [
    getFavoritePrompts(),
    getSolutions().then((items) => items.filter((item) => item.isFavorite).map((item) => ({ ...item, resource: 'solutions' as const }))),
    getNotes().then((items) => items.filter((item) => item.isFavorite).map((item) => ({ ...item, resource: 'notes' as const }))),
    getMiscellanies().then((items) => items.filter((item) => item.isFavorite).map((item) => ({ ...item, resource: 'miscellanies' as const })))
  ];
  if (isAdmin) {
    requests.push(getModelResponses().then((items) => items.filter((item) => item.isFavorite).map((item) => ({ ...item, resource: 'model-responses' as const }))));
  }
  const results = await Promise.allSettled(requests);
  return {
    items: results.flatMap((result) => result.status === 'fulfilled' ? result.value : [])
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    hasErrors: results.some((result) => result.status === 'rejected')
  };
}

/** 收藏接口返回服务端确认后的状态。 */
export async function setFavorite(resource: FavoriteResource, id: string, isFavorite: boolean) {
  const url = `/${resource}/${id}/favorite`;
  const response = isFavorite
    ? await http.post<{ isFavorite: boolean }>(url)
    : await http.delete<{ isFavorite: boolean }>(url);
  return response.data.isFavorite;
}
