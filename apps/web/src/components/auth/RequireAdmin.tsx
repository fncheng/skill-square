import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';

export function RequireAdmin() {
  const location = useLocation();
  const status = useAuthStore((state) => state.status);

  if (status === 'loading') {
    return <div className="loading-panel">正在确认管理员身份...</div>;
  }

  if (status !== 'admin') {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return <Outlet />;
}
