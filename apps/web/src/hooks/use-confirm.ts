import { useConfirmStore } from '@/stores/confirm';

/** 组件内发起确认弹窗的 hook，返回 Promise<boolean>。 */
export function useConfirm() {
  const confirm = useConfirmStore((state) => state.confirm);
  return { confirm };
}
