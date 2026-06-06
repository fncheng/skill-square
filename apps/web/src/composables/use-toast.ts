import { readonly, ref } from 'vue';

export type ToastVariant = 'default' | 'success' | 'destructive';

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

const toasts = ref<ToastItem[]>([]);
let toastId = 0;

export function useToast() {
  function toast(input: { title: string; description?: string; variant?: ToastVariant }) {
    const id = ++toastId;
    toasts.value = [
      ...toasts.value,
      {
        id,
        title: input.title,
        description: input.description,
        variant: input.variant ?? 'default'
      }
    ];

    window.setTimeout(() => dismiss(id), 3200);
  }

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((item) => item.id !== id);
  }

  return {
    toasts: readonly(toasts),
    toast,
    dismiss
  };
}
