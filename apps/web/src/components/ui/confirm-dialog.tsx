import { useEffect, useId, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useConfirmStore } from '@/stores/confirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function normalizeConfirmationText(value: string) {
  return value.normalize('NFC').trim();
}

export function ConfirmDialog() {
  const { open, title, description, confirmText, cancelText, destructive, verification, close } = useConfirmStore();
  const [verificationInput, setVerificationInput] = useState('');
  const titleId = useId();
  const descriptionId = useId();
  const verificationLabelId = useId();
  const expectedText = verification ? normalizeConfirmationText(verification.expectedText) : '';
  const verificationMatches = verification
    ? Boolean(expectedText) && normalizeConfirmationText(verificationInput) === expectedText
    : true;

  useEffect(() => {
    setVerificationInput('');
  }, [open, expectedText]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [close, open]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!verificationMatches) {
      return;
    }
    close(true);
  };

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/35 px-4">
      <form
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-lg border bg-background p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onSubmit={handleSubmit}
      >
        <div className="grid gap-2">
          <h2 id={titleId} className="text-lg font-semibold">{title}</h2>
          {description ? (
            <p id={descriptionId} className="text-sm leading-6 text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {verification ? (
          <div className="mt-5 grid gap-3">
            <p id={verificationLabelId} className="text-sm font-medium">
              {verification.instruction ?? '请输入以下文本以确认删除：'}
            </p>
            <code className="whitespace-pre-wrap break-words rounded-md border bg-muted px-3 py-2 text-sm font-semibold text-foreground">
              {expectedText}
            </code>
            <Input
              autoFocus
              aria-labelledby={verificationLabelId}
              aria-invalid={Boolean(verificationInput) && !verificationMatches}
              autoComplete="off"
              value={verificationInput}
              placeholder="输入上方文本"
              onChange={(event) => setVerificationInput(event.target.value)}
            />
            {verificationInput && !verificationMatches ? (
              <p className="text-sm text-destructive">输入内容与确认文本不一致。</p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => close(false)}>
            {cancelText}
          </Button>
          <Button type="submit" variant={destructive ? 'destructive' : 'default'} disabled={!verificationMatches}>
            {confirmText}
          </Button>
        </div>
      </form>
    </div>,
    document.body
  );
}
