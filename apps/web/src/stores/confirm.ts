import { create } from 'zustand';

export interface ConfirmVerification {
  expectedText: string;
  instruction?: string;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  verification?: ConfirmVerification;
}

interface ConfirmState {
  open: boolean;
  title: string;
  description?: string;
  confirmText: string;
  cancelText: string;
  destructive: boolean;
  verification?: ConfirmVerification;
  resolver: ((value: boolean) => void) | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  close: (result: boolean) => void;
}

/**
 * 全局确认弹窗状态。confirm() 返回 Promise，
 * 由 ConfirmDialog 组件的按钮点击来 resolve。
 */
export const useConfirmStore = create<ConfirmState>((set, get) => ({
  open: false,
  title: '',
  description: '',
  confirmText: '确认',
  cancelText: '取消',
  destructive: false,
  verification: undefined,
  resolver: null,
  confirm: (options) => {
    set({
      open: true,
      title: options.title,
      description: options.description,
      confirmText: options.confirmText ?? '确认',
      cancelText: options.cancelText ?? '取消',
      destructive: options.destructive ?? false,
      verification: options.verification
    });
    return new Promise<boolean>((resolve) => set({ resolver: resolve }));
  },
  close: (result) => {
    get().resolver?.(result);
    set({ open: false, verification: undefined, resolver: null });
  }
}));
