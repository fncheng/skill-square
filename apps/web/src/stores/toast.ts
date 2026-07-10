import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'destructive';

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  toast: (input: ToastInput) => void;
  dismiss: (id: number) => void;
}

let toastId = 0;

/**
 * 全局 Toast 状态。使用 zustand 而非 React Context，
 * 以便在 axios 拦截器等 React 组件之外的场景中直接触发提示。
 */
export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  toast: (input) => {
    const id = ++toastId;
    set((state) => ({
      toasts: [
        ...state.toasts,
        {
          id,
          title: input.title,
          description: input.description,
          variant: input.variant ?? 'default'
        }
      ]
    }));
    window.setTimeout(() => get().dismiss(id), 3200);
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) }))
}));

/** 在 React 组件之外触发 Toast 的命令式入口。 */
export function pushToast(input: ToastInput) {
  useToastStore.getState().toast(input);
}
