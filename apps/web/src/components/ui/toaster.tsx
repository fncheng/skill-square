import { X } from 'lucide-react';
import { useToastStore } from '@/stores/toast';
import { cn } from '@/lib/utils';

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div className="fixed right-5 top-5 z-[100] grid w-[360px] max-w-[calc(100vw-40px)] gap-3">
      {toasts.map((item) => (
        <div
          key={item.id}
          className={cn(
            'rounded-md border bg-background p-4 text-sm shadow-lg',
            item.variant === 'success' && 'border-emerald-200 bg-emerald-50 text-emerald-950',
            item.variant === 'destructive' && 'border-red-200 bg-red-50 text-red-950'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <p className="font-semibold">{item.title}</p>
              {item.description ? <p className="text-muted-foreground">{item.description}</p> : null}
            </div>
            <button
              className="rounded-sm p-1 text-muted-foreground hover:bg-black/5"
              type="button"
              onClick={() => dismiss(item.id)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
