import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

const resources = [
  { path: '/favorites', label: '全部' },
  { path: '/favorites/prompts', label: 'Prompt' },
  { path: '/favorites/solutions', label: '解决方案' },
  { path: '/favorites/notes', label: '学习笔记' },
  { path: '/favorites/miscellanies', label: '杂谈' },
  { path: '/favorites/model-responses', label: '模型回答', adminOnly: true }
];

/** 收藏视图复用各资源列表，并保留模型回答的管理员访问边界。 */
export function FavoriteTabs() {
  const { pathname } = useLocation();
  const isAdmin = useAuthStore((state) => state.status === 'admin');

  return (
    <nav aria-label="收藏资源类型" className="mb-5 flex flex-wrap gap-2">
      {resources.filter((resource) => !resource.adminOnly || isAdmin).map((resource) => (
        <Link key={resource.path} className={`category-chip${pathname === resource.path ? ' active' : ''}`}
          aria-current={pathname === resource.path ? 'page' : undefined} to={resource.path}>
          {resource.label}
        </Link>
      ))}
    </nav>
  );
}
