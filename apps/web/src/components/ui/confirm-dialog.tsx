import { createPortal } from 'react-dom';
import { useConfirmStore } from '@/stores/confirm';
import { Button } from '@/components/ui/button';

export function ConfirmDialog() {
  const { open, title, description, confirmText, cancelText, destructive, close } = useConfirmStore();

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/35 px-4">
      <section className="w-full max-w-md rounded-lg border bg-background p-5 shadow-xl">
        <div className="grid gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => close(false)}>
            {cancelText}
          </Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={() => close(true)}>
            {confirmText}
          </Button>
        </div>
      </section>
    </div>,
    document.body
  );
}
