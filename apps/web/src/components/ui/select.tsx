import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SelectValue = string | number;

export interface SelectOption<T extends SelectValue> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface SelectProps<T extends SelectValue> {
  value: T;
  options: readonly SelectOption<T>[];
  onValueChange: (value: T) => void;
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  side?: 'bottom' | 'top';
}

export function Select<T extends SelectValue>({
  value,
  options,
  onValueChange,
  ariaLabel,
  className,
  disabled = false,
  side = 'bottom'
}: SelectProps<T>) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  const findEnabledIndex = (startIndex: number, direction: 1 | -1) => {
    if (options.length === 0) {
      return -1;
    }

    for (let step = 0; step < options.length; step += 1) {
      const index = (startIndex + direction * step + options.length) % options.length;
      if (!options[index]?.disabled) {
        return index;
      }
    }

    return -1;
  };

  const openMenu = (direction: 1 | -1 = 1) => {
    const fallbackIndex = direction === 1 ? 0 : options.length - 1;
    const nextIndex = selectedIndex >= 0 && !options[selectedIndex]?.disabled
      ? selectedIndex
      : findEnabledIndex(fallbackIndex, direction);
    setActiveIndex(nextIndex);
    setOpen(true);
  };

  const closeMenu = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  };

  const moveActiveOption = (direction: 1 | -1) => {
    const startIndex = activeIndex >= 0 ? activeIndex + direction : direction === 1 ? 0 : options.length - 1;
    setActiveIndex(findEnabledIndex(startIndex, direction));
  };

  const selectOption = (option: SelectOption<T>) => {
    if (option.disabled) {
      return;
    }

    onValueChange(option.value);
    closeMenu(true);
  };

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenu(event.key === 'ArrowDown' ? 1 : -1);
    }
  };

  const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveActiveOption(event.key === 'ArrowDown' ? 1 : -1);
      return;
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const direction = event.key === 'Home' ? 1 : -1;
      setActiveIndex(findEnabledIndex(direction === 1 ? 0 : options.length - 1, direction));
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      closeMenu(true);
    }
  };

  useEffect(() => {
    if (!open || activeIndex < 0) {
      return;
    }

    optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn('relative inline-block', className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-white px-3 text-left text-sm font-semibold text-slate-700 shadow-sm transition-colors',
          'hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-primary/40 bg-accent/40 ring-2 ring-primary/10'
        )}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="min-w-0 flex-1 truncate">{selectedOption?.label ?? '请选择'}</span>
        <ChevronDown className={cn('h-4 w-4 flex-none text-slate-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            'absolute left-0 z-50 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-[0_12px_28px_rgba(15,23,42,0.14)]',
            side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          )}
        >
          {options.map((option, index) => {
            const selected = option.value === value;

            return (
              <button
                key={`${typeof option.value}:${String(option.value)}`}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={option.disabled}
                className={cn(
                  'flex min-h-9 w-full items-center justify-between gap-3 rounded px-2.5 py-2 text-left text-sm text-slate-700 outline-none transition-colors',
                  'hover:bg-accent hover:text-primary focus-visible:bg-accent focus-visible:text-primary',
                  'disabled:pointer-events-none disabled:opacity-40',
                  selected && 'bg-accent font-semibold text-primary'
                )}
                onClick={() => selectOption(option)}
                onKeyDown={handleOptionKeyDown}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <Check className={cn('h-4 w-4 flex-none', selected ? 'opacity-100' : 'opacity-0')} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
