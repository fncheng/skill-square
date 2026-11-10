import { Outlet } from 'react-router-dom';
import { FavoriteTabs } from '@/components/favorites/FavoriteTabs';

/** 收藏功能独立承载资源切换，各资源列表负责展示和操作收藏内容。 */
export function Favorites() {
  return (
    <section>
      <FavoriteTabs />
      <Outlet />
    </section>
  );
}
