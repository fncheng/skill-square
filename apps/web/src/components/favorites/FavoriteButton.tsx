import { useState } from 'react';
import { Star } from 'lucide-react';
import { setFavorite, type FavoriteResource } from '@/api/favorites';

interface FavoriteButtonProps {
  resource: FavoriteResource;
  id: string;
  isFavorite: boolean;
  onChange: (isFavorite: boolean) => void;
}

/** 等待服务端确认后再更新列表，避免快速重复提交造成状态错乱。 */
export function FavoriteButton({ resource, id, isFavorite, onChange }: FavoriteButtonProps) {
  const [pending, setPending] = useState(false);
  const label = isFavorite ? '取消收藏' : '收藏';

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    try {
      onChange(await setFavorite(resource, id, !isFavorite));
    } catch {
      // 请求拦截器统一展示错误，保留当前收藏状态。
    } finally {
      setPending(false);
    }
  };

  return (
    <button type="button" className={`card-star-button${isFavorite ? ' active' : ''}`}
      title={label} aria-label={label} aria-pressed={isFavorite} disabled={pending}
      onKeyDown={(event) => event.stopPropagation()}
      onClick={(event) => { event.stopPropagation(); void toggle(); }}>
      <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  );
}
