import { type ComponentType } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
  BotMessageSquare,
  Boxes,
  CircleUserRound,
  Folder,
  House,
  Lightbulb,
  LogIn,
  LogOut,
  type LucideProps,
  NotebookPen,
  PanelsTopLeft,
  Star,
  Tags
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { GlobalSearch } from './GlobalSearch';

type IconComponent = ComponentType<LucideProps>;

interface PrimaryNavItem {
  key: 'prompts' | 'favorites' | 'solutions' | 'notes' | 'tagCloud' | 'uiPrototypes' | 'modelResponses';
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
  { key: 'notes', label: '学习笔记', to: '/notes', icon: NotebookPen },
  { key: 'modelResponses', label: '模型回答', to: '/model-responses', icon: BotMessageSquare },
  { key: 'tagCloud', label: '标签词云', to: '/tag-cloud', icon: Tags },
  { key: 'uiPrototypes', label: 'UI 原型', to: '/ui-prototypes', icon: PanelsTopLeft }
];

const manageNav: ManageNavItem[] = [
  { label: '分类管理', path: '/categories', icon: Folder },
  { label: '标签管理', path: '/tags', icon: Tags }
];

export function AppLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const favorite = new URLSearchParams(location.search).get('favorite');
  const authStatus = useAuthStore((state) => state.status);
  const logout = useAuthStore((state) => state.logout);
  const isAdmin = authStatus === 'admin';

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
    if (item.key === 'tagCloud') {
      return pathname === '/tag-cloud' || pathname === '/tag-articles';
    }
    if (item.key === 'uiPrototypes') {
      return pathname.startsWith('/ui-prototypes');
    }
    if (item.key === 'modelResponses') return pathname.startsWith('/model-responses');
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

        <GlobalSearch />

        <div className="topbar-actions">
          <Button variant="ghost" size="icon">
            <Bell className="h-4 w-4" />
          </Button>
          {authStatus === 'loading' ? (
            <span className="admin-badge is-loading">
              <CircleUserRound className="h-4 w-4" />
              身份确认中
            </span>
          ) : isAdmin ? (
            <div className="admin-session">
              <span className="admin-badge">
                <CircleUserRound className="h-4 w-4" />
                Admin
              </span>
              <Button variant="ghost" size="icon" title="退出登录" aria-label="退出登录" onClick={() => void logout()}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link className="admin-badge" to="/login">
              <LogIn className="h-4 w-4" />
              登录
            </Link>
          )}
        </div>
      </header>

      <aside className="app-sidebar">
        <nav className="nav-section">
          {primaryNav.filter((item) => item.key !== 'modelResponses' || isAdmin).map((item) => {
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

        {isAdmin ? (
          <>
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
          </>
        ) : null}
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      <Toaster />
      <ConfirmDialog />
    </div>
  );
}
