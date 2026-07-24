import axios from 'axios';
import { pushToast } from '@/stores/toast';

let authFailureHandler: (() => void) | undefined;

export function registerAuthFailureHandler(handler: () => void) {
  authFailureHandler = handler;
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  withCredentials: true
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.skipAuthReset) {
      authFailureHandler?.();
    }
    const message = error.response?.data?.message || error.message || '请求失败';
    if (!error.config?.skipGlobalErrorToast) {
      pushToast({ title: '请求失败', description: message, variant: 'destructive' });
    }
    return Promise.reject(error);
  }
);
