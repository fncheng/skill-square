import axios from 'axios';
import { useToast } from '@/composables/use-toast';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || '请求失败';
    const { toast } = useToast();
    toast({ title: '请求失败', description: message, variant: 'destructive' });
    return Promise.reject(error);
  }
);
