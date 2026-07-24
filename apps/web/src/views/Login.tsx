import { useState, type FormEvent } from 'react';
import { isAxiosError } from 'axios';
import { KeyRound, LogIn, ShieldCheck } from 'lucide-react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth';

function resolveReturnTarget(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/prompts';
  }
  return value;
}

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const status = useAuthStore((state) => state.status);
  const login = useAuthStore((state) => state.login);
  const returnTo = resolveReturnTarget(searchParams.get('returnTo'));
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (status === 'loading') {
    return <div className="loading-panel">正在确认登录状态...</div>;
  }

  if (status === 'admin') {
    return <Navigate to={returnTo} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login({ username: username.trim(), password });
      navigate(returnTo, { replace: true });
    } catch (requestError) {
      setError(
        isAxiosError(requestError)
          ? requestError.response?.data?.message || '登录失败，请稍后重试'
          : requestError instanceof Error
            ? requestError.message
            : '登录失败，请稍后重试'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto grid min-h-[calc(100vh-128px)] max-w-md place-items-center">
      <div className="w-full rounded-xl border bg-white p-7 shadow-xl shadow-slate-950/5">
        <div className="mb-6 grid justify-items-center gap-3 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-black text-slate-900">管理员登录</h1>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">
              访客可以继续浏览内容，数据管理操作仅向 Admin 开放。
            </p>
          </div>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">用户名</span>
            <Input
              value={username}
              autoComplete="username"
              maxLength={80}
              disabled={submitting}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-bold text-slate-700">密码</span>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={password}
                type="password"
                autoComplete="current-password"
                maxLength={128}
                className="pl-9"
                disabled={submitting}
                autoFocus
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </label>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700" role="alert">
              {error}
            </div>
          ) : null}

          <Button type="submit" size="lg" disabled={submitting || !username.trim() || !password}>
            <LogIn className="h-4 w-4" />
            {submitting ? '正在登录...' : '登录'}
          </Button>
        </form>
      </div>
    </section>
  );
}
