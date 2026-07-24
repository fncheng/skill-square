import { create } from 'zustand';
import { getAuthSession, loginAdmin, logoutAdmin } from '@/api/auth';
import { registerAuthFailureHandler } from '@/api/request';
import type { AdminIdentity, LoginPayload } from '@/types/auth';

export type AuthStatus = 'loading' | 'guest' | 'admin';

interface AuthState {
  status: AuthStatus;
  user: AdminIdentity | null;
  hydrate: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  markGuest: () => void;
}

const guestState = { status: 'guest' as const, user: null };

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,

  async hydrate() {
    try {
      const session = await getAuthSession();
      set(
        session.authenticated && session.user
          ? { status: 'admin', user: session.user }
          : guestState
      );
    } catch {
      set(guestState);
    }
  },

  async login(payload) {
    const session = await loginAdmin(payload);
    if (!session.authenticated || !session.user) {
      throw new Error('登录响应中缺少管理员会话');
    }
    set({ status: 'admin', user: session.user });
  },

  async logout() {
    try {
      await logoutAdmin();
    } finally {
      set(guestState);
    }
  },

  markGuest() {
    set(guestState);
  }
}));

registerAuthFailureHandler(() => useAuthStore.getState().markGuest());
