import { http } from './request';

export type FavoriteResource = 'solutions' | 'notes' | 'miscellanies' | 'model-responses';

/** 收藏接口返回服务端确认后的状态。 */
export async function setFavorite(resource: FavoriteResource, id: string, isFavorite: boolean) {
  const url = `/${resource}/${id}/favorite`;
  const response = isFavorite
    ? await http.post<{ isFavorite: boolean }>(url)
    : await http.delete<{ isFavorite: boolean }>(url);
  return response.data.isFavorite;
}
