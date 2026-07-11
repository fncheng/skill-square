import { type ComponentType } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
  Boxes,
  CircleUserRound,
  Folder,
  House,
  Lightbulb,
  type LucideProps,
  NotebookPen,
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
  key: 'prompts' | 'favorites' | 'solutions' | 'notes';
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
  { key: 'solutions', label: '解决方案', to: '/solutions', icon: Lightbulb },
  { key: 'notes', label: '学习笔记', to: '/notes', icon: NotebookPen }
];

const manageNav: ManageNavItem[] = [
  { label: '分类管理', path: '/categories', icon: Folder },
  { label: '标签管理', path: '/tags', icon: Tags }
];

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
    if (item.key === 'notes') {
      return pathname.startsWith('/notes');
    }
    return false;
  };

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
        <Outlet />
      </main>

      <Toaster />
      <ConfirmDialog />
    </div>
  );
}
