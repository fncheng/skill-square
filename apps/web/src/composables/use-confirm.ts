import { reactive } from 'vue';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

const state = reactive<ConfirmState>({
  open: false,
  title: '',
  description: '',
  confirmText: '确认',
  cancelText: '取消',
  destructive: false
});

export function useConfirm() {
  function confirm(options: ConfirmOptions) {
    Object.assign(state, {
      open: true,
      title: options.title,
      description: options.description,
      confirmText: options.confirmText ?? '确认',
      cancelText: options.cancelText ?? '取消',
      destructive: options.destructive ?? false
    });

    return new Promise<boolean>((resolve) => {
      state.resolve = resolve;
    });
  }

  function close(result: boolean) {
    state.open = false;
    state.resolve?.(result);
    state.resolve = undefined;
  }

  return {
    confirm,
    confirmState: state,
    closeConfirm: close
  };
}
