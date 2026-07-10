import { useToastStore } from '@/stores/toast';

/** 组件内触发 Toast 的 hook。 */
export function useToast() {
  const toast = useToastStore((state) => state.toast);
  const dismiss = useToastStore((state) => state.dismiss);
  return { toast, dismiss };
}
