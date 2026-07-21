import { useConfirmStore, type ConfirmOptions } from '@/stores/confirm';

interface DeleteConfirmationOptions extends Omit<ConfirmOptions, 'confirmText' | 'destructive' | 'verification'> {
  expectedText: string;
  instruction?: string;
}

/** 组件内发起确认弹窗的 hook，返回 Promise<boolean>。 */
export function useConfirm() {
  const confirm = useConfirmStore((state) => state.confirm);

  const confirmDeletion = ({ expectedText, instruction, ...options }: DeleteConfirmationOptions) =>
    confirm({
      ...options,
      confirmText: '确认删除',
      destructive: true,
      verification: {
        expectedText,
        instruction
      }
    });

  return { confirm, confirmDeletion };
}
