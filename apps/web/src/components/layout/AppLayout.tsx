import { type ComponentType } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  Boxes,
  CircleUserRound,
  Folder,
  House,
  Lightbulb,
  type LucideProps,
  Search,
  Star,
  Tags
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

type IconComponent = ComponentType<LucideProps>;

interface PrimaryNavItem {
  key: 'prompts' | 'favorites' | 'solutions';
  label: string;
  to: string;
  icon: IconComponent;
}

interface ManageNavItem {
  label: string;
  path: string;
  icon: IconComponent;
}

const primaryNav: PrimaryNavItem[] = [
  { key: 'prompts', label: 'Prompt 列表', to: '/prompts', icon: House },
  { key: 'favorites', label: '我的收藏', to: '/prompts?favorite=true', icon: Star },
  { key: 'solutions', label: '解决方案', to: '/solutions', icon: Lightbulb }
];

const manageNav: ManageNavItem[] = [
  { label: '分类管理', path: '/categories', icon: Folder },
  { label: '标签管理', path: '/tags', icon: Tags }
];

/**
 * 根据当前路径计算左上角返回按钮的目标地址。
 * 编辑页返回对应详情页，新建页与详情页返回对应列表页；列表与管理页无返回。
 */
function resolveBackTarget(pathname: string): string {
  const editMatch = pathname.match(/^\/(prompts|solutions)\/(?!new$)([^/]+)\/edit$/);
  if (editMatch) {
    return `/${editMatch[1]}/${editMatch[2]}`;
  }

  const newMatch = pathname.match(/^\/(prompts|solutions)\/new$/);
  if (newMatch) {
    return `/${newMatch[1]}`;
  }

  const detailMatch = pathname.match(/^\/(prompts|solutions)\/(?!new$)[^/]+$/);
  if (detailMatch) {
    return `/${detailMatch[1]}`;
  }

  return '';
}

export function AppLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const favorite = new URLSearchParams(location.search).get('favorite');

  const isPrimaryActive = (item: PrimaryNavItem) => {
    if (item.key === 'favorites') {
      return pathname === '/prompts' && favorite === 'true';
    }
    if (item.key === 'prompts') {
      return pathname.startsWith('/prompts') && favorite !== 'true';
    }
    if (item.key === 'solutions') {
      return pathname.startsWith('/solutions');
    }
    return false;
  };

  const backTarget = resolveBackTarget(pathname);

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link className="brand" to="/prompts">
          <span className="brand-mark">
            <Boxes className="h-4 w-4" />
          </span>
          <span>Prompt Skill Manager</span>
        </Link>

        <div className="topbar-actions">
          <Button variant="ghost" size="icon">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          <span className="admin-badge">
            <CircleUserRound className="h-4 w-4" />
            Admin
          </span>
        </div>
      </header>

      <aside className="app-sidebar">
        <nav className="nav-section">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                className={cn('nav-link', isPrimaryActive(item) && 'active')}
                to={item.to}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="nav-title">管理</div>
        <nav className="nav-section">
          {manageNav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                className={cn('nav-link', pathname === item.path && 'active')}
                to={item.path}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="app-main">
        {backTarget ? (
          <Link className="app-main-back" to={backTarget} title="返回上级" aria-label="返回上级">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        ) : null}
        <Outlet />
      </main>

      <Toaster />
      <ConfirmDialog />
    </div>
  );
}
