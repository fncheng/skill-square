import { http } from './request';
import type { AuthSession, LoginPayload } from '@/types/auth';

export async function getAuthSession() {
  const { data } = await http.get<AuthSession>('/auth/session', {
    skipGlobalErrorToast: true,
    skipAuthReset: true
  });
  return data;
}

export async function loginAdmin(payload: LoginPayload) {
  const { data } = await http.post<AuthSession>('/auth/login', payload, {
    skipGlobalErrorToast: true,
    skipAuthReset: true
  });
  return data;
}

export async function logoutAdmin() {
  await http.post(
    '/auth/logout',
    {},
    {
      skipGlobalErrorToast: true,
      skipAuthReset: true
    }
  );
}
